import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SUBSCRIPTION-EMAIL] ${step}${detailsStr}`);
};

interface EmailRequest {
  email: string;
  doctorName: string;
  eventType: "upgrade" | "cancel" | "renewal" | "payment_failed";
  planName?: string;
  planPrice?: number;
  subscriptionEnd?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, doctorName, eventType, planName, planPrice, subscriptionEnd }: EmailRequest = await req.json();
    
    if (!email || !doctorName || !eventType) {
      throw new Error("Missing required fields: email, doctorName, eventType");
    }
    logStep("Request received", { email, eventType, planName });

    // Get site settings for branding
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: settings } = await supabaseClient
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["site_name", "site_url", "logo_url"]);

    const siteName = settings?.find(s => s.setting_key === "site_name")?.setting_value || "MediCare+";
    const siteUrl = settings?.find(s => s.setting_key === "site_url")?.setting_value || "https://medicare.pk";
    const logoUrl = settings?.find(s => s.setting_key === "logo_url")?.setting_value;

    // Generate email content based on event type
    let subject = "";
    let heading = "";
    let message = "";
    let ctaText = "";
    let ctaUrl = `${siteUrl}/doctor?tab=settings`;

    switch (eventType) {
      case "upgrade":
        subject = `🎉 Welcome to ${planName} Plan - ${siteName}`;
        heading = "Your Subscription is Active!";
        message = `
          <p>Dear Dr. ${doctorName},</p>
          <p>Thank you for upgrading to the <strong>${planName}</strong> plan!</p>
          <p>Your subscription is now active and you have access to all premium features.</p>
          ${planPrice ? `<p>Monthly price: <strong>PKR ${planPrice.toLocaleString()}</strong></p>` : ""}
          <p>Here's what you can now enjoy:</p>
          <ul>
            <li>Advanced analytics dashboard</li>
            <li>Priority customer support</li>
            <li>Custom branding options</li>
            <li>Increased patient capacity</li>
          </ul>
        `;
        ctaText = "View Your Dashboard";
        break;

      case "cancel":
        subject = `Subscription Cancelled - ${siteName}`;
        heading = "We're Sorry to See You Go";
        message = `
          <p>Dear Dr. ${doctorName},</p>
          <p>Your subscription has been cancelled.</p>
          ${subscriptionEnd ? `<p>You will continue to have access to premium features until <strong>${new Date(subscriptionEnd).toLocaleDateString()}</strong>.</p>` : ""}
          <p>After this date, your account will revert to the Basic plan.</p>
          <p>If you change your mind, you can resubscribe at any time from your dashboard.</p>
        `;
        ctaText = "Resubscribe";
        break;

      case "renewal":
        subject = `✅ Subscription Renewed - ${siteName}`;
        heading = "Your Subscription Has Been Renewed";
        message = `
          <p>Dear Dr. ${doctorName},</p>
          <p>Your <strong>${planName}</strong> subscription has been successfully renewed.</p>
          ${planPrice ? `<p>Amount charged: <strong>PKR ${planPrice.toLocaleString()}</strong></p>` : ""}
          ${subscriptionEnd ? `<p>Next billing date: <strong>${new Date(subscriptionEnd).toLocaleDateString()}</strong></p>` : ""}
          <p>Thank you for your continued trust in ${siteName}!</p>
        `;
        ctaText = "View Subscription";
        break;

      case "payment_failed":
        subject = `⚠️ Payment Failed - Action Required - ${siteName}`;
        heading = "Payment Failed";
        message = `
          <p>Dear Dr. ${doctorName},</p>
          <p>We were unable to process your subscription payment.</p>
          <p>Please update your payment method to avoid service interruption.</p>
          <p>If you need assistance, our support team is here to help.</p>
        `;
        ctaText = "Update Payment Method";
        break;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${siteName}" style="max-height: 50px; margin-bottom: 15px;">` : ""}
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${heading}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="color: #374151; font-size: 16px; line-height: 1.6;">
                      ${message}
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        ${ctaText}
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                      © ${new Date().getFullYear()} ${siteName}. All rights reserved.
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0;">
                      This email was sent regarding your subscription at ${siteName}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email via Resend if API key is available
    if (RESEND_API_KEY) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${siteName} <noreply@${new URL(siteUrl).hostname}>`,
          to: [email],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        logStep("Resend API error", { status: emailResponse.status, error: errorData });
        // Don't throw - log the email for manual sending
      } else {
        logStep("Email sent successfully via Resend");
      }
    } else {
      logStep("RESEND_API_KEY not configured, skipping email send");
    }

    // Log the email attempt
    await supabaseClient.from("email_logs").insert({
      email_type: `subscription_${eventType}`,
      recipient_email: email,
      subject: subject,
      status: RESEND_API_KEY ? "sent" : "skipped",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
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
