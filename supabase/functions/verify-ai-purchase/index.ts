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

    // Send invoice email to user
    try {
      const userEmail = user.email || user.user_metadata?.email;
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || userEmail?.split("@")[0] || "Patient";
      if (userEmail) {
        const purchaseDate = new Date();
        const formattedDate = purchaseDate.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
        const formattedTime = purchaseDate.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
        const invoiceHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">MediCare Plus</h1><p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">AI Credits Purchase Invoice</p></td></tr><tr><td style="padding:32px 40px;"><p style="color:#374151;font-size:16px;margin:0 0 20px;">Dear ${userName},</p><p style="color:#374151;font-size:15px;margin:0 0 24px;">Thank you for your purchase! Here are your invoice details:</p><table width="100%" cellpadding="12" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;"><tr style="background:#f9fafb;"><td style="border-bottom:1px solid #e5e7eb;font-weight:bold;color:#374151;">Plan</td><td style="border-bottom:1px solid #e5e7eb;color:#374151;">${plan.name}</td></tr><tr><td style="border-bottom:1px solid #e5e7eb;font-weight:bold;color:#374151;">Credits</td><td style="border-bottom:1px solid #e5e7eb;color:#374151;">${plan.credits} AI Credits</td></tr><tr style="background:#f9fafb;"><td style="border-bottom:1px solid #e5e7eb;font-weight:bold;color:#374151;">Amount Paid</td><td style="border-bottom:1px solid #e5e7eb;color:#374151;font-weight:bold;color:#6366f1;">Rs. ${plan.price}</td></tr><tr><td style="border-bottom:1px solid #e5e7eb;font-weight:bold;color:#374151;">Date</td><td style="border-bottom:1px solid #e5e7eb;color:#374151;">${formattedDate}</td></tr><tr style="background:#f9fafb;"><td style="font-weight:bold;color:#374151;">Time</td><td style="color:#374151;">${formattedTime}</td></tr></table><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;"><p style="color:#166534;margin:0;font-size:14px;">&#10003; ${plan.credits} AI credits have been added to your account and are ready to use.</p></div><p style="color:#6b7280;font-size:13px;margin:0;">If you have any questions, please contact our support team.</p></td></tr><tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#9ca3af;font-size:12px;margin:0;">This is an automated invoice from MediCare Plus. Please do not reply to this email.</p></td></tr></table></td></tr></table></body></html>`;

        const emailResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              to: userEmail,
              subject: `Invoice: ${plan.credits} AI Credits - MediCare Plus`,
              html: invoiceHtml,
              recipientName: userName,
            }),
          }
        );
        logStep("Invoice email sent", { status: emailResponse.status, to: userEmail });
      }
    } catch (emailErr) {
      logStep("Invoice email failed (non-blocking)", { error: String(emailErr) });
    }

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
