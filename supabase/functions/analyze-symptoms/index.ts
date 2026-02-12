import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RAG_AGENT_URL = "https://health-ai-2026.onrender.com/analyze";

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

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

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

    const { symptoms, age, gender, duration, severity, medicalHistory, selectedTags } = await req.json();

    // Validate input
    if ((!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) && (!selectedTags || selectedTags.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Please provide valid symptoms (at least 3 characters) or select symptom tags" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the combined symptoms text for the RAG agent
    const allSymptoms = [
      symptoms,
      ...(selectedTags || [])
    ].filter(Boolean).join(', ');

    console.log("Calling external RAG agent at:", RAG_AGENT_URL);
    console.log("Symptoms:", allSymptoms);

    // Call the external RAG agent
    const response = await fetch(RAG_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symptoms: allSymptoms,
        age: age ? parseInt(age) : 0,
        gender: gender || "unknown",
        duration: duration || "unknown",
        severity: severity || "moderate",
        medical_history: medicalHistory || null,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RAG agent error:", response.status, errorText);
      throw new Error(`RAG agent error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("RAG agent response type:", typeof data.analysis);

    // The RAG agent returns analysis as a markdown text string
    // We pass it through as raw_analysis for the frontend to render
    const analysisText = typeof data.analysis === 'string' 
      ? data.analysis 
      : (typeof data === 'string' ? data : JSON.stringify(data));

    // Try to extract urgency from the text
    let urgencyLevel = 'moderate';
    const lowerText = analysisText.toLowerCase();
    if (lowerText.includes('emergency') || lowerText.includes('immediate') || lowerText.includes('urgent')) {
      urgencyLevel = 'high';
    } else if (lowerText.includes('mild') || lowerText.includes('low risk') || lowerText.includes('self-care')) {
      urgencyLevel = 'low';
    }

    // Save submission to database if user is logged in
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
            gender,
            duration,
            severity,
            medical_history: medicalHistory,
            result_condition: 'RAG Analysis',
            result_advice: analysisText.substring(0, 500),
            result_confidence: urgencyLevel === 'low' ? 80 : urgencyLevel === 'moderate' ? 60 : 40
          });
        }
      } catch (dbError) {
        console.error("Error saving submission:", dbError);
      }
    }

    console.log("Symptom analysis completed successfully via external RAG agent.");

    return new Response(JSON.stringify({ 
      raw_analysis: analysisText,
      urgency_level: urgencyLevel,
      rag_info: {
        source: "external_rag_agent",
        agent_url: "health-ai-2026.onrender.com"
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
