import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, age, gender, duration, severity, medicalHistory, selectedTags } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for RAG retrieval
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build search query from symptoms and tags
    const searchTerms = [
      symptoms,
      ...(selectedTags || [])
    ].filter(Boolean).join(' ');

    console.log("Searching symptom knowledge base for:", searchTerms);

    // RAG: Retrieve relevant symptom knowledge from database using full-text search
    const { data: knowledgeData, error: knowledgeError } = await supabase
      .from("symptom_knowledge")
      .select("*")
      .textSearch("symptom", searchTerms.split(' ').join(' | '), { type: 'websearch', config: 'english' })
      .limit(10);

    // If no results from text search, try simple ILIKE search
    let retrievedKnowledge = knowledgeData || [];
    if (retrievedKnowledge.length === 0) {
      console.log("Text search returned no results, trying ILIKE search...");
      const searchWords = searchTerms.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      for (const word of searchWords.slice(0, 5)) {
        const { data: ilikeData } = await supabase
          .from("symptom_knowledge")
          .select("*")
          .or(`symptom.ilike.%${word}%,description.ilike.%${word}%`)
          .limit(5);
        
        if (ilikeData && ilikeData.length > 0) {
          retrievedKnowledge = [...retrievedKnowledge, ...ilikeData];
        }
      }
      
      // Deduplicate
      retrievedKnowledge = retrievedKnowledge.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      ).slice(0, 10);
    }

    console.log(`Retrieved ${retrievedKnowledge.length} relevant entries from knowledge base`);

    // Build RAG context from retrieved knowledge
    let ragContext = "";
    let citations: string[] = [];
    
    if (retrievedKnowledge.length > 0) {
      ragContext = "\n\nRELEVANT MEDICAL KNOWLEDGE FROM DATABASE:\n" + 
        retrievedKnowledge.map((k, i) => {
          citations.push(`[${i + 1}] ${k.symptom} (${k.severity} severity)`);
          return `
[Entry ${i + 1}] Symptom: ${k.symptom}
- Description: ${k.description}
- Severity: ${k.severity}
- Advice: ${k.advice}
- Red Flags: ${k.red_flags || 'None specified'}
- When to Seek Help: ${k.when_to_seek_help || 'Consult a healthcare provider if symptoms persist'}
- Source: ${k.source || 'Medical guidelines'}`;
        }).join('\n');
    }

    const systemPrompt = `You are a medical symptom analyzer AI assistant. You provide helpful health information based on symptoms described by users.

IMPORTANT DISCLAIMERS:
- You are NOT a replacement for professional medical advice
- Always recommend consulting a healthcare provider for proper diagnosis
- Your analysis is for informational purposes only
- In case of emergency symptoms, advise immediate medical attention

${retrievedKnowledge.length > 0 
  ? `CRITICAL: Base your response PRIMARILY on the retrieved medical knowledge provided below. If the retrieved knowledge doesn't cover the symptoms adequately, acknowledge this and provide general guidance while recommending professional consultation.`
  : `NOTE: No specific entries were found in the medical knowledge base for these symptoms. Provide general guidance and strongly recommend consulting a healthcare provider.`
}
${ragContext}

Analyze the provided symptoms and return a JSON response with:
1. possible_conditions: array of up to 3 possible conditions with name, likelihood (high/medium/low), description, and citation (reference number from retrieved knowledge if applicable)
2. recommendations: array of 3-5 actionable recommendations
3. urgency_level: one of "low", "moderate", "high", "emergency"
4. when_to_seek_help: specific signs that warrant immediate medical attention
5. lifestyle_tips: 2-3 general wellness tips related to the symptoms
6. data_sources: array of citation references used (e.g., "[1] Headache (medium severity)")

Be thorough but concise. Always err on the side of caution.
${retrievedKnowledge.length === 0 ? '\nSince no specific knowledge was retrieved, clearly state: "I don\'t have specific information in my dataset for these exact symptoms. Please consult a healthcare provider for accurate diagnosis."' : ''}`;

    const userMessage = `Please analyze these symptoms:

Symptoms: ${symptoms}
${selectedTags?.length ? `Related symptoms: ${selectedTags.join(', ')}` : ''}
Age: ${age || 'Not provided'}
Gender: ${gender || 'Not provided'}
Duration: ${duration || 'Not specified'}
Severity: ${severity || 'Not specified'}
Medical History: ${medicalHistory || 'None provided'}

Provide your analysis in JSON format. ${retrievedKnowledge.length > 0 ? `Reference the ${retrievedKnowledge.length} knowledge base entries provided in your response.` : 'Note that no specific knowledge base entries were found for these symptoms.'}`;

    console.log("Calling Lovable AI gateway for symptom analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3,
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
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        // Add citations info if not present
        if (!analysis.data_sources && citations.length > 0) {
          analysis.data_sources = citations;
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a structured fallback
      analysis = {
        possible_conditions: [
          { name: "Unable to analyze", likelihood: "unknown", description: "Please consult a healthcare provider for proper assessment." }
        ],
        recommendations: ["Consult a healthcare provider for accurate diagnosis"],
        urgency_level: "moderate",
        when_to_seek_help: "If symptoms worsen or persist",
        lifestyle_tips: ["Rest and stay hydrated", "Monitor your symptoms"],
        data_sources: retrievedKnowledge.length > 0 ? citations : ["No knowledge base entries found"]
      };
    }

    console.log(`Symptom analysis completed successfully. Used ${retrievedKnowledge.length} knowledge base entries.`);

    return new Response(JSON.stringify({ 
      analysis,
      rag_info: {
        entries_found: retrievedKnowledge.length,
        citations: citations
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