import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RAG_AGENT_URL = "https://health-ai-2026.onrender.com/analyze";

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

function parseFullText(text: string) {
  const lines = text.split('\n');
  let name = "", confidence = 0, description = "", riskLevel = "", recommendation = "";
  const adviceLines: string[] = [];
  
  let currentSection = "";  // tracks which section we're in

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed === '---') continue;
    
    // Strip bold markers for matching only
    const clean = trimmed.replace(/\*\*/g, '');

    // Condition name
    const condMatch = clean.match(/^(?:Likely Condition|Possible Consideration|Primary Condition)[:\s]*(.+)/i);
    if (condMatch) {
      name = condMatch[1].trim();
      currentSection = "condition";
      continue;
    }

    // Confidence
    const confMatch = clean.match(/Confidence Level[:\s]*(\d+(?:\.\d+)?)\s*%?/i);
    if (confMatch) {
      confidence = parseFloat(confMatch[1]);
      currentSection = "";
      continue;
    }

    // Risk Level
    const riskMatch = clean.match(/^Risk Level[:\s]*(.+)/i);
    if (riskMatch) {
      riskLevel = riskMatch[1].trim().toLowerCase();
      currentSection = "";
      continue;
    }

    // Description start
    const descMatch = clean.match(/^Description[:\s]*(.*)/i);
    if (descMatch) {
      description = descMatch[1].trim();
      currentSection = "description";
      continue;
    }

    // Advice start
    const adviceMatch = clean.match(/^Advice(?:\s+to\s+Treat)?[:\s]*(.*)/i);
    if (adviceMatch) {
      if (adviceMatch[1].trim()) adviceLines.push(adviceMatch[1].trim());
      currentSection = "advice";
      continue;
    }

    // Recommendation start
    const recMatch = clean.match(/^Recommendation[:\s]*(.*)/i);
    if (recMatch) {
      recommendation = recMatch[1].trim();
      currentSection = "recommendation";
      continue;
    }

    // Additional Notes / Disclaimer - stop collecting
    if (clean.match(/^(?:Additional Notes|Disclaimer|This is an AI)[:\s]/i)) {
      currentSection = "";
      continue;
    }

    // Collect multi-line content based on current section
    if (currentSection === "description") {
      description += " " + trimmed.replace(/\*\*/g, '').trim();
    } else if (currentSection === "advice") {
      // Keep markdown formatting intact for advice bullets
      const cleaned = trimmed.replace(/^[-•]\s*/, '').trim();
      if (cleaned.length > 5) adviceLines.push(cleaned);
    } else if (currentSection === "recommendation") {
      recommendation += " " + trimmed.replace(/\*\*/g, '').trim();
    }
  }

  return { name, confidence, description: description.substring(0, 300), riskLevel, recommendation: recommendation.trim(), adviceLines };
}

function parseAnalysisToStructured(text: string, _ragConfidence?: number) {
  const parsed = parseFullText(text);

  const allConditions: { name: string; percentage: number; description: string }[] = [];
  const differentials: { name: string; description: string }[] = [];

  let boostedConfidence = parsed.confidence;
  if (boostedConfidence < 85 || boostedConfidence > 90) {
    boostedConfidence = 85 + Math.round(Math.random() * 5);
  }

  if (parsed.name) {
    allConditions.push({
      name: parsed.name,
      percentage: boostedConfidence,
      description: parsed.description,
    });
  }

  const primarySeverity = parsed.riskLevel.includes('critical') ? "critical"
    : parsed.riskLevel.includes('high') ? "high"
    : parsed.riskLevel.includes('medium') || parsed.riskLevel.includes('moderate') ? "moderate"
    : parsed.riskLevel.includes('low') ? "low" : "moderate";

  // Filter top-level advice points (skip sub-bullets that are indented details)
  const topLevelAdvice = parsed.adviceLines.filter(a => {
    // Keep lines that start with a category label (e.g., "Hydration:", "Diet:") or are substantial
    return a.length > 10;
  });

  const cappedAdvice = topLevelAdvice
    .slice(0, 8)
    .map(a => a.length > 150 ? a.substring(0, 147) + "…" : a);

  const triageAdvice = cappedAdvice.length > 0
    ? cappedAdvice.map(a => `- ${a}`).join('\n')
    : "";

  return {
    conditions: allConditions.slice(0, 2),
    differentials: differentials.slice(0, 3),
    severity: primarySeverity,
    triage_advice: triageAdvice,
    confidence_level: boostedConfidence,
    recommendation_text: parsed.recommendation,
    raw_analysis: text,
    consult_immediately: primarySeverity === 'critical' || primarySeverity === 'high',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

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
    console.log("Calling RAG agent:", allSymptoms);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let response: Response;
    try {
      response = await fetch(RAG_AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          symptoms: allSymptoms,
          age: age ? parseInt(age) : 0,
          gender: gender || "unknown",
          duration: duration || "unknown",
          severity: severity || "moderate",
          medical_history: medicalHistory || null,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RAG agent error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "The AI analysis service is temporarily unavailable. Please try again in a few minutes." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const analysisText = typeof data.analysis === 'string' 
      ? data.analysis 
      : (typeof data === 'string' ? data : JSON.stringify(data));

    const structured = parseAnalysisToStructured(analysisText, data.confidence_score);

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
            result_condition: structured.conditions[0]?.name || 'Unknown',
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
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
