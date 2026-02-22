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

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`;
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - Generating comprehensive platform report");

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
    const adminEmail = "khanmashab1@gmail.com";

    // Calculate date ranges
    const now = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all data in parallel
    const [doctorsRes, plansRes, profilesRes, appointmentsRes, aiCreditsRes, aiPurchasesRes, aiPlansRes, reviewsRes] = await Promise.all([
      supabaseClient.from("doctors").select("user_id, specialty, fee, created_at, selected_plan_id, city, organization_id").order("created_at", { ascending: false }),
      supabaseClient.from("doctor_payment_plans").select("id, name, price, billing_period, is_active"),
      supabaseClient.from("profiles").select("id, name, phone, status, role, created_at"),
      supabaseClient.from("appointments").select("id, status, appointment_date, payment_method, payment_status, created_at").gte("created_at", tenDaysAgo.toISOString()),
      supabaseClient.from("patient_ai_credits").select("user_id, total_credits, used_credits"),
      supabaseClient.from("patient_ai_purchases").select("id, user_id, credits_purchased, amount_paid, status, created_at, plan_id").eq("status", "completed").order("created_at", { ascending: false }),
      supabaseClient.from("patient_ai_plans").select("id, name, price, credits, is_active"),
      supabaseClient.from("reviews").select("id, rating, created_at").gte("created_at", tenDaysAgo.toISOString()),
    ]);

    const doctors = doctorsRes.data || [];
    const plans = plansRes.data || [];
    const profiles = profilesRes.data || [];
    const recentAppointments = appointmentsRes.data || [];
    const aiCredits = aiCreditsRes.data || [];
    const aiPurchases = aiPurchasesRes.data || [];
    const aiPlans = aiPlansRes.data || [];
    const recentReviews = reviewsRes.data || [];

    // ── DOCTOR SUBSCRIPTION METRICS ──
    const totalDoctors = doctors.length;
    const subscribedDoctors = doctors.filter(d => {
      const plan = plans.find(p => p.id === d.selected_plan_id);
      return plan && plan.price > 0;
    }).length;
    const freeDoctors = totalDoctors - subscribedDoctors;

    const newDoctorsLast10Days = doctors.filter(d => new Date(d.created_at) >= tenDaysAgo);

    const monthlyRevenue = doctors.reduce((sum, d) => {
      const plan = plans.find(p => p.id === d.selected_plan_id);
      if (!plan || plan.price === 0) return sum;
      return sum + (plan.billing_period === "yearly" ? plan.price / 12 : plan.price);
    }, 0);

    const yearlyRevenue = monthlyRevenue * 12;

    // Plan distribution - ALL plans
    const planDistribution = plans.map(plan => {
      const count = doctors.filter(d => d.selected_plan_id === plan.id).length;
      const monthlyRev = count * (plan.billing_period === "yearly" ? plan.price / 12 : plan.price);
      return { name: plan.name, price: plan.price, period: plan.billing_period, count, revenue: monthlyRev };
    });
    planDistribution.push({ name: "Free / No Plan", price: 0, period: "-", count: freeDoctors, revenue: 0 });

    // Detailed subscriber list (ALL paid subscribers)
    const allSubscribers = doctors
      .filter(d => {
        const plan = plans.find(p => p.id === d.selected_plan_id);
        return plan && plan.price > 0;
      })
      .map(d => {
        const profile = profiles.find(p => p.id === d.user_id);
        const plan = plans.find(p => p.id === d.selected_plan_id);
        return {
          name: profile?.name || "Unknown",
          phone: profile?.phone || "-",
          specialty: d.specialty,
          city: d.city || "-",
          plan: plan?.name || "Unknown",
          price: `${formatCurrency(plan?.price || 0)}/${plan?.billing_period === "yearly" ? "yr" : "mo"}`,
          joined: formatDate(d.created_at),
          isNew: new Date(d.created_at) >= tenDaysAgo,
        };
      });

    // ── AI CREDITS SYSTEM METRICS ──
    const totalAIPurchases = aiPurchases.length;
    const totalAIRevenue = aiPurchases.reduce((sum, p) => sum + p.amount_paid, 0);
    const recentAIPurchases = aiPurchases.filter(p => new Date(p.created_at) >= tenDaysAgo);
    const recentAIRevenue = recentAIPurchases.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalCreditsUsed = aiCredits.reduce((sum, c) => sum + c.used_credits, 0);
    const totalCreditsPurchased = aiCredits.reduce((sum, c) => sum + c.total_credits, 0);
    const activeAIUsers = aiCredits.filter(c => c.total_credits > 0).length;

    // AI plan distribution
    const aiPlanDistribution = aiPlans.map(plan => {
      const purchases = aiPurchases.filter(p => p.plan_id === plan.id);
      return {
        name: plan.name,
        price: plan.price,
        credits: plan.credits,
        purchases: purchases.length,
        revenue: purchases.reduce((s, p) => s + p.amount_paid, 0),
      };
    });

    // Recent AI purchasers list
    const recentAIPurchasersList = recentAIPurchases.slice(0, 10).map(p => {
      const profile = profiles.find(pr => pr.id === p.user_id);
      const plan = aiPlans.find(pl => pl.id === p.plan_id);
      return {
        name: profile?.name || "Unknown",
        plan: plan?.name || "Unknown",
        credits: p.credits_purchased,
        amount: formatCurrency(p.amount_paid),
        date: formatDate(p.created_at),
      };
    });

    // ── APPOINTMENT METRICS ──
    const totalRecentAppointments = recentAppointments.length;
    const completedAppointments = recentAppointments.filter(a => a.status === "completed").length;
    const cancelledAppointments = recentAppointments.filter(a => a.status === "cancelled").length;
    const pendingAppointments = recentAppointments.filter(a => a.status === "pending").length;
    const cashPayments = recentAppointments.filter(a => a.payment_method === "cash").length;
    const onlinePayments = recentAppointments.filter(a => a.payment_method === "online").length;

    // ── USER METRICS ──
    const totalPatients = profiles.filter(p => p.role === "patient").length;
    const totalPAs = profiles.filter(p => p.role === "pa").length;
    const newPatientsLast10Days = profiles.filter(p => p.role === "patient" && new Date(p.created_at) >= tenDaysAgo).length;

    // ── REVIEW METRICS ──
    const avgRating = recentReviews.length > 0 ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1) : "N/A";

    logStep("Report data compiled", { totalDoctors, subscribedDoctors, monthlyRevenue, totalAIRevenue, totalRecentAppointments });

    // ── BUILD EMAIL HTML ──
    const statCard = (label: string, value: string | number, color: string) =>
      `<td width="50%" style="padding:8px;"><div style="background:${color};padding:18px 15px;border-radius:10px;text-align:center;"><p style="color:rgba(255,255,255,0.85);margin:0;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">${label}</p><p style="color:#ffffff;margin:5px 0 0;font-size:24px;font-weight:bold;">${value}</p></div></td>`;

    const tableHeader = (cols: string[]) =>
      `<tr style="background-color:#f9fafb;">${cols.map(c => `<th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.5px;">${c}</th>`).join('')}</tr>`;

    const sectionTitle = (emoji: string, title: string) =>
      `<tr><td style="padding:25px 30px 12px;"><h3 style="color:#1f2937;margin:0;font-size:17px;font-weight:600;">${emoji} ${title}</h3></td></tr>`;

    // Plan distribution rows
    const planRows = planDistribution.map(p =>
      `<tr><td style="padding:10px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${p.name}</td><td style="padding:10px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${p.price > 0 ? formatCurrency(p.price) + '/' + (p.period === 'yearly' ? 'yr' : 'mo') : 'Free'}</td><td style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #f3f4f6;">${p.count}</td><td style="padding:10px 12px;text-align:right;font-size:13px;color:#059669;font-weight:600;border-bottom:1px solid #f3f4f6;">${formatCurrency(p.revenue)}/mo</td></tr>`
    ).join('');

    // All subscribers rows
    const subscriberRows = allSubscribers.map(d =>
      `<tr><td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${d.name}${d.isNew ? ' <span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:10px;font-size:10px;">NEW</span>' : ''}</td><td style="padding:9px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${d.specialty}</td><td style="padding:9px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${d.city}</td><td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${d.plan}</td><td style="padding:9px 12px;font-size:12px;color:#059669;text-align:right;border-bottom:1px solid #f3f4f6;">${d.price}</td><td style="padding:9px 12px;font-size:12px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">${d.joined}</td></tr>`
    ).join('');

    // AI plan distribution rows
    const aiPlanRows = aiPlanDistribution.map(p =>
      `<tr><td style="padding:10px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${p.name}</td><td style="padding:10px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${formatCurrency(p.price)}</td><td style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${p.credits} credits</td><td style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #f3f4f6;">${p.purchases}</td><td style="padding:10px 12px;text-align:right;font-size:13px;color:#7c3aed;font-weight:600;border-bottom:1px solid #f3f4f6;">${formatCurrency(p.revenue)}</td></tr>`
    ).join('');

    // Recent AI purchases rows
    const aiPurchaseRows = recentAIPurchasersList.map(p =>
      `<tr><td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${p.name}</td><td style="padding:9px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${p.plan}</td><td style="padding:9px 12px;font-size:12px;text-align:center;color:#374151;border-bottom:1px solid #f3f4f6;">${p.credits}</td><td style="padding:9px 12px;font-size:12px;color:#7c3aed;text-align:right;border-bottom:1px solid #f3f4f6;">${p.amount}</td><td style="padding:9px 12px;font-size:12px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">${p.date}</td></tr>`
    ).join('');

    const reportDate = `${now.getDate()} ${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
    const reportTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="700" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><!-- Header --><tr><td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 50%,#2dd4bf 100%);padding:35px 30px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">📊 Platform Analytics Report</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">${siteName} — ${reportDate} at ${reportTime}</p><p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:12px;">Auto-generated every 10 days • Reporting period: Last 10 days</p></td></tr><!-- ═══ SECTION 1: OVERVIEW ═══ -->${sectionTitle("📈", "Platform Overview")}<tr><td style="padding:0 22px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>${statCard("Total Doctors", totalDoctors, "linear-gradient(135deg,#3b82f6,#2563eb)")}${statCard("Paid Subscribers", subscribedDoctors, "linear-gradient(135deg,#22c55e,#16a34a)")}</tr><tr>${statCard("Monthly Revenue", formatCurrency(monthlyRevenue), "linear-gradient(135deg,#a855f7,#7c3aed)")}${statCard("Yearly Projection", formatCurrency(yearlyRevenue), "linear-gradient(135deg,#f59e0b,#d97706)")}</tr><tr>${statCard("Total Patients", totalPatients, "linear-gradient(135deg,#06b6d4,#0891b2)")}${statCard("New Doctors (10d)", newDoctorsLast10Days.length, "linear-gradient(135deg,#ec4899,#db2777)")}</tr></table></td></tr><!-- ═══ SECTION 2: PLAN DISTRIBUTION ═══ -->${sectionTitle("📋", "Doctor Subscription Plans — All Plans")}<tr><td style="padding:0 30px 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">${tableHeader(["Plan", "Price", "Doctors", "Monthly Revenue"])}${planRows}<tr style="background-color:#f0fdf4;"><td colspan="2" style="padding:12px;font-size:13px;font-weight:700;color:#166534;">TOTAL</td><td style="padding:12px;text-align:center;font-size:13px;font-weight:700;color:#166534;">${totalDoctors}</td><td style="padding:12px;text-align:right;font-size:13px;font-weight:700;color:#166534;">${formatCurrency(monthlyRevenue)}/mo</td></tr></table></td></tr><!-- ═══ SECTION 3: ALL PAID SUBSCRIBERS ═══ -->${allSubscribers.length > 0 ? `${sectionTitle("👨‍⚕️", `All Paid Subscribers (${allSubscribers.length})`)}<tr><td style="padding:0 30px 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">${tableHeader(["Doctor", "Specialty", "City", "Plan", "Price", "Joined"])}${subscriberRows}</table></td></tr>` : ''}<!-- ═══ SECTION 4: AI CREDITS SYSTEM ═══ -->${sectionTitle("🤖", "AI Credits System — Revenue & Usage")}<tr><td style="padding:0 22px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>${statCard("Total AI Revenue", formatCurrency(totalAIRevenue), "linear-gradient(135deg,#8b5cf6,#6d28d9)")}${statCard("Revenue (10d)", formatCurrency(recentAIRevenue), "linear-gradient(135deg,#c084fc,#a855f7)")}</tr><tr>${statCard("Active AI Users", activeAIUsers, "linear-gradient(135deg,#14b8a6,#0d9488)")}${statCard("Credits Used", totalCreditsUsed.toLocaleString(), "linear-gradient(135deg,#f97316,#ea580c)")}</tr></table></td></tr>${aiPlanDistribution.length > 0 ? `<tr><td style="padding:15px 30px 5px;"><p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0;">AI Credit Plan Breakdown</p></td></tr><tr><td style="padding:0 30px 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">${tableHeader(["Plan", "Price", "Credits", "Purchases", "Revenue"])}${aiPlanRows}</table></td></tr>` : ''}${recentAIPurchasersList.length > 0 ? `<tr><td style="padding:5px 30px 5px;"><p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0;">Recent AI Credit Purchases (Last 10 Days)</p></td></tr><tr><td style="padding:0 30px 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">${tableHeader(["Patient", "Plan", "Credits", "Amount", "Date"])}${aiPurchaseRows}</table></td></tr>` : ''}<!-- ═══ SECTION 5: APPOINTMENTS ═══ -->${sectionTitle("📅", "Appointment Activity (Last 10 Days)")}<tr><td style="padding:0 22px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>${statCard("Total Bookings", totalRecentAppointments, "linear-gradient(135deg,#3b82f6,#1d4ed8)")}${statCard("Completed", completedAppointments, "linear-gradient(135deg,#22c55e,#15803d)")}</tr><tr>${statCard("Cancelled", cancelledAppointments, "linear-gradient(135deg,#ef4444,#dc2626)")}${statCard("Pending", pendingAppointments, "linear-gradient(135deg,#f59e0b,#b45309)")}</tr></table></td></tr><tr><td style="padding:10px 30px 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:10px 15px;background:#f0f9ff;border-radius:8px;"><p style="margin:0;font-size:13px;color:#1e40af;">💳 Payment Split: <strong>${onlinePayments}</strong> Online · <strong>${cashPayments}</strong> Cash</p></td></tr></table></td></tr><!-- ═══ SECTION 6: USERS & REVIEWS ═══ -->${sectionTitle("👥", "Users & Satisfaction")}<tr><td style="padding:0 22px 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>${statCard("New Patients (10d)", newPatientsLast10Days, "linear-gradient(135deg,#06b6d4,#0e7490)")}${statCard("Physician Assistants", totalPAs, "linear-gradient(135deg,#64748b,#475569)")}</tr><tr>${statCard("New Reviews (10d)", recentReviews.length, "linear-gradient(135deg,#eab308,#ca8a04)")}${statCard("Avg Rating", avgRating, "linear-gradient(135deg,#f97316,#c2410c)")}</tr></table></td></tr><!-- CTA --><tr><td style="padding:10px 30px 30px;text-align:center;"><a href="${siteUrl}/admin?tab=subscriptions" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:600;font-size:14px;box-shadow:0 4px 12px rgba(20,184,166,0.3);">Open Admin Dashboard →</a></td></tr><!-- Footer --><tr><td style="background-color:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#9ca3af;font-size:11px;margin:0;">This is an automated report from <strong>${siteName}</strong>. Generated on ${reportDate} at ${reportTime}.</p><p style="color:#9ca3af;font-size:11px;margin:6px 0 0;">Reports are sent every 10 days. To change the recipient, update the admin email in Site Settings.</p></td></tr></table></td></tr></table></body></html>`;

    const subject = `📊 ${siteName} — Platform Report | ${reportDate}`;

    // Send email via Gmail SMTP
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      logStep("Sending email via Gmail SMTP", { to: adminEmail, from: GMAIL_USER });

      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
        },
      });

      await client.send({
        from: GMAIL_USER,
        to: adminEmail,
        subject: subject,
        content: `Platform Report - ${reportDate}`,
        html: htmlContent,
      });

      await client.close();
      logStep("Email sent successfully", { to: adminEmail });
    } else {
      logStep("Gmail credentials not configured");
      return new Response(JSON.stringify({ success: false, message: "Gmail credentials not configured" }), {
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
      message: `Comprehensive report sent to ${adminEmail}`,
      metrics: { totalDoctors, subscribedDoctors, monthlyRevenue, yearlyRevenue, totalAIRevenue, totalRecentAppointments, activeAIUsers },
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
