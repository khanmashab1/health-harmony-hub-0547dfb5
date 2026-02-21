import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildInviteEmailHtml(displayName: string, resetLink: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #16a34a 0%, #0d9488 100%); border-radius: 16px; margin-bottom: 15px;"></div><h1 style="color: #16a34a; margin: 0;">Welcome to MediCare+</h1><p style="color: #666; margin-top: 5px;">Your Pharmacy Account Has Been Created</p></div><div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;"><h2 style="margin-top: 0; color: #166534;">Hello ${displayName}! 💊</h2><p>An admin has created a pharmacy account for you on MediCare+. To get started, please set your password by clicking the button below:</p><div style="text-align: center; margin: 30px 0;"><a href="${resetLink}" style="background: linear-gradient(135deg, #16a34a 0%, #0d9488 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Set Your Password</a></div><p><strong>What you can do after logging in:</strong></p><ul style="padding-left: 20px;"><li>📦 Manage your medicine inventory</li><li>🧾 Scan and verify digital prescriptions</li><li>💰 Process sales with the built-in POS system</li><li>📊 Track sales analytics and stock levels</li></ul></div><div style="background: #fff3cd; border-radius: 12px; padding: 15px; margin-bottom: 20px;"><p style="margin: 0; font-size: 14px; color: #856404;">⚠️ This link will expire in 24 hours. If it expires, contact your admin to resend the invitation.</p></div><div style="text-align: center; font-size: 12px; color: #999;"><p>&copy; ${new Date().getFullYear()} MediCare+. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div></body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ownerEmail, ownerName, pharmacyName, pharmacyAddress, pharmacyPhone, pharmacyEmail, licenseNumber } = await req.json();

    if (!ownerEmail || !ownerName || !pharmacyName) {
      throw new Error("Owner email, owner name, and pharmacy name are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if email already exists using a targeted query
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    
    // Use a more reliable check - try to find user by email directly
    const allUsers = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailExists = allUsers.data?.users?.some(u => u.email?.toLowerCase() === ownerEmail.toLowerCase());
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "This email is already registered. Please use a different email." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user with a random password (they'll set their own via reset link)
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: ownerName,
        role: "pharmacy",
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    // Create pharmacy record
    const { error: pharmacyError } = await supabase.from("pharmacies").insert({
      name: pharmacyName,
      address: pharmacyAddress,
      phone: pharmacyPhone,
      email: pharmacyEmail,
      license_number: licenseNumber,
      owner_user_id: authData.user.id,
    });

    if (pharmacyError) {
      // Rollback user creation if pharmacy insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw pharmacyError;
    }

    // Generate password reset link for the user to set their password
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: ownerEmail,
      options: {
        redirectTo: "https://medicareplus.app/auth",
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      throw new Error("Failed to generate password setup link");
    }

    // Build the actual verification link using the token hash
    const resetLink = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=recovery&redirect_to=https://medicareplus.app/auth`;

    // Send the invite email via Gmail SMTP
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (gmailUser && gmailAppPassword) {
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: { username: gmailUser, password: gmailAppPassword },
        },
      });

      await client.send({
        from: gmailUser,
        to: ownerEmail,
        subject: `Welcome to MediCare+ — Set Up Your Pharmacy Account`,
        content: `Hello ${ownerName}, your pharmacy account "${pharmacyName}" has been created on MediCare+. Set your password here: ${resetLink}`,
        html: buildInviteEmailHtml(ownerName, resetLink),
      });

      await client.close();

      // Log the email
      await supabase.from("email_logs").insert({
        recipient_email: ownerEmail,
        email_type: "pharmacy_invite",
        subject: "Welcome to MediCare+ — Set Up Your Pharmacy Account",
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      console.log(`Pharmacy invite email sent to ${ownerEmail}`);
    }

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error creating pharmacy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
