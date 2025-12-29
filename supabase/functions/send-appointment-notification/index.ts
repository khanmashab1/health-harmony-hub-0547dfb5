import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  appointmentId: string;
  type: "confirmation" | "reminder";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!gmailUser || !gmailAppPassword) {
      console.error("Gmail credentials not configured");
      throw new Error("Email service not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { appointmentId, type }: NotificationRequest = await req.json();

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

    const patientEmail = appointment.patient_email;
    if (!patientEmail) {
      console.log("No patient email found, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No email to send to" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const doctorName = appointment.doctor?.name || "Your Doctor";
    const patientName = appointment.patient?.name || appointment.patient_full_name || "Patient";
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .highlight { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .token { font-size: 32px; font-weight: bold; color: #0d9488; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isConfirmation ? "Appointment Confirmed!" : "Appointment Reminder"}</h1>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>${isConfirmation 
              ? "Your appointment has been successfully booked. Please find the details below:" 
              : "This is a friendly reminder about your upcoming appointment:"}</p>
            
            <div class="highlight">
              <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
              <p><strong>Date:</strong> ${appointmentDate}</p>
              <p><strong>Token Number:</strong> <span class="token">#${appointment.token_number}</span></p>
              ${appointment.department ? `<p><strong>Department:</strong> ${appointment.department}</p>` : ""}
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>Please arrive 15 minutes before your scheduled time</li>
              <li>Bring your ID and any relevant medical records</li>
              <li>Keep your token number handy</li>
            </ul>
            
            <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
            
            <p>Best regards,<br>Medical Booking Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

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
      content: `${isConfirmation ? "Appointment Confirmation" : "Appointment Reminder"} - Token #${appointment.token_number} with Dr. ${doctorName} on ${appointmentDate}`,
      html: html,
    });

    await client.close();

    console.log(`${type} email sent successfully to ${patientEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: `${type} email sent successfully` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
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
