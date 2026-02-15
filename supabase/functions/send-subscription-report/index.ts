import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-REPORT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - Generating 10-day subscription report");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get site settings
    const { data: settings } = await supabaseClient
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["site_name", "site_url", "logo_url", "admin_email"]);

    const siteName = settings?.find(s => s.setting_key === "site_name")?.setting_value || "MediCare+";
    const siteUrl = settings?.find(s => s.setting_key === "site_url")?.setting_value || "https://medicare-nine-wine.vercel.app";
    const adminEmail = settings?.find(s => s.setting_key === "admin_email")?.setting_value;

    if (!adminEmail) {
      logStep("No admin email configured, skipping report");
      return new Response(JSON.stringify({ success: false, message: "No admin email configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Admin email found", { adminEmail });

    // Calculate date 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];

    // Fetch all doctors with their plans
    const { data: doctors, error: doctorsError } = await supabaseClient
      .from("doctors")
      .select(`
        user_id,
        specialty,
        fee,
        created_at,
        selected_plan_id
      `)
      .order("created_at", { ascending: false });

    if (doctorsError) throw doctorsError;

    // Get profiles and plans
    const userIds = doctors?.map(d => d.user_id) || [];
    const planIds = [...new Set(doctors?.map(d => d.selected_plan_id).filter(Boolean) || [])];

    const [profilesRes, plansRes] = await Promise.all([
      userIds.length > 0 
        ? supabaseClient.from("profiles").select("id, name, phone, status").in("id", userIds)
        : Promise.resolve({ data: [] }),
      planIds.length > 0
        ? supabaseClient.from("doctor_payment_plans").select("id, name, price, billing_period").in("id", planIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profiles = profilesRes.data || [];
    const plans = plansRes.data || [];

    // Calculate metrics
    const totalDoctors = doctors?.length || 0;
    const subscribedDoctors = doctors?.filter(d => d.selected_plan_id && plans.find(p => p.id === d.selected_plan_id)?.price > 0).length || 0;
    const freeDoctors = totalDoctors - subscribedDoctors;

    // New subscriptions in last 10 days
    const newSubscriptions = doctors?.filter(d => {
      const createdDate = new Date(d.created_at).toISOString().split('T')[0];
      return createdDate >= tenDaysAgoStr && d.selected_plan_id;
    }) || [];

    const monthlyRevenue = doctors?.reduce((sum, d) => {
      const plan = plans.find(p => p.id === d.selected_plan_id);
      if (!plan) return sum;
      const monthlyPrice = plan.billing_period === "yearly" ? plan.price / 12 : plan.price;
      return sum + monthlyPrice;
    }, 0) || 0;

    // Plan distribution
    const planDistribution = plans.map(plan => ({
      name: plan.name,
      count: doctors?.filter(d => d.selected_plan_id === plan.id).length || 0,
      revenue: (doctors?.filter(d => d.selected_plan_id === plan.id).length || 0) * 
        (plan.billing_period === "yearly" ? plan.price / 12 : plan.price),
    }));

    planDistribution.push({
      name: "Free/No Plan",
      count: freeDoctors,
      revenue: 0,
    });

    // Build detailed doctor list for last 10 days
    const recentDoctorsList = newSubscriptions.map(d => {
      const profile = profiles.find(p => p.id === d.user_id);
      const plan = plans.find(p => p.id === d.selected_plan_id);
      return {
        name: profile?.name || "Unknown",
        specialty: d.specialty,
        plan: plan?.name || "Free",
        price: plan ? `PKR ${plan.price.toLocaleString()}/${plan.billing_period === "yearly" ? "year" : "month"}` : "Free",
        joinedDate: new Date(d.created_at).toLocaleDateString('en-PK'),
      };
    });

    logStep("Report data compiled", {
      totalDoctors,
      subscribedDoctors,
      newSubscriptionsLast10Days: newSubscriptions.length,
      monthlyRevenue,
    });

    // Generate email HTML
    const planRows = planDistribution.map(p => `<tr><td style="padding:12px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">${p.name}</td><td style="padding:12px;text-align:center;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">${p.count}</td><td style="padding:12px;text-align:right;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">PKR ${p.revenue.toLocaleString()}</td></tr>`).join('');

    const recentRows = recentDoctorsList.slice(0, 10).map(d => `<tr><td style="padding:10px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${d.name}</td><td style="padding:10px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">${d.specialty}</td><td style="padding:10px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${d.plan}</td><td style="padding:10px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #e5e7eb;">${d.joinedDate}</td></tr>`).join('');

    const recentSection = recentDoctorsList.length > 0 ? `<tr><td style="padding:0 30px 30px;"><h3 style="color:#374151;margin:0 0 15px;font-size:16px;">🆕 New Subscriptions (Last 10 Days)</h3><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><tr style="background-color:#f9fafb;"><th style="padding:10px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Doctor</th><th style="padding:10px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Specialty</th><th style="padding:10px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Plan</th><th style="padding:10px;text-align:right;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Joined</th></tr>${recentRows}</table>${recentDoctorsList.length > 10 ? `<p style="color:#6b7280;font-size:12px;margin:10px 0 0;">... and ${recentDoctorsList.length - 10} more</p>` : ''}</td></tr>` : '';

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="650" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><tr><td style="background:linear-gradient(135deg,#14b8a6 0%,#0d9488 100%);padding:30px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">📊 Subscription Report</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">Last 10 Days Summary - ${siteName}</p></td></tr><tr><td style="padding:30px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="padding:10px;"><div style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:20px;border-radius:10px;text-align:center;"><p style="color:rgba(255,255,255,0.8);margin:0;font-size:12px;">TOTAL DOCTORS</p><p style="color:#ffffff;margin:5px 0 0;font-size:28px;font-weight:bold;">${totalDoctors}</p></div></td><td width="50%" style="padding:10px;"><div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:20px;border-radius:10px;text-align:center;"><p style="color:rgba(255,255,255,0.8);margin:0;font-size:12px;">PAID SUBSCRIBERS</p><p style="color:#ffffff;margin:5px 0 0;font-size:28px;font-weight:bold;">${subscribedDoctors}</p></div></td></tr><tr><td width="50%" style="padding:10px;"><div style="background:linear-gradient(135deg,#a855f7 0%,#9333ea 100%);padding:20px;border-radius:10px;text-align:center;"><p style="color:rgba(255,255,255,0.8);margin:0;font-size:12px;">MONTHLY REVENUE</p><p style="color:#ffffff;margin:5px 0 0;font-size:24px;font-weight:bold;">PKR ${monthlyRevenue.toLocaleString()}</p></div></td><td width="50%" style="padding:10px;"><div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:20px;border-radius:10px;text-align:center;"><p style="color:rgba(255,255,255,0.8);margin:0;font-size:12px;">NEW (LAST 10 DAYS)</p><p style="color:#ffffff;margin:5px 0 0;font-size:28px;font-weight:bold;">${newSubscriptions.length}</p></div></td></tr></table></td></tr><tr><td style="padding:0 30px 30px;"><h3 style="color:#374151;margin:0 0 15px;font-size:16px;">📋 Plan Distribution</h3><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><tr style="background-color:#f9fafb;"><th style="padding:12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Plan</th><th style="padding:12px;text-align:center;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Doctors</th><th style="padding:12px;text-align:right;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Monthly Revenue</th></tr>${planRows}</table></td></tr>${recentSection}<tr><td style="padding:0 30px 30px;text-align:center;"><a href="${siteUrl}/admin?tab=subscriptions" style="display:inline-block;background:linear-gradient(135deg,#14b8a6 0%,#0d9488 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px;">View Full Dashboard</a></td></tr><tr><td style="background-color:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">This is an automated report from ${siteName}. Generated on ${new Date().toLocaleDateString('en-PK')}.</p></td></tr></table></td></tr></table></body></html>`;

    const subject = `📊 Subscription Report - ${new Date().toLocaleDateString('en-PK')} | ${siteName}`;

    // Send email via Gmail SMTP
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      logStep("Sending email via Gmail SMTP", { to: adminEmail, from: GMAIL_USER });
      
      try {
        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: {
              username: GMAIL_USER,
              password: GMAIL_APP_PASSWORD,
            },
          },
        });

        await client.send({
          from: GMAIL_USER,
          to: adminEmail,
          subject: subject,
          content: `Subscription Report - ${new Date().toLocaleDateString('en-PK')}`,
          html: htmlContent,
        });

        await client.close();
        logStep("Email sent successfully via Gmail SMTP", { to: adminEmail });
      } catch (emailError) {
        logStep("Gmail SMTP error", { error: emailError instanceof Error ? emailError.message : String(emailError) });
        throw emailError;
      }
    } else {
      logStep("Gmail credentials not configured, skipping email send");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Gmail credentials not configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Log the report
    await supabaseClient.from("email_logs").insert({
      email_type: "subscription_report",
      recipient_email: adminEmail,
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Report sent to ${adminEmail}`,
      metrics: {
        totalDoctors,
        subscribedDoctors,
        monthlyRevenue,
        newSubscriptionsLast10Days: newSubscriptions.length,
      }
    }), {
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
