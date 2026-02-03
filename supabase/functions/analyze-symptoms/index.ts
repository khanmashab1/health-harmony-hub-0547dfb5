import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DiseaseEntry {
  title: string;
  symptoms: string;
  recommendation: string;
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per user

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
}

// Parse CSV content into structured data
function parseCSV(csvContent: string): DiseaseEntry[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const results: DiseaseEntry[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim().replace(/^"|"$/g, ''));
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim().replace(/^"|"$/g, ''));
    
    // CSV format: title, symptom_keywords, symptom_keywords (duplicate), recommendation
    if (fields.length >= 3) {
      results.push({
        title: fields[0] || '',
        symptoms: fields[1] || fields[2] || '',
        recommendation: fields[3] || ''
      });
    }
  }
  
  return results;
}

// Search for matching conditions based on symptoms
function searchConditions(
  data: DiseaseEntry[],
  searchTerms: string
): Array<DiseaseEntry & { score: number }> {
  const searchWords = searchTerms.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2);
  
  const scored = data.map(item => {
    let score = 0;
    const itemSymptoms = item.symptoms.toLowerCase();
    const itemTitle = item.title.toLowerCase();
    
    for (const word of searchWords) {
      if (itemSymptoms.includes(word)) {
        score += 2;
      }
      if (itemTitle.includes(word)) {
        score += 3;
      }
    }
    
    return { ...item, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Authentication check - verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    let userId = "anonymous";
    
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } }
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: authError } = await supabaseAuth.auth.getClaims(token);
      
      if (!authError && claims?.claims) {
        userId = claims.claims.sub as string;
        console.log(`Authenticated user: ${userId}`);
      }
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      console.log(`Rate limit exceeded for: ${userId}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { symptoms, age, gender, duration, severity, medicalHistory, selectedTags } = await req.json();

    // Validate input
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Please provide valid symptoms (at least 3 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build search query from symptoms and tags
    const searchTerms = [
      symptoms,
      ...(selectedTags || [])
    ].filter(Boolean).join(' ');

    console.log("Searching disease database for:", searchTerms);

    let diseaseData: DiseaseEntry[] = [];
    
    // First, try to fetch from symptom_knowledge table (admin uploaded data)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: dbData, error } = await supabase
          .from("symptom_knowledge")
          .select("symptom, description, advice")
          .limit(1000);
        
        if (!error && dbData && dbData.length > 0) {
          diseaseData = dbData.map(row => ({
            title: row.symptom,
            symptoms: row.description,
            recommendation: row.advice
          }));
          console.log(`Loaded ${diseaseData.length} conditions from symptom_knowledge table`);
        }
      } catch (dbError) {
        console.log("Could not fetch from symptom_knowledge table:", dbError);
      }
    }

    // If no data from DB, try to fetch from disease_symptoms table
    if (diseaseData.length === 0 && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: dbData, error } = await supabase
          .from("disease_symptoms")
          .select("title, symptom_keywords, recommendation")
          .limit(1000);
        
        if (!error && dbData && dbData.length > 0) {
          diseaseData = dbData.map(row => ({
            title: row.title,
            symptoms: row.symptom_keywords,
            recommendation: row.recommendation || ''
          }));
          console.log(`Loaded ${diseaseData.length} conditions from disease_symptoms table`);
        }
      } catch (dbError) {
        console.log("Could not fetch from disease_symptoms table:", dbError);
      }
    }

    // Fallback: try to fetch from CSV in storage
    if (diseaseData.length === 0) {
      const csvUrl = `${SUPABASE_URL}/storage/v1/object/public/symptom-data/Diseases_Symptoms.csv`;
      try {
        const response = await fetch(csvUrl);
        if (response.ok) {
          const csvContent = await response.text();
          diseaseData = parseCSV(csvContent);
          console.log(`Loaded ${diseaseData.length} conditions from CSV storage`);
        }
      } catch (fetchError) {
        console.log("Could not fetch CSV from storage");
      }
    }

    // Final fallback: use embedded data
    if (diseaseData.length === 0) {
      diseaseData = [
        { title: "Common Cold", symptoms: "cough, sore throat, runny nose, sneezing", recommendation: "rest, fluids, over-the-counter medication" },
        { title: "Anxiety", symptoms: "excessive worrying, restlessness, increased heart rate, panic attacks", recommendation: "Therapy (cognitive-behavioral therapy, psychotherapy), medications (antidepressants, anti-anxiety drugs)" },
        { title: "Gastroesophageal Reflux Disease (GERD)", symptoms: "Heartburn, acid reflux, chest pain", recommendation: "Lifestyle changes, medications (antacids, proton pump inhibitors)" },
        { title: "Migraine", symptoms: "severe headache, nausea, sensitivity to light, visual disturbances", recommendation: "Pain relievers, preventive medications, rest in dark room" },
        { title: "Bronchitis", symptoms: "persistent cough with mucus, chest congestion, fatigue", recommendation: "Rest, fluids, over-the-counter cough suppressants, inhalers" },
        { title: "Allergies", symptoms: "sneezing, itchy eyes, runny nose, skin rash", recommendation: "Antihistamines, avoiding allergens, immunotherapy" },
        { title: "Hypertension", symptoms: "high blood pressure, headache, shortness of breath, chest pain", recommendation: "Lifestyle changes, medications, regular monitoring" },
        { title: "Diabetes", symptoms: "increased thirst, frequent urination, fatigue, blurred vision", recommendation: "Diet management, exercise, medications or insulin" },
        { title: "Insomnia", symptoms: "difficulty falling asleep, waking up frequently, daytime fatigue", recommendation: "Sleep hygiene, cognitive behavioral therapy, medications" },
        { title: "Depression", symptoms: "persistent sadness, loss of interest, fatigue, changes in appetite", recommendation: "Therapy, medications (antidepressants), lifestyle changes" }
      ];
      console.log("Using fallback embedded data");
    }

    // Search for matching conditions
    const matchedConditions = searchConditions(diseaseData, searchTerms);
    console.log(`Found ${matchedConditions.length} matching conditions`);

    // Build RAG context from matched conditions
    let ragContext = "";
    let citations: string[] = [];
    
    if (matchedConditions.length > 0) {
      ragContext = "\n\nRELEVANT CONDITIONS FROM MEDICAL DATABASE:\n" + 
        matchedConditions.map((item, i) => {
          citations.push(`[${i + 1}] ${item.title}`);
          return `
[Entry ${i + 1}] Condition: ${item.title}
- Symptoms: ${item.symptoms}
- Recommendation: ${item.recommendation || 'Consult a healthcare provider'}`;
        }).join('\n');
    }

    const systemPrompt = `You are a medical symptom analyzer AI assistant. You provide helpful health information based on symptoms described by users.

IMPORTANT DISCLAIMERS:
- You are NOT a replacement for professional medical advice
- Always recommend consulting a healthcare provider for proper diagnosis
- Your analysis is for informational purposes only
- In case of emergency symptoms, advise immediate medical attention

${matchedConditions.length > 0 
  ? `CRITICAL: Base your response PRIMARILY on the matched conditions provided below. Reference specific conditions and their recommendations in your response.`
  : `NOTE: No specific conditions were found matching these symptoms. Provide general guidance and strongly recommend consulting a healthcare provider.`
}
${ragContext}

Analyze the provided symptoms and return a JSON response with:
1. possible_conditions: array of up to 3 possible conditions with name, likelihood (high/medium/low), description, and citation (reference number from matched conditions if applicable)
2. recommendations: array of 3-5 actionable recommendations
3. urgency_level: one of "low", "moderate", "high", "emergency"
4. when_to_seek_help: specific signs that warrant immediate medical attention
5. lifestyle_tips: 2-3 general wellness tips related to the symptoms
6. data_sources: array of citation references used (e.g., "[1] Common Cold")

Be thorough but concise. Always err on the side of caution.
${matchedConditions.length === 0 ? '\nSince no specific conditions were matched, clearly state: "I couldn\'t find specific conditions in my dataset matching these exact symptoms. Please consult a healthcare provider for accurate diagnosis."' : ''}`;

    const userMessage = `Please analyze these symptoms:

Symptoms: ${symptoms}
${selectedTags?.length ? `Related symptoms: ${selectedTags.join(', ')}` : ''}
Age: ${age || 'Not provided'}
Gender: ${gender || 'Not provided'}
Duration: ${duration || 'Not specified'}
Severity: ${severity || 'Not specified'}
Medical History: ${medicalHistory || 'None provided'}

Provide your analysis in JSON format. ${matchedConditions.length > 0 ? `Reference the ${matchedConditions.length} matched conditions provided in your response.` : 'Note that no specific conditions were matched for these symptoms.'}`;

    console.log("Calling Lovable AI gateway for symptom analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        if (!analysis.data_sources && citations.length > 0) {
          analysis.data_sources = citations;
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysis = {
        possible_conditions: [
          { name: "Unable to analyze", likelihood: "unknown", description: "Please consult a healthcare provider for proper assessment." }
        ],
        recommendations: ["Consult a healthcare provider for accurate diagnosis"],
        urgency_level: "moderate",
        when_to_seek_help: "If symptoms worsen or persist",
        lifestyle_tips: ["Rest and stay hydrated", "Monitor your symptoms"],
        data_sources: matchedConditions.length > 0 ? citations : ["No matching conditions found"]
      };
    }

    console.log(`Symptom analysis completed successfully. Matched ${matchedConditions.length} conditions from database.`);

    return new Response(JSON.stringify({ 
      analysis,
      rag_info: {
        entries_found: matchedConditions.length,
        citations: citations,
        source: diseaseData.length > 0 ? "database" : "fallback"
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in analyze-symptoms function:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
