import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeRequest {
  userId: string;
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, name }: WelcomeRequest = await req.json();

    if (!email || !userId) {
      throw new Error("Email and userId are required");
    }

    console.log(`Sending welcome email to: ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if welcome email was already sent
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_login_welcomed")
      .eq("id", userId)
      .single();

    if (profile?.first_login_welcomed) {
      console.log("Welcome email already sent, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Already welcomed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send welcome email
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Email service not configured");
    }

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

    const displayName = name || email.split('@')[0];

    await client.send({
      from: gmailUser,
      to: email,
      subject: "Welcome to MediCare+ - Your Health Journey Begins!",
      content: `Welcome to MediCare+, ${displayName}! Your account is now verified and you can book appointments with top doctors.`,
       html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #16a34a 0%, #0d9488 100%); border-radius: 16px; margin-bottom: 15px;"></div><h1 style="color: #16a34a; margin: 0;">Welcome to MediCare+</h1><p style="color: #666; margin-top: 5px;">Your Health, Our Priority</p></div><div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;"><h2 style="margin-top: 0; color: #166534;">Hello ${displayName}! 🎉</h2><p>Congratulations! Your email has been verified and your MediCare+ account is now fully activated.</p><p><strong>What you can do now:</strong></p><ul style="padding-left: 20px;"><li>📅 Book appointments with verified doctors</li><li>📊 Track your health metrics over time</li><li>💊 Access your prescriptions and medical records</li><li>🔍 Get instant AI-powered symptom analysis</li></ul><div style="text-align: center; margin: 30px 0;"><a href="https://medicare-nine-wine.vercel.app/booking" style="background: linear-gradient(135deg, #16a34a 0%, #0d9488 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Start Booking</a></div></div><div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;"><p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Need help?</strong> If you have any questions or need assistance, our support team is here to help.</p></div><div style="text-align: center; font-size: 12px; color: #999;"><p>© ${new Date().getFullYear()} MediCare+. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div></body></html>`,
    });

    await client.close();

    // Mark as welcomed
    await supabase
      .from("profiles")
      .update({ first_login_welcomed: true })
      .eq("id", userId);

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: email,
      email_type: "welcome",
      subject: "Welcome to MediCare+ - Your Health Journey Begins!",
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    console.log("Welcome email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in welcome email:", error);
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
