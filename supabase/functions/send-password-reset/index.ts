import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResetRequest {
  email: string;
  redirectTo: string;
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per minute per email

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();
  const entry = rateLimitMap.get(normalizedEmail);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(normalizedEmail, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: ResetRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Rate limiting to prevent account enumeration attacks
    if (!checkRateLimit(email)) {
      console.log(`Rate limit exceeded for email: ${email}`);
      // Return success even when rate limited to prevent enumeration
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a reset link has been sent." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Password reset requested for: ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate password reset link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectTo || `${supabaseUrl}/auth/v1/callback`,
      },
    });

    if (error) {
      console.error("Error generating reset link:", error);
      // Don't expose whether email exists - return generic success
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a reset link has been sent." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email using the send-email function
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Email service not configured");
    }

    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

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

    const resetLink = data.properties?.action_link;

    await client.send({
      from: gmailUser,
      to: email,
      subject: "Reset Your MediCare++ Password",
      content: `Click the link to reset your password: ${resetLink}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #0d9488; margin: 0;">MediCare++</h1><p style="color: #666; margin-top: 5px;">Effortless Care, Delivered</p></div><div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;"><h2 style="margin-top: 0; color: #0f766e;">Password Reset Request</h2><p>We received a request to reset your password. Click the button below to create a new password:</p><div style="text-align: center; margin: 30px 0;"><a href="${resetLink}" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a></div><p style="font-size: 14px; color: #666;">This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.</p></div><div style="text-align: center; font-size: 12px; color: #999;"><p>© ${new Date().getFullYear()} MediCare++. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div></body></html>`,
    });

    await client.close();

    console.log("Password reset email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "If an account exists with this email, a reset link has been sent." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in password reset:", error);
    // Generic error to prevent information leakage
    return new Response(
      JSON.stringify({ success: true, message: "If an account exists with this email, a reset link has been sent." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
