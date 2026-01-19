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

    // Calculate date range: 3 days before follow-up date
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`Fetching appointments with follow-up date: ${targetDate}`);

    // Fetch appointments with follow-up dates 3 days from now that haven't been reminded
    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select(`
        *,
        doctor:profiles!appointments_doctor_user_id_fkey(name),
        patient:profiles!appointments_patient_user_id_fkey(name)
      `)
      .eq("follow_up_date", targetDate)
      .eq("status", "Completed")
      .eq("follow_up_reminder_sent", false)
      .not("patient_email", "is", null);

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      throw fetchError;
    }

    if (!appointments || appointments.length === 0) {
      console.log("No follow-up reminders to send");
      return new Response(
        JSON.stringify({ success: true, message: "No follow-up reminders to send", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${appointments.length} follow-up reminders to send`);

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
      const followUpDate = new Date(appointment.follow_up_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const subject = `Follow-up Reminder: Your appointment with Dr. ${doctorName} is coming up`;
      
      // Create log entry
      const { data: logEntry } = await supabase
        .from("email_logs")
        .insert({
          appointment_id: appointment.id,
          recipient_email: patientEmail,
          email_type: "follow_up_reminder",
          status: "pending",
          subject: subject,
        })
        .select()
        .single();

      try {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
              .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
              .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }
              .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📅 Follow-up Reminder</h1>
              </div>
              <div class="content">
                <p>Dear ${patientName},</p>
                <p>This is a friendly reminder that you have a scheduled follow-up appointment coming up in <strong>3 days</strong>.</p>
                
                <div class="highlight">
                  <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
                  <p><strong>Follow-up Date:</strong> ${followUpDate}</p>
                  ${appointment.department ? `<p><strong>Department:</strong> ${appointment.department}</p>` : ""}
                </div>
                
                <p>Please make sure to:</p>
                <ul>
                  <li>Book your follow-up appointment if you haven't already</li>
                  <li>Bring any updated lab reports or test results</li>
                  <li>Prepare a list of any new symptoms or concerns</li>
                  <li>Continue taking prescribed medications as directed</li>
                </ul>
                
                <p>If you need to reschedule or have any questions, please contact us.</p>
                
                <p>Best regards,<br>Medical Booking Team</p>
              </div>
              <div class="footer">
                <p>This is an automated reminder. Please do not reply directly to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await client.send({
          from: gmailUser,
          to: patientEmail,
          subject: subject,
          content: `Reminder: Your follow-up appointment with Dr. ${doctorName} is scheduled for ${followUpDate}. Please book your appointment if you haven't already.`,
          html: html,
        });

        // Update log to sent and mark reminder as sent
        if (logEntry) {
          await supabase
            .from("email_logs")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", logEntry.id);
        }

        // Mark follow-up reminder as sent
        await supabase
          .from("appointments")
          .update({ follow_up_reminder_sent: true })
          .eq("id", appointment.id);

        sentCount++;
        console.log(`Follow-up reminder sent to ${patientEmail} for appointment ${appointment.id}`);
      } catch (emailError: any) {
        console.error(`Failed to send follow-up reminder for appointment ${appointment.id}:`, emailError);
        
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

    console.log(`Sent ${sentCount} follow-up reminders, ${errors.length} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} follow-up reminders`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in follow-up reminder cron:", error);
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