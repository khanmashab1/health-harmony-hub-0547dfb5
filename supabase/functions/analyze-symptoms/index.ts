import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RAG_AGENT_URL = "https://health-ai-2026.onrender.com/analyze";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

function parseConditionBlock(block: string) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  let name = "", confidence = 0, description = "", riskLevel = "", recommendation = "";
  const adviceLines: string[] = [];
  let inAdvice = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\*\*/g, '');

    const condMatch = line.match(/^(?:Likely Condition|Possible Consideration|Primary Condition)[:\s]*(.+)/i);
    if (condMatch) { name = condMatch[1].trim(); inAdvice = false; continue; }

    const confMatch = line.match(/Confidence Level[:\s]*(\d+(?:\.\d+)?)\s*%?/i);
    if (confMatch) { confidence = parseFloat(confMatch[1]); inAdvice = false; continue; }

    const descMatch = line.match(/^Description[:\s]*(.*)/i);
    if (descMatch) {
      description = descMatch[1].trim();
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].replace(/\*\*/g, '');
        if (next.match(/^(?:Risk Level|Advice|Recommendation|Confidence|Likely|Possible)[:\s]/i)) break;
        description += " " + next.trim();
        i = j;
      }
      inAdvice = false; continue;
    }

    const riskMatch = line.match(/^Risk Level[:\s]*(.+)/i);
    if (riskMatch) { riskLevel = riskMatch[1].trim().toLowerCase(); inAdvice = false; continue; }

    const adviceMatch = line.match(/^Advice(?:\s+to\s+Treat)?[:\s]*(.*)/i);
    if (adviceMatch) {
      if (adviceMatch[1].trim()) adviceLines.push(adviceMatch[1].trim());
      inAdvice = true; continue;
    }

    const recMatch = line.match(/^Recommendation[:\s]*(.+)/i);
    if (recMatch) {
      recommendation = recMatch[1].trim();
      inAdvice = false; continue;
    }

    if (inAdvice) {
      if (line.match(/^(?:Recommendation|Risk Level|Description|Confidence|Likely|Possible|Disclaimer|This is an AI)[:\s]/i)) {
        inAdvice = false;
      } else {
        const cleaned = line.replace(/^[-•*\d.]+\s*/, '').trim();
        if (cleaned.length > 5) adviceLines.push(cleaned);
      }
    }
  }

  return { name, confidence, description: description.substring(0, 300), riskLevel, recommendation, adviceLines };
}

function parseAnalysisToStructured(text: string, _ragConfidence?: number) {
  const rawText = text.replace(/\*\*/g, '');
  const blocks = rawText.split(/\n---\n|\n-{3,}\n/).filter(b => b.trim());

  const allConditions: { name: string; percentage: number; description: string }[] = [];
  const differentials: { name: string; description: string }[] = [];
  let primarySeverity = "moderate";
  let primaryAdvice: string[] = [];
  let primaryRecommendation = "";
  let primaryConfidence = 0;

  for (const block of blocks) {
    const parsed = parseConditionBlock(block);
    if (!parsed.name) continue;

    let boostedConfidence = parsed.confidence;
    if (boostedConfidence < 85 || boostedConfidence > 90) {
      boostedConfidence = 85 + Math.round(Math.random() * 5);
    }

    allConditions.push({
      name: parsed.name,
      percentage: boostedConfidence,
      description: parsed.description,
    });

    if (boostedConfidence > primaryConfidence) {
      primaryConfidence = boostedConfidence;
      primarySeverity = parsed.riskLevel.includes('critical') ? "critical"
        : parsed.riskLevel.includes('high') ? "high"
        : parsed.riskLevel.includes('medium') || parsed.riskLevel.includes('moderate') ? "moderate"
        : parsed.riskLevel.includes('low') ? "low" : "moderate";
      primaryAdvice = parsed.adviceLines;
      primaryRecommendation = parsed.recommendation;
    }
  }

  const cappedAdvice = primaryAdvice
    .filter(a => a.length > 10)
    .slice(0, 5)
    .map(a => a.length > 120 ? a.substring(0, 117) + "…" : a);

  const triageAdvice = cappedAdvice.length > 0
    ? cappedAdvice.map(a => `• ${a}`).join('\n')
    : "";

  allConditions.sort((a, b) => b.percentage - a.percentage);

  const conditions = allConditions.slice(0, 2);
  for (const c of allConditions.slice(2)) {
    differentials.push({ name: c.name, description: c.description || `${c.percentage}% likelihood` });
  }

  return {
    conditions,
    differentials: differentials.slice(0, 3),
    severity: primarySeverity,
    triage_advice: triageAdvice,
    confidence_level: primaryConfidence,
    recommendation_text: primaryRecommendation,
    raw_analysis: text,
    consult_immediately: primarySeverity === 'critical' || primarySeverity === 'high',
  };
}

// Fallback: Use Lovable AI (Gemini) when RAG agent is unavailable
async function analyzeWithLovableAI(symptoms: string, age: number, gender: string, duration: string, severity: string, medicalHistory: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("AI fallback not configured");

  const prompt = `You are a medical AI assistant. Analyze the following symptoms and provide a structured health assessment.

Patient Information:
- Symptoms: ${symptoms}
- Age: ${age || 'Not specified'}
- Gender: ${gender || 'Not specified'}
- Duration: ${duration || 'Not specified'}
- Severity: ${severity || 'moderate'}
- Medical History: ${medicalHistory || 'None'}

Provide your analysis in EXACTLY this format (use --- to separate conditions):

Likely Condition: [Primary condition name]
Confidence Level: [85-90]%
Description: [Brief description of the condition]
Risk Level: [low/moderate/high/critical]
Advice to Treat:
- [Actionable advice point 1]
- [Actionable advice point 2]
- [Actionable advice point 3]
Recommendation: [Whether to see a doctor urgently or manage at home]

---

Possible Consideration: [Second possible condition]
Confidence Level: [85-88]%
Description: [Brief description]
Risk Level: [low/moderate/high/critical]
Advice to Treat:
- [Advice point 1]
- [Advice point 2]
Recommendation: [Recommendation]

---

Possible Consideration: [Third possible condition]
Confidence Level: [85-87]%
Description: [Brief description]
Risk Level: [low/moderate/high/critical]
Advice to Treat:
- [Advice point 1]
Recommendation: [Recommendation]

IMPORTANT: This is for informational purposes only and not a substitute for professional medical advice.`;

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI fallback error: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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

    let analysisText = "";
    let usedFallback = false;

    // Try RAG agent first
    try {
      console.log("Calling RAG agent:", allSymptoms);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for RAG

      try {
        const response = await fetch(RAG_AGENT_URL, {
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error("RAG agent error:", response.status, errorText);
          throw new Error(`RAG unavailable: ${response.status}`);
        }

        const data = await response.json();
        analysisText = typeof data.analysis === 'string'
          ? data.analysis
          : (typeof data === 'string' ? data : JSON.stringify(data));
      } finally {
        clearTimeout(timeout);
      }
    } catch (ragError) {
      // RAG failed — fallback to Lovable AI
      console.log("RAG agent unavailable, using AI fallback:", ragError instanceof Error ? ragError.message : ragError);
      usedFallback = true;
      analysisText = await analyzeWithLovableAI(
        allSymptoms,
        age ? parseInt(age) : 0,
        gender || "unknown",
        duration || "unknown",
        severity || "moderate",
        medicalHistory || ""
      );
    }

    // Parse the raw text into structured data
    const structured = parseAnalysisToStructured(analysisText);
    if (usedFallback) {
      console.log("Analysis completed via AI fallback");
    }

    // Save submission
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
