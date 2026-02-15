import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { age, gender, height, weight, goal, dietaryPreference, activityLevel, medicalConditions, allergies } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);

    const systemPrompt = `You are a certified nutritionist and fitness expert AI. Generate a comprehensive, personalized health plan. Be specific with meal names, portion sizes, exercise details, and timing. Use Pakistani/South Asian food options when appropriate but also include international options. Always include a medical disclaimer.

IMPORTANT: Return your response as valid JSON matching this exact structure:
{
  "summary": "A 2-3 sentence personalized health summary",
  "bmi": ${bmi},
  "bmiCategory": "Underweight/Normal/Overweight/Obese",
  "dailyCalories": number,
  "waterIntake": "amount in liters",
  "dietPlan": {
    "breakfast": [{"meal": "name", "calories": number, "details": "ingredients/portion"}],
    "morningSnack": [{"meal": "name", "calories": number, "details": "description"}],
    "lunch": [{"meal": "name", "calories": number, "details": "ingredients/portion"}],
    "eveningSnack": [{"meal": "name", "calories": number, "details": "description"}],
    "dinner": [{"meal": "name", "calories": number, "details": "ingredients/portion"}]
  },
  "exercisePlan": [
    {"day": "Monday", "workout": "name", "duration": "30 mins", "intensity": "Moderate", "details": "specific exercises"}
  ],
  "lifestyleTips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "sleepRecommendation": "7-9 hours with specific advice",
  "weeklyGoals": ["goal1", "goal2", "goal3"]
}`;

    const userPrompt = `Create a personalized health & diet plan for:
- Age: ${age} years
- Gender: ${gender}
- Height: ${height} cm, Weight: ${weight} kg (BMI: ${bmi})
- Goal: ${goal}
- Dietary Preference: ${dietaryPreference}
- Activity Level: ${activityLevel}
- Medical Conditions: ${medicalConditions || "None"}
- Food Allergies: ${allergies || "None"}

Provide a complete 7-day exercise plan and a full day diet plan with exact calories. Make it practical and achievable.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_health_plan",
              description: "Generate a comprehensive personalized health and diet plan",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  bmi: { type: "number" },
                  bmiCategory: { type: "string" },
                  dailyCalories: { type: "number" },
                  waterIntake: { type: "string" },
                  dietPlan: {
                    type: "object",
                    properties: {
                      breakfast: { type: "array", items: { type: "object", properties: { meal: { type: "string" }, calories: { type: "number" }, details: { type: "string" } }, required: ["meal", "calories", "details"] } },
                      morningSnack: { type: "array", items: { type: "object", properties: { meal: { type: "string" }, calories: { type: "number" }, details: { type: "string" } }, required: ["meal", "calories", "details"] } },
                      lunch: { type: "array", items: { type: "object", properties: { meal: { type: "string" }, calories: { type: "number" }, details: { type: "string" } }, required: ["meal", "calories", "details"] } },
                      eveningSnack: { type: "array", items: { type: "object", properties: { meal: { type: "string" }, calories: { type: "number" }, details: { type: "string" } }, required: ["meal", "calories", "details"] } },
                      dinner: { type: "array", items: { type: "object", properties: { meal: { type: "string" }, calories: { type: "number" }, details: { type: "string" } }, required: ["meal", "calories", "details"] } },
                    },
                    required: ["breakfast", "morningSnack", "lunch", "eveningSnack", "dinner"]
                  },
                  exercisePlan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string" },
                        workout: { type: "string" },
                        duration: { type: "string" },
                        intensity: { type: "string" },
                        details: { type: "string" }
                      },
                      required: ["day", "workout", "duration", "intensity", "details"]
                    }
                  },
                  lifestyleTips: { type: "array", items: { type: "string" } },
                  sleepRecommendation: { type: "string" },
                  weeklyGoals: { type: "array", items: { type: "string" } }
                },
                required: ["summary", "bmi", "bmiCategory", "dailyCalories", "waterIntake", "dietPlan", "exercisePlan", "lifestyleTips", "sleepRecommendation", "weeklyGoals"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_health_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service unavailable");
    }

    const aiData = await response.json();
    
    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let plan;
    if (toolCall?.function?.arguments) {
      plan = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } else {
      // Fallback: try parsing content as JSON
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Diet planner error:", error);
    return new Response(JSON.stringify({ error: error.message || "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
