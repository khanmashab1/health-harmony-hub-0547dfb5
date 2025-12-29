import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a medical symptom analyzer AI assistant. You provide helpful health information based on symptoms described by users.

IMPORTANT DISCLAIMERS:
- You are NOT a replacement for professional medical advice
- Always recommend consulting a healthcare provider for proper diagnosis
- Your analysis is for informational purposes only
- In case of emergency symptoms, advise immediate medical attention

Analyze the provided symptoms and return a JSON response with:
1. possible_conditions: array of up to 3 possible conditions with name, likelihood (high/medium/low), and brief description
2. recommendations: array of 3-5 actionable recommendations
3. urgency_level: one of "low", "moderate", "high", "emergency"
4. when_to_seek_help: specific signs that warrant immediate medical attention
5. lifestyle_tips: 2-3 general wellness tips related to the symptoms

Be thorough but concise. Always err on the side of caution.`;

    const userMessage = `Please analyze these symptoms:

Symptoms: ${symptoms}
${selectedTags?.length ? `Related symptoms: ${selectedTags.join(', ')}` : ''}
Age: ${age || 'Not provided'}
Gender: ${gender || 'Not provided'}
Duration: ${duration || 'Not specified'}
Severity: ${severity || 'Not specified'}
Medical History: ${medicalHistory || 'None provided'}

Provide your analysis in JSON format.`;

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
        lifestyle_tips: ["Rest and stay hydrated", "Monitor your symptoms"]
      };
    }

    console.log("Symptom analysis completed successfully");

    return new Response(JSON.stringify({ analysis }), {
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
