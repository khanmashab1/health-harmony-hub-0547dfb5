import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  appointmentId: string;
  type: "confirmation" | "reminder";
  resend?: boolean;
}

// Helper to compute recipient name with fallback
function getRecipientName(
  profileName?: string | null,
  appointmentName?: string | null,
  email?: string | null
): string {
  if (profileName && profileName.trim()) {
    return profileName.trim();
  }
  if (appointmentName && appointmentName.trim()) {
    return appointmentName.trim();
  }
  if (email) {
    const prefix = email.split("@")[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return "Patient";
}

// Helper to generate plain text from HTML
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Authentication check - verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabaseAuth.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      console.error("Invalid JWT token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claims.claims.sub as string;
    console.log(`Authenticated user: ${userId}`);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has permission (is doctor, PA, or admin)
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || !userProfile) {
      console.error("Could not fetch user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - User not found" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only doctors, PAs, and admins can send notifications
    const allowedRoles = ["doctor", "pa", "admin"];
    if (!allowedRoles.includes(userProfile.role)) {
      console.error(`User role ${userProfile.role} not authorized to send notifications`);
      return new Response(
        JSON.stringify({ error: "Forbidden - Insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      console.error("Gmail credentials not configured");
      throw new Error("Email service not configured");
    }

    const { appointmentId, type, resend }: NotificationRequest = await req.json();

    if (!appointmentId) {
      throw new Error("Missing appointmentId");
    }

    console.log(`Processing ${type} notification for appointment: ${appointmentId}`);

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        *,
        doctor:profiles!appointments_doctor_user_id_fkey(name),
        patient:profiles!appointments_patient_user_id_fkey(name)
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error("Error fetching appointment:", appointmentError);
      throw new Error("Appointment not found");
    }

    // Additional authorization check: user must be related to the appointment
    if (userProfile.role === "doctor" && appointment.doctor_user_id !== userId) {
      // Check if user is a PA for this doctor
      const { data: paAssignment } = await supabase
        .from("pa_assignments")
        .select("id")
        .eq("pa_user_id", userId)
        .eq("doctor_user_id", appointment.doctor_user_id)
        .single();
      
      if (!paAssignment) {
        return new Response(
          JSON.stringify({ error: "Forbidden - Not authorized for this appointment" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else if (userProfile.role === "pa") {
      const { data: paAssignment } = await supabase
        .from("pa_assignments")
        .select("id")
        .eq("pa_user_id", userId)
        .eq("doctor_user_id", appointment.doctor_user_id)
        .single();
      
      if (!paAssignment) {
        return new Response(
          JSON.stringify({ error: "Forbidden - Not assigned to this doctor" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const patientEmail = appointment.patient_email;
    if (!patientEmail) {
      console.log("No patient email found, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No email to send to" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const doctorName = appointment.doctor?.name || "Your Doctor";
    // Use proper fallback chain for patient name
    const patientName = getRecipientName(
      appointment.patient?.name,
      appointment.patient_full_name,
      patientEmail
    );
    
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const isConfirmation = type === "confirmation";
    const subject = isConfirmation
      ? `Appointment Confirmation - Token #${appointment.token_number}`
      : `Appointment Reminder - Tomorrow with Dr. ${doctorName}`;

    // Clean HTML template - minified to prevent Quoted-Printable =20 artifacts
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#333333;background-color:#f5f5f5;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f5;"><tr><td style="padding:20px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#ffffff;padding:30px 40px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="margin:0;font-size:24px;font-weight:bold;">${isConfirmation ? "Appointment Confirmed!" : "Appointment Reminder"}</h1></td></tr><tr><td style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;"><p style="margin:0 0 16px 0;font-size:16px;">Dear ${patientName},</p><p style="margin:0 0 24px 0;font-size:16px;">${isConfirmation ? "Your appointment has been successfully booked. Please find the details below:" : "This is a friendly reminder about your upcoming appointment:"}</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#d1fae5;border-radius:8px;margin-bottom:24px;"><tr><td style="padding:20px;"><p style="margin:0 0 8px 0;font-size:14px;"><strong>Doctor:</strong> Dr. ${doctorName}</p><p style="margin:0 0 8px 0;font-size:14px;"><strong>Date:</strong> ${appointmentDate}</p><p style="margin:0 0 8px 0;font-size:14px;"><strong>Token Number:</strong> <span style="font-size:28px;font-weight:bold;color:#0d9488;">#${appointment.token_number}</span></p>${appointment.department ? `<p style="margin:0;font-size:14px;"><strong>Department:</strong> ${appointment.department}</p>` : ""}</td></tr></table><p style="margin:0 0 12px 0;font-size:16px;font-weight:bold;">Important:</p><ul style="margin:0 0 24px 0;padding-left:20px;"><li style="margin-bottom:8px;">Please arrive 15 minutes before your scheduled time</li><li style="margin-bottom:8px;">Bring your ID and any relevant medical records</li><li style="margin-bottom:0;">Keep your token number handy</li></ul><p style="margin:0 0 16px 0;font-size:16px;">If you need to reschedule or cancel, please contact us as soon as possible.</p><p style="margin:0;font-size:16px;">Best regards,<br>Medical Booking Team</p></td></tr><tr><td style="background-color:#1f2937;color:#9ca3af;padding:20px 40px;text-align:center;font-size:12px;border-radius:0 0 8px 8px;"><p style="margin:0;">This is an automated message. Please do not reply directly to this email.</p></td></tr></table></td></tr></table></body></html>`;

    // Generate plain text version
    const plainText = `${isConfirmation ? "Appointment Confirmed!" : "Appointment Reminder"}

Dear ${patientName},

${isConfirmation ? "Your appointment has been successfully booked. Please find the details below:" : "This is a friendly reminder about your upcoming appointment:"}

Doctor: Dr. ${doctorName}
Date: ${appointmentDate}
Token Number: #${appointment.token_number}
${appointment.department ? `Department: ${appointment.department}` : ""}

Important:
- Please arrive 15 minutes before your scheduled time
- Bring your ID and any relevant medical records
- Keep your token number handy

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
Medical Booking Team

---
This is an automated message. Please do not reply directly to this email.`;

    // Create email log entry
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .insert({
        appointment_id: appointmentId,
        recipient_email: patientEmail,
        email_type: type,
        status: "pending",
        subject: subject,
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating log entry:", logError);
    }

    try {
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: gmailUser,
            password: gmailAppPassword,
          },
        },
      });

      await client.send({
        from: gmailUser,
        to: patientEmail,
        subject: subject,
        content: plainText,
        html: html,
      });

      await client.close();

      // Update log entry to sent
      if (logEntry) {
        await supabase
          .from("email_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", logEntry.id);
      }

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        action: "email_sent",
        entity_type: "appointments",
        entity_id: appointmentId,
        user_id: userId,
        details: { to: patientEmail, subject, type },
      });

      console.log(`${type} email sent successfully to ${patientEmail}`);

      return new Response(
        JSON.stringify({ success: true, message: `${type} email sent successfully` }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError: any) {
      console.error("SMTP error:", emailError);

      // Update log entry to failed
      if (logEntry) {
        await supabase
          .from("email_logs")
          .update({ status: "failed", error_message: emailError.message })
          .eq("id", logEntry.id);
      }

      // Log failure to audit_logs
      await supabase.from("audit_logs").insert({
        action: "email_failed",
        entity_type: "appointments",
        entity_id: appointmentId,
        user_id: userId,
        details: { to: patientEmail, subject, error: emailError.message },
      });

      throw emailError;
    }
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
