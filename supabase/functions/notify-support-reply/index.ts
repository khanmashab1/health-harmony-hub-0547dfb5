import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ticket_id, sender_role } = await req.json();
    if (!ticket_id || !sender_role) throw new Error("Missing ticket_id or sender_role");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load ticket
    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets").select("*").eq("id", ticket_id).single();
    if (tErr || !ticket) throw new Error("Ticket not found");

    // Load doctor profile (for email)
    const { data: doctorProfile } = await supabase
      .from("profiles").select("name").eq("id", ticket.doctor_user_id).single();
    const { data: doctorAuth } = await supabase.auth.admin.getUserById(ticket.doctor_user_id);
    const doctorEmail = doctorAuth?.user?.email;
    const doctorName = doctorProfile?.name ?? "Doctor";

    // Determine recipient
    let recipientEmail: string | null = null;
    let recipientName = "";
    let intro = "";

    if (sender_role === "admin") {
      // Admin replied → notify doctor
      recipientEmail = doctorEmail ?? null;
      recipientName = doctorName;
      intro = `An admin replied to your support ticket: <b>${ticket.subject}</b>`;
    } else {
      // Doctor / org_owner sent → notify admin(s)
      const { data: setting } = await supabase
        .from("site_settings").select("setting_value").eq("setting_key", "admin_email").maybeSingle();
      recipientEmail = setting?.setting_value ?? Deno.env.get("GMAIL_USER") ?? null;
      recipientName = "Admin";
      intro = `${doctorName} sent a new message on ticket: <b>${ticket.subject}</b>`;
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "No recipient email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;">
        <div style="background:#0066cc;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">Support Ticket Update</h2>
        </div>
        <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin-top:0;">Dear ${recipientName},</p>
          <p>${intro}</p>
          <p style="margin:16px 0;padding:12px;background:#fff;border-left:3px solid #0066cc;border-radius:4px;">
            <b>Status:</b> ${ticket.status.replace("_", " ")}<br>
            <b>Priority:</b> ${ticket.priority}<br>
            <b>Category:</b> ${ticket.category}
          </p>
          <p>Sign in to your dashboard to read the message and reply.</p>
          <p style="font-size:12px;color:#6b7280;margin-top:24px;">— MediCare+ Support</p>
        </div>
      </div>`;

    // Invoke send-email with service role
    const sendRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: `[Support] ${ticket.subject}`,
        html,
        recipientName,
      }),
    });

    const result = await sendRes.json().catch(() => ({}));
    return new Response(JSON.stringify({ success: sendRes.ok, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("notify-support-reply error:", e);
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
