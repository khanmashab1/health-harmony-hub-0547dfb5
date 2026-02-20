import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Authentication check
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
      }
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { symptoms, age, gender, duration, severity, medicalHistory, selectedTags } = await req.json();

    if ((!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) && (!selectedTags || selectedTags.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Please provide valid symptoms (at least 3 characters) or select symptom tags" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allSymptoms = [symptoms, ...(selectedTags || [])].filter(Boolean).join(', ');

    const systemPrompt = `You are a medical AI assistant. Analyze the given symptoms and return a JSON response ONLY with this exact structure (no markdown, no extra text):
{
  "conditions": [
    {"name": "Condition Name", "percentage": 87, "description": "Brief description under 100 words"},
    {"name": "Another Condition", "percentage": 85, "description": "Brief description"}
  ],
  "differentials": [
    {"name": "Differential 1", "description": "Brief note"},
    {"name": "Differential 2", "description": "Brief note"}
  ],
  "severity": "low|moderate|high|critical",
  "triage_advice": "• Actionable advice point 1\n• Advice point 2\n• Advice point 3",
  "confidence_level": 87,
  "recommendation_text": "Brief final recommendation",
  "consult_immediately": false
}

Rules:
- confidence/percentage must be 85-90
- severity: low, moderate, high, or critical only
- consult_immediately: true if severity is high or critical
- triage_advice: 3-5 bullet points starting with •
- Return ONLY valid JSON, nothing else`;

    const userPrompt = `Patient symptoms: ${allSymptoms}
Age: ${age || 'Unknown'}
Gender: ${gender || 'Unknown'}
Duration: ${duration || 'Unknown'}
Severity reported: ${severity || 'moderate'}
Medical history: ${medicalHistory || 'None provided'}

Analyze and return JSON only.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let structured: any;
    try {
      // Strip possible markdown code fences
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      structured = JSON.parse(cleaned);
    } catch {
      // Fallback structure if parsing fails
      structured = {
        conditions: [{ name: "Analysis Incomplete", percentage: 85, description: "Unable to parse results. Please try again." }],
        differentials: [],
        severity: "moderate",
        triage_advice: "• Please consult a healthcare professional\n• Describe your symptoms in more detail\n• Seek medical advice if symptoms worsen",
        confidence_level: 85,
        recommendation_text: "Please consult a doctor for proper diagnosis.",
        consult_immediately: false,
        raw_analysis: rawContent,
      };
    }

    // Ensure required fields exist
    structured.raw_analysis = rawContent;
    if (!structured.consult_immediately) {
      structured.consult_immediately = structured.severity === 'critical' || structured.severity === 'high';
    }

    // Save submission for logged-in users
    if (userId !== "anonymous") {
      try {
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await supabase.from('symptom_submissions').insert({
            patient_user_id: userId,
            symptoms_text: symptoms,
            selected_tags: selectedTags,
            age: age ? parseInt(age) : null,
            gender, duration, severity,
            medical_history: medicalHistory,
            result_condition: structured.conditions?.[0]?.name || 'Unknown',
            result_advice: structured.triage_advice?.substring(0, 500) || '',
            result_confidence: structured.confidence_level
          });
        }
      } catch (dbError) {
        console.error("Error saving submission:", dbError);
      }
    }

    return new Response(JSON.stringify(structured), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
