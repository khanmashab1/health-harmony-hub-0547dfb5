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

function parseAnalysisToStructured(text: string, ragConfidence?: number) {
  const conditions: { name: string; percentage: number; description: string }[] = [];
  const differentials: { name: string; description: string }[] = [];
  let severity = "moderate";
  let triageAdvice = "";
  let confidenceLevel = ragConfidence || 70;
  let recommendation = "";

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // --- Parse the RAG agent's structured output format ---
  let conditionName = "";
  let conditionDescription = "";
  let riskLevel = "";
  let adviceLines: string[] = [];
  let inAdvice = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match "Likely Condition:" or "Possible Consideration:"
    const condMatch = line.match(/^(?:\*\*)?(?:Likely Condition|Possible Consideration|Primary Condition)[:\s]*(?:\*\*)?\s*(.+)/i);
    if (condMatch) {
      conditionName = condMatch[1].replace(/\*\*/g, '').trim();
      inAdvice = false;
      continue;
    }

    // Match "Confidence Level: XX%"
    const confMatch = line.match(/^(?:\*\*)?Confidence Level[:\s]*(?:\*\*)?\s*(\d+(?:\.\d+)?)\s*%?/i);
    if (confMatch) {
      confidenceLevel = parseFloat(confMatch[1]);
      inAdvice = false;
      continue;
    }

    // Match "Description:"
    const descMatch = line.match(/^(?:\*\*)?Description[:\s]*(?:\*\*)?\s*(.+)/i);
    if (descMatch) {
      conditionDescription = descMatch[1].replace(/\*\*/g, '').trim();
      // Collect continuation lines
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (nextLine.match(/^(?:\*\*)?(?:Risk Level|Advice|Recommendation|Confidence)[:\s]/i)) break;
        conditionDescription += " " + nextLine.replace(/\*\*/g, '').trim();
        i = j;
      }
      inAdvice = false;
      continue;
    }

    // Match "Risk Level:"
    const riskMatch = line.match(/^(?:\*\*)?Risk Level[:\s]*(?:\*\*)?\s*(.+)/i);
    if (riskMatch) {
      riskLevel = riskMatch[1].replace(/\*\*/g, '').trim().toLowerCase();
      inAdvice = false;
      continue;
    }

    // Match "Advice to Treat:" section
    const adviceMatch = line.match(/^(?:\*\*)?Advice(?:\s+to\s+Treat)?[:\s]*(?:\*\*)?\s*(.*)/i);
    if (adviceMatch) {
      if (adviceMatch[1].trim()) adviceLines.push(adviceMatch[1].replace(/\*\*/g, '').trim());
      inAdvice = true;
      continue;
    }

    // Match "Recommendation:"
    const recMatch = line.match(/^(?:\*\*)?Recommendation[:\s]*(?:\*\*)?\s*(.+)/i);
    if (recMatch) {
      recommendation = recMatch[1].replace(/\*\*/g, '').trim();
      // Collect continuation lines
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (nextLine.match(/^(?:\*\*)?(?:Risk Level|Advice|Description|Confidence|Likely|Possible|Disclaimer)[:\s]/i)) break;
        if (nextLine.match(/^This is an AI/i)) break;
        recommendation += " " + nextLine.replace(/\*\*/g, '').trim();
        i = j;
      }
      inAdvice = false;
      continue;
    }

    // If we're in the advice section, collect bullet points
    if (inAdvice) {
      if (line.match(/^(?:\*\*)?(?:Recommendation|Risk Level|Description|Confidence|Likely|Possible|Disclaimer)[:\s]/i)) {
        inAdvice = false;
      } else if (line.match(/^This is an AI/i)) {
        inAdvice = false;
      } else {
        adviceLines.push(line.replace(/^[-•*\d.]+\s*/, '').replace(/\*\*/g, '').trim());
      }
    }
  }

  // Build conditions array
  if (conditionName) {
    conditions.push({
      name: conditionName,
      percentage: confidenceLevel,
      description: conditionDescription,
    });
  }

  // Map risk level to severity
  if (riskLevel.includes('critical')) severity = "critical";
  else if (riskLevel.includes('high')) severity = "high";
  else if (riskLevel.includes('medium') || riskLevel.includes('moderate')) severity = "moderate";
  else if (riskLevel.includes('low')) severity = "low";

  // Build triage advice
  triageAdvice = adviceLines.length > 0
    ? adviceLines.map(a => `• ${a}`).join('\n')
    : "";

  // --- Fallback: try old generic parsing if structured parsing found nothing ---
  if (conditions.length === 0) {
    const percentPattern = /(?:\*\*)?([A-Za-z\s\-']+?)(?:\*\*)?[\s:\-–]*(?:\()?(\d{1,3})%?\)?/g;
    let match;
    const foundConditions: { name: string; pct: number; lineIdx: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      percentPattern.lastIndex = 0;
      while ((match = percentPattern.exec(lines[i])) !== null) {
        const name = match[1].trim().replace(/^[-•*\d.]+\s*/, '');
        const pct = parseInt(match[2]);
        if (pct > 0 && pct <= 100 && name.length > 2 && name.length < 60) {
          foundConditions.push({ name, pct, lineIdx: i });
        }
      }
    }

    foundConditions.sort((a, b) => b.pct - a.pct);
    for (let i = 0; i < foundConditions.length; i++) {
      const c = foundConditions[i];
      let desc = "";
      if (c.lineIdx + 1 < lines.length) {
        const nextLine = lines[c.lineIdx + 1];
        if (!nextLine.match(/\d+%/) && !nextLine.startsWith('#')) {
          desc = nextLine.replace(/^[-•*]+\s*/, '').substring(0, 150);
        }
      }
      if (i < 2) conditions.push({ name: c.name, percentage: c.pct, description: desc });
      else differentials.push({ name: c.name, description: desc || `${c.pct}% likelihood` });
    }
  }

  // Fallback triage advice
  if (!triageAdvice) {
    const fallbackAdvice = lines.filter(l =>
      l.match(/^[-•*]/) && (l.includes('consult') || l.includes('take') || l.includes('rest') || l.includes('drink') || l.includes('avoid') || l.includes('seek') || l.includes('monitor'))
    );
    triageAdvice = fallbackAdvice.slice(0, 4).map(l => `• ${l.replace(/^[-•*]+\s*/, '')}`).join('\n');
  }

  // Fallback severity from raw text
  if (severity === "moderate" && conditions.length === 0) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical') || lowerText.includes('emergency')) severity = "critical";
    else if (lowerText.includes('severe') || lowerText.includes('immediate medical')) severity = "high";
    else if (lowerText.includes('mild') || lowerText.includes('low risk') || lowerText.includes('self-care')) severity = "low";
  }

  return {
    conditions: conditions.slice(0, 2),
    differentials: differentials.slice(0, 3),
    severity,
    triage_advice: triageAdvice,
    confidence_level: confidenceLevel,
    recommendation_text: recommendation,
    raw_analysis: text,
    consult_immediately: severity === 'critical' || severity === 'high',
  };
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

    console.log("Calling RAG agent:", allSymptoms);

    const response = await fetch(RAG_AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      throw new Error(`RAG agent error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = typeof data.analysis === 'string' 
      ? data.analysis 
      : (typeof data === 'string' ? data : JSON.stringify(data));

    // Parse the raw text into structured data
    const structured = parseAnalysisToStructured(analysisText, data.confidence_score);

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
