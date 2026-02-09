import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      console.error("Gmail credentials not configured");
      throw new Error("Email service not configured");
    }

    // Calculate tomorrow's date range
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.toISOString().split('T')[0];

    console.log(`Fetching appointments for: ${tomorrowStart}`);

    // Fetch appointments scheduled for tomorrow
    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select(`
        *,
        doctor:profiles!appointments_doctor_user_id_fkey(name),
        patient:profiles!appointments_patient_user_id_fkey(name)
      `)
      .eq("appointment_date", tomorrowStart)
      .in("status", ["Upcoming", "Confirmed"])
      .not("patient_email", "is", null);

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      throw fetchError;
    }

    if (!appointments || appointments.length === 0) {
      console.log("No appointments found for tomorrow");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders to send", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${appointments.length} appointments to remind`);

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

    let sentCount = 0;
    const errors: string[] = [];

    for (const appointment of appointments) {
      const patientEmail = appointment.patient_email;
      if (!patientEmail) continue;

      const doctorName = appointment.doctor?.name || "Your Doctor";
      const patientName = appointment.patient?.name || appointment.patient_full_name || "Patient";
      const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const subject = `Reminder: Appointment Tomorrow with Dr. ${doctorName}`;
      
      // Create log entry
      const { data: logEntry } = await supabase
        .from("email_logs")
        .insert({
          appointment_id: appointment.id,
          recipient_email: patientEmail,
          email_type: "reminder",
          status: "pending",
          subject: subject,
        })
        .select()
        .single();

      try {
        const pendingPaymentItem = appointment.payment_method === "Online" && appointment.payment_status === "Pending"
          ? "<li><strong>Complete your pending payment</strong></li>"
          : "";
        const departmentLine = appointment.department ? `<p><strong>Department:</strong> ${appointment.department}</p>` : "";

        const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b,#fbbf24);color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:20px;border:1px solid #e5e7eb}.footer{background:#1f2937;color:#9ca3af;padding:15px;text-align:center;font-size:12px;border-radius:0 0 8px 8px}.highlight{background:#fef3c7;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #f59e0b}.token{font-size:32px;font-weight:bold;color:#d97706}</style></head><body><div class="container"><div class="header"><h1>&#9200; Appointment Reminder</h1></div><div class="content"><p>Dear ${patientName},</p><p>This is a friendly reminder that you have an appointment <strong>tomorrow</strong>.</p><div class="highlight"><p><strong>Doctor:</strong> Dr. ${doctorName}</p><p><strong>Date:</strong> ${appointmentDate}</p><p><strong>Token Number:</strong> <span class="token">#${appointment.token_number}</span></p>${departmentLine}</div><p><strong>Please remember to:</strong></p><ul><li>Arrive 15 minutes before your scheduled time</li><li>Bring your ID and any relevant medical records</li><li>Keep your token number handy</li>${pendingPaymentItem}</ul><p>We look forward to seeing you!</p><p>Best regards,<br>Medical Booking Team</p></div><div class="footer"><p>This is an automated reminder. Please do not reply directly to this email.</p></div></div></body></html>`;

        await client.send({
          from: gmailUser,
          to: patientEmail,
          subject: subject,
          content: `Reminder: You have an appointment tomorrow with Dr. ${doctorName}. Token #${appointment.token_number}`,
          html: html,
        });

        // Update log to sent
        if (logEntry) {
          await supabase
            .from("email_logs")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", logEntry.id);
        }

        sentCount++;
        console.log(`Reminder sent to ${patientEmail} for appointment ${appointment.id}`);
      } catch (emailError: any) {
        console.error(`Failed to send reminder for appointment ${appointment.id}:`, emailError);
        
        // Update log to failed
        if (logEntry) {
          await supabase
            .from("email_logs")
            .update({ status: "failed", error_message: emailError.message })
            .eq("id", logEntry.id);
        }
        
        errors.push(`${appointment.id}: ${emailError.message}`);
      }
    }

    await client.close();

    console.log(`Sent ${sentCount} reminders, ${errors.length} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} reminders`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in reminder cron:", error);
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
