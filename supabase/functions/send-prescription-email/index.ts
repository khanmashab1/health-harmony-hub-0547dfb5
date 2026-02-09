import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrescriptionEmailRequest {
  appointmentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseKey;

    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Authenticated user: ${user.id}`);
    }
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Email service not configured");
    }

    const { appointmentId }: PrescriptionEmailRequest = await req.json();

    if (!appointmentId) {
      throw new Error("Missing appointment ID");
    }

    // Fetch appointment data
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (aptError || !appointment) {
      throw new Error("Appointment not found");
    }

    if (!appointment.patient_email) {
      throw new Error("No patient email found");
    }

    // Fetch doctor info
    const { data: doctor } = await supabase
      .from("doctors")
      .select("specialty, degree, qualifications, city, province")
      .eq("user_id", appointment.doctor_user_id)
      .single();

    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", appointment.doctor_user_id)
      .single();

    // Fetch patient profile for age/gender
    let patientAge = "";
    let patientGender = "";
    if (appointment.patient_user_id) {
      const { data: patientProfile } = await supabase
        .from("profiles")
        .select("age, gender")
        .eq("id", appointment.patient_user_id)
        .single();
      if (patientProfile) {
        patientAge = patientProfile.age ? `${patientProfile.age} years` : "";
        patientGender = patientProfile.gender || "";
      }
    }

    // Fetch site name
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "site_name")
      .single();

    const siteName = siteSettings?.setting_value || "MediCare+";
    const doctorName = doctorProfile?.name || "Doctor";
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Fetch custom domain URL from site_settings
    const { data: siteUrlSetting } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "site_url")
      .single();

    // Use custom domain if configured, otherwise fall back to preview URL
    let baseUrl = siteUrlSetting?.setting_value;
    if (!baseUrl) {
      const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
      baseUrl = `https://id-preview--${projectId}.lovable.app`;
    }
    // Ensure no trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    const prescriptionUrl = `${baseUrl}/verify/${appointmentId}`;
    const downloadUrl = `${baseUrl}/prescription/${appointmentId}`;

    // Parse medicines
    let medicinesHtml = "";
    try {
      const medicines = JSON.parse(appointment.medicines || "[]");
      if (Array.isArray(medicines) && medicines.length > 0) {
        medicinesHtml = medicines.map((med: any, idx: number) => 
          `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>${med.name || ''}</strong>${med.instructions ? `<br><small>${med.instructions}</small>` : ''}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${med.dosage || '-'}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${med.frequency || '-'}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${med.duration || '-'}</td></tr>`
        ).join('');
      } else {
        medicinesHtml = `<tr><td colspan="5" style="padding:16px;text-align:center;">${appointment.medicines || 'No medicines prescribed'}</td></tr>`;
      }
    } catch {
      medicinesHtml = `<tr><td colspan="5" style="padding:16px;text-align:center;">${appointment.medicines || 'No medicines prescribed'}</td></tr>`;
    }

    const subject = `Prescription from Dr. ${doctorName} - ${appointmentDate}`;

    // Build clean minified HTML email to prevent =20 quoted-printable encoding artifacts
    const diagnosisBlock = appointment.diagnosis ? `<div style="margin-bottom:20px;"><h4 style="margin:0 0 8px;color:#1f2937;font-size:15px;">Diagnosis</h4><p style="margin:0;color:#4b5563;font-size:14px;">${appointment.diagnosis}</p></div>` : '';
    const labTestsBlock = appointment.lab_tests ? `<div style="margin-bottom:20px;"><h4 style="margin:0 0 8px;color:#1f2937;font-size:15px;">Recommended Lab Tests</h4><p style="margin:0;color:#4b5563;font-size:14px;">${appointment.lab_tests}</p></div>` : '';
    const doctorNotesBlock = (appointment.doctor_comments && !appointment.doctor_comments.startsWith("Payment")) ? `<div style="margin-bottom:20px;"><h4 style="margin:0 0 8px;color:#1f2937;font-size:15px;">Doctor's Notes</h4><p style="margin:0;color:#4b5563;font-size:14px;">${appointment.doctor_comments}</p></div>` : '';
    const cityBlock = doctor?.city ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${doctor.city}${doctor?.province ? ', ' + doctor.province : ''}</p>` : '';
    const ageBlock = patientAge ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Age: ${patientAge}</p>` : '';
    const genderBlock = patientGender ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Gender: ${patientGender}</p>` : '';

    const html = [
      `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml">`,
      `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Medical Prescription</title></head>`,
      `<body style="font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;background-color:#f5f5f5;color:#333333;line-height:1.6;">`,
      `<div style="max-width:600px;margin:0 auto;padding:20px;">`,
      `<div style="background-color:#0EA5E9;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;text-align:center;">`,
      `<h1 style="margin:0;font-size:22px;font-weight:bold;">${siteName}</h1>`,
      `<p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Medical Prescription</p></div>`,
      `<div style="background-color:#ffffff;padding:24px;border:1px solid #e5e7eb;">`,
      `<div style="margin-bottom:20px;">`,
      `<h3 style="margin:0 0 4px;color:#1f2937;font-size:18px;">Dr. ${doctorName}</h3>`,
      `<p style="margin:0;color:#6b7280;font-size:14px;">${doctor?.specialty || ''} ${doctor?.degree ? '| ' + doctor.degree : ''}</p>`,
      cityBlock,
      `<p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>Date:</strong> ${appointmentDate}</p>`,
      `<p style="margin:4px 0 0;font-size:14px;color:#374151;"><strong>Token:</strong> #${appointment.token_number}</p></div>`,
      `<div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin-bottom:20px;">`,
      `<h4 style="margin:0 0 8px;color:#1f2937;font-size:15px;">Patient Information</h4>`,
      `<p style="margin:0;font-size:14px;color:#374151;"><strong>${appointment.patient_full_name}</strong></p>`,
      ageBlock, genderBlock, `</div>`,
      diagnosisBlock,
      `<div style="margin-bottom:20px;">`,
      `<h4 style="margin:0 0 10px;color:#1f2937;font-size:15px;">Prescribed Medications</h4>`,
      `<table style="width:100%;border-collapse:collapse;background-color:#ffffff;border:1px solid #e5e7eb;">`,
      `<thead><tr style="background-color:#f3f4f6;">`,
      `<th style="padding:10px;text-align:left;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">#</th>`,
      `<th style="padding:10px;text-align:left;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">Medicine</th>`,
      `<th style="padding:10px;text-align:left;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">Dosage</th>`,
      `<th style="padding:10px;text-align:left;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">Frequency</th>`,
      `<th style="padding:10px;text-align:left;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">Duration</th>`,
      `</tr></thead><tbody>${medicinesHtml}</tbody></table></div>`,
      labTestsBlock, doctorNotesBlock,
      `<div style="background-color:#f0fdf4;padding:16px;border-radius:8px;text-align:center;margin-bottom:20px;border:1px solid #bbf7d0;">`,
      `<p style="margin:0 0 12px;font-size:14px;color:#166534;"><strong>Download Your Prescription</strong></p>`,
      `<a href="${downloadUrl}" style="display:inline-block;background-color:#16a34a;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">View and Print PDF</a></div>`,
      `<div style="background-color:#f0f9ff;padding:16px;border-radius:8px;border:1px solid #bae6fd;">`,
      `<p style="margin:0 0 8px;font-size:14px;color:#1e40af;"><strong>Verify Prescription Authenticity</strong></p>`,
      `<p style="margin:0;font-size:12px;color:#6b7280;">Scan the QR code on the printed prescription or visit:</p>`,
      `<a href="${prescriptionUrl}" style="font-size:12px;color:#0EA5E9;word-break:break-all;">${prescriptionUrl}</a></div></div>`,
      `<div style="background-color:#f9fafb;padding:16px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;text-align:center;">`,
      `<p style="margin:0;font-size:12px;color:#6b7280;">This prescription is valid for 30 days from the date of issue.</p>`,
      `<p style="margin:6px 0 0;font-size:12px;color:#6b7280;">For emergencies, please contact your healthcare provider immediately.</p>`,
      `<p style="margin:10px 0 0;font-size:11px;color:#9ca3af;">You are receiving this email because you had a consultation with Dr. ${doctorName} on ${appointmentDate}.</p>`,
      `<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">${siteName} | Healthcare Management Platform</p>`,
      `</div></div></body></html>`,
    ].join('');

    const plainText = `${siteName} - Medical Prescription

Doctor: Dr. ${doctorName} - ${doctor?.specialty || ''}
Date: ${appointmentDate}
Token: #${appointment.token_number}

Patient: ${appointment.patient_full_name}
${patientAge ? `Age: ${patientAge}\n` : ''}${patientGender ? `Gender: ${patientGender}\n` : ''}
${appointment.diagnosis ? `Diagnosis: ${appointment.diagnosis}\n\n` : ''}${appointment.medicines ? `Medicines: ${appointment.medicines}\n\n` : ''}${appointment.lab_tests ? `Lab Tests: ${appointment.lab_tests}\n\n` : ''}View and Print Prescription: ${downloadUrl}
Verify Authenticity: ${prescriptionUrl}

This prescription is valid for 30 days from the date of issue.
For emergencies, please contact your healthcare provider immediately.

You are receiving this email because you had a consultation with Dr. ${doctorName} on ${appointmentDate}.
${siteName} | Healthcare Management Platform`;

    const senderName = `${siteName} Prescriptions`;

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
      from: `${senderName} <${gmailUser}>`,
      to: appointment.patient_email,
      subject: subject,
      content: plainText,
      html: html,
      headers: {
        "List-Unsubscribe": `<mailto:${gmailUser}?subject=unsubscribe>`,
        "Precedence": "bulk",
        "X-Mailer": siteName,
      },
    });

    await client.close();

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: appointment.patient_email,
      email_type: "prescription",
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      appointment_id: appointmentId,
    });

    console.log(`Prescription email sent to ${appointment.patient_email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Prescription email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending prescription email:", error);

    // Log failed email if we have appointment info
    try {
      const { appointmentId } = await req.clone().json();
      if (appointmentId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("email_logs").insert({
          email_type: "prescription",
          status: "failed",
          error_message: error.message,
          appointment_id: appointmentId,
          recipient_email: "unknown",
        });
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
