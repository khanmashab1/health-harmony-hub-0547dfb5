import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper function to send subscription email notification
async function sendSubscriptionEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  doctorName: string,
  eventType: "upgrade" | "cancel" | "renewal" | "payment_failed",
  planName?: string,
  planPrice?: number,
  subscriptionEnd?: string
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-subscription-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        doctorName,
        eventType,
        planName,
        planPrice,
        subscriptionEnd,
      }),
    });
    logStep("Email notification sent", { eventType, email, success: response.ok });
  } catch (error) {
    logStep("Failed to send email notification", { error: String(error) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (verifyError) {
        const errorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);
        logStep("Webhook signature verification failed", { error: errorMsg });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Parse without verification (for testing)
      event = JSON.parse(body);
      logStep("Webhook received without signature verification");
    }

    logStep("Event type", { type: event.type });

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    // Handle subscription events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id, customerId: session.customer, metadata: session.metadata });
        
        // Handle AI credits purchase
        if (session.metadata?.type === "ai_credits") {
          const userId = session.metadata.user_id;
          const planId = session.metadata.plan_id;
          
          if (userId && planId) {
            // Get plan details
            const { data: plan } = await supabaseClient
              .from("patient_ai_plans")
              .select("credits, price, name")
              .eq("id", planId)
              .single();
            
            if (plan) {
              // Add credits to user
              await supabaseClient.rpc("add_ai_credits", {
                p_user_id: userId,
                p_credits: plan.credits,
              });

              // Record purchase
              await supabaseClient.from("patient_ai_purchases").insert({
                user_id: userId,
                plan_id: planId,
                credits_purchased: plan.credits,
                amount_paid: plan.price,
                stripe_session_id: session.id,
                status: "completed",
              });

              logStep("AI credits added", { userId, credits: plan.credits, planName: plan.name });
            }
          }
          break;
        }

        // Handle doctor subscription checkout
        if (session.mode === "subscription" && session.customer_email) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price.product as string;
          
          // Find matching plan
          const { data: matchingPlan } = await supabaseClient
            .from("doctor_payment_plans")
            .select("id, name, price")
            .eq("stripe_product_id", productId)
            .single();
          
          if (matchingPlan) {
            const userId = session.metadata?.user_id;
            if (userId) {
              await supabaseClient
                .from("doctors")
                .update({ selected_plan_id: matchingPlan.id })
                .eq("user_id", userId);
              logStep("Updated doctor plan from checkout", { userId, planId: matchingPlan.id });

              const { data: profile } = await supabaseClient
                .from("profiles")
                .select("name")
                .eq("id", userId)
                .single();

              await sendSubscriptionEmail(
                supabaseUrl,
                serviceRoleKey,
                session.customer_email,
                profile?.name || "Doctor",
                "upgrade",
                matchingPlan.name,
                matchingPlan.price,
                new Date(subscription.current_period_end * 1000).toISOString()
              );
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId: subscription.customer 
        });

        if (subscription.status === "active") {
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (customer && !customer.deleted && customer.email) {
            const productId = subscription.items.data[0]?.price.product as string;
            
            // Find matching plan
            const { data: matchingPlan } = await supabaseClient
              .from("doctor_payment_plans")
              .select("id, name, price")
              .eq("stripe_product_id", productId)
              .single();
            
            if (matchingPlan) {
              // Find doctor by checking profiles with matching email
              const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
              const user = authUsers?.users?.find(u => u.email === customer.email);
              
              if (user) {
                await supabaseClient
                  .from("doctors")
                  .update({ selected_plan_id: matchingPlan.id })
                  .eq("user_id", user.id);
                logStep("Updated doctor plan from subscription update", { userId: user.id, planId: matchingPlan.id });

                // Get doctor name for email
                const { data: profile } = await supabaseClient
                  .from("profiles")
                  .select("name")
                  .eq("id", user.id)
                  .single();

                // Send upgrade email notification
                await sendSubscriptionEmail(
                  supabaseUrl,
                  serviceRoleKey,
                  customer.email,
                  profile?.name || "Doctor",
                  "upgrade",
                  matchingPlan.name,
                  matchingPlan.price,
                  new Date(subscription.current_period_end * 1000).toISOString()
                );
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id, customerId: subscription.customer });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer && !customer.deleted && customer.email) {
          // Find the free/basic plan
          const { data: freePlan } = await supabaseClient
            .from("doctor_payment_plans")
            .select("id")
            .or("stripe_product_id.is.null,name.ilike.%basic%,name.ilike.%free%")
            .order("price", { ascending: true })
            .limit(1)
            .single();
          
          // Find doctor by email
          const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
          const user = authUsers?.users?.find(u => u.email === customer.email);
          
          if (user) {
            await supabaseClient
              .from("doctors")
              .update({ selected_plan_id: freePlan?.id || null })
              .eq("user_id", user.id);
            logStep("Reset doctor to free plan", { userId: user.id });

            // Get doctor name for email
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("name")
              .eq("id", user.id)
              .single();

            // Send cancellation email notification
            await sendSubscriptionEmail(
              supabaseUrl,
              serviceRoleKey,
              customer.email,
              profile?.name || "Doctor",
              "cancel",
              undefined,
              undefined,
              new Date(subscription.current_period_end * 1000).toISOString()
            );
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id, customerId: invoice.customer });
        
        // Check if this is a renewal (not the first payment)
        if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
          const customerId = invoice.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (customer && !customer.deleted && customer.email) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const productId = subscription.items.data[0]?.price.product as string;
            
            const { data: matchingPlan } = await supabaseClient
              .from("doctor_payment_plans")
              .select("id, name, price")
              .eq("stripe_product_id", productId)
              .single();

            // Find doctor by email
            const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
            const user = authUsers?.users?.find(u => u.email === customer.email);

            if (user && matchingPlan) {
              const { data: profile } = await supabaseClient
                .from("profiles")
                .select("name")
                .eq("id", user.id)
                .single();

              // Send renewal email notification
              await sendSubscriptionEmail(
                supabaseUrl,
                serviceRoleKey,
                customer.email,
                profile?.name || "Doctor",
                "renewal",
                matchingPlan.name,
                matchingPlan.price,
                new Date(subscription.current_period_end * 1000).toISOString()
              );
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id, customerId: invoice.customer });
        
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer && !customer.deleted && customer.email) {
          // Find doctor by email
          const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
          const user = authUsers?.users?.find(u => u.email === customer.email);

          if (user) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("name")
              .eq("id", user.id)
              .single();

            // Send payment failed email notification
            await sendSubscriptionEmail(
              supabaseUrl,
              serviceRoleKey,
              customer.email,
              profile?.name || "Doctor",
              "payment_failed"
            );
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
