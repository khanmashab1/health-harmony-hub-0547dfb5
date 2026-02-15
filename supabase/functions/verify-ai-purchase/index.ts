import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-AI-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { planId } = await req.json();
    if (!planId) throw new Error("Missing planId");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if credits were already fulfilled for this plan purchase recently (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentPurchase } = await serviceClient
      .from("patient_ai_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .eq("status", "completed")
      .gte("created_at", fiveMinutesAgo)
      .limit(1)
      .maybeSingle();

    if (recentPurchase) {
      logStep("Credits already fulfilled recently", { purchaseId: recentPurchase.id });
      return new Response(JSON.stringify({ success: true, already_fulfilled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Stripe that a completed checkout session exists for this user/plan
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // List recent checkout sessions for this user's email
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    const matchingSession = sessions.data.find(
      (s) =>
        s.status === "complete" &&
        s.payment_status === "paid" &&
        s.metadata?.user_id === user.id &&
        s.metadata?.plan_id === planId &&
        s.metadata?.type === "ai_credits"
    );

    if (!matchingSession) {
      logStep("No matching completed session found");
      return new Response(JSON.stringify({ success: false, error: "No completed payment found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Found matching Stripe session", { sessionId: matchingSession.id });

    // Check if this session was already fulfilled
    const { data: existingPurchase } = await serviceClient
      .from("patient_ai_purchases")
      .select("id")
      .eq("stripe_session_id", matchingSession.id)
      .maybeSingle();

    if (existingPurchase) {
      logStep("Session already fulfilled", { purchaseId: existingPurchase.id });
      return new Response(JSON.stringify({ success: true, already_fulfilled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan details
    const { data: plan, error: planError } = await serviceClient
      .from("patient_ai_plans")
      .select("credits, price, name")
      .eq("id", planId)
      .single();

    if (planError || !plan) throw new Error("Plan not found");

    // Fulfill: add credits
    await serviceClient.rpc("add_ai_credits", {
      p_user_id: user.id,
      p_credits: plan.credits,
    });

    // Record purchase
    await serviceClient.from("patient_ai_purchases").insert({
      user_id: user.id,
      plan_id: planId,
      credits_purchased: plan.credits,
      amount_paid: plan.price,
      stripe_session_id: matchingSession.id,
      status: "completed",
    });

    logStep("Credits fulfilled successfully", { credits: plan.credits, planName: plan.name });

    return new Response(JSON.stringify({ success: true, credits_added: plan.credits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
