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

function parseAnalysisToStructured(text: string) {
  // Extract likely condition (look for patterns like "Likely Condition:", "Primary Condition:", disease names with percentages)
  const conditions: { name: string; percentage: number; description: string }[] = [];
  const differentials: { name: string; description: string }[] = [];
  let severity = "moderate";
  let triageAdvice = "";
  let confidenceLevel = 70;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Try to extract percentage patterns like "Disease Name (XX%)" or "XX% - Disease"
  const percentPattern = /(?:\*\*)?([A-Za-z\s\-']+?)(?:\*\*)?[\s:\-–]*(?:\()?(\d{1,3})%?\)?/g;
  let match;
  const foundConditions: { name: string; pct: number; lineIdx: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    percentPattern.lastIndex = 0;
    while ((match = percentPattern.exec(line)) !== null) {
      const name = match[1].trim().replace(/^[-•*\d.]+\s*/, '');
      const pct = parseInt(match[2]);
      if (pct > 0 && pct <= 100 && name.length > 2 && name.length < 60) {
        foundConditions.push({ name, pct, lineIdx: i });
      }
    }
  }

  // Sort by percentage descending
  foundConditions.sort((a, b) => b.pct - a.pct);

  // Top 1-2 are likely conditions, rest are differentials
  for (let i = 0; i < foundConditions.length; i++) {
    const c = foundConditions[i];
    // Try to get description from next line
    let desc = "";
    if (c.lineIdx + 1 < lines.length) {
      const nextLine = lines[c.lineIdx + 1];
      if (!nextLine.match(/\d+%/) && !nextLine.startsWith('#') && !nextLine.startsWith('*')) {
        desc = nextLine.replace(/^[-•*]+\s*/, '').substring(0, 150);
      }
    }
    if (i < 2) {
      conditions.push({ name: c.name, percentage: c.pct, description: desc });
    } else {
      differentials.push({ name: c.name, description: desc || `${c.pct}% likelihood based on symptoms` });
    }
  }

  // Extract severity
  const lowerText = text.toLowerCase();
  if (lowerText.includes('critical') || lowerText.includes('emergency') || lowerText.includes('life-threatening')) {
    severity = "critical";
  } else if (lowerText.includes('high severity') || lowerText.includes('severe') || lowerText.includes('immediate medical') || lowerText.includes('seek immediate')) {
    severity = "high";
  } else if (lowerText.includes('mild') || lowerText.includes('low risk') || lowerText.includes('self-care') || lowerText.includes('home remedies')) {
    severity = "low";
  }

  // Extract triage advice - look for recommendation/advice sections
  const triagePatterns = [
    /(?:recommendation|advice|what to do|action|triage|next step)[s]?[:\s]*\n?([\s\S]{10,300}?)(?:\n\n|$)/i,
    /(?:you should|we recommend|it is recommended)[:\s]*([\s\S]{10,200}?)(?:\n\n|$)/i,
  ];
  for (const p of triagePatterns) {
    const m = text.match(p);
    if (m) {
      triageAdvice = m[1].trim().replace(/^[-•*]+\s*/gm, '• ').substring(0, 300);
      break;
    }
  }

  if (!triageAdvice) {
    // Fallback: extract any bullet points that sound like advice
    const adviceLines = lines.filter(l => 
      l.match(/^[-•*]/) && (l.includes('consult') || l.includes('take') || l.includes('rest') || l.includes('drink') || l.includes('avoid') || l.includes('seek') || l.includes('monitor'))
    );
    triageAdvice = adviceLines.slice(0, 4).map(l => l.replace(/^[-•*]+\s*/, '• ')).join('\n');
  }

  // Confidence from top condition percentage or estimate
  if (conditions.length > 0) {
    confidenceLevel = conditions[0].percentage;
  }

  // If we couldn't parse structured conditions, create a fallback
  if (conditions.length === 0) {
    // Try to find any disease/condition names mentioned
    const conditionPatterns = /(?:likely|possibly|suggests?|indicates?|consistent with)\s+(?:\*\*)?([A-Z][A-Za-z\s\-']+?)(?:\*\*)?(?:\.|,|\s-)/g;
    let fallbackMatch;
    while ((fallbackMatch = conditionPatterns.exec(text)) !== null) {
      const name = fallbackMatch[1].trim();
      if (name.length > 3 && name.length < 50) {
        conditions.push({ name, percentage: 0, description: "" });
        if (conditions.length >= 2) break;
      }
    }
  }

  return {
    conditions: conditions.slice(0, 2),
    differentials: differentials.slice(0, 3),
    severity,
    triage_advice: triageAdvice,
    confidence_level: confidenceLevel,
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
    const structured = parseAnalysisToStructured(analysisText);

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
