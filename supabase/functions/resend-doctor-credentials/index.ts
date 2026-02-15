import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendRequest {
  doctorUserId: string;
  organizationId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the requesting user is an org owner/admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ResendRequest = await req.json();
    const { doctorUserId, organizationId } = body;

    // Verify user is org owner or admin
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("*, owner_user_id, name")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org.owner_user_id !== user.id) {
      const { data: membership } = await supabaseAdmin
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        return new Response(
          JSON.stringify({ error: "Not authorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get doctor info
    const { data: doctorUser, error: doctorError } = await supabaseAdmin.auth.admin.getUserById(doctorUserId);
    
    if (doctorError || !doctorUser?.user) {
      return new Response(
        JSON.stringify({ error: "Doctor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const doctorEmail = doctorUser.user.email;
    const doctorName = doctorUser.user.user_metadata?.name || "Doctor";

    // Generate a new temporary password
    const newPassword = `Med${Math.random().toString(36).slice(-8)}!`;
    
    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      doctorUserId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Failed to update password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to reset credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark user for password change on next login
    await supabaseAdmin.auth.admin.updateUserById(doctorUserId, {
      user_metadata: { 
        ...doctorUser.user.user_metadata,
        requires_password_change: true 
      }
    });

    // Send email with new credentials
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: doctorEmail,
          subject: "Medicare - Your Login Credentials Have Been Reset",
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#14b8a6,#0d9488);padding:30px;border-radius:12px 12px 0 0;text-align:center;"><h1 style="color:white;margin:0;font-size:28px;">Credentials Reset</h1></div><div style="background:#f8fafc;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;"><p style="font-size:16px;color:#334155;margin-bottom:20px;">Dear <strong>Dr. ${doctorName}</strong>,</p><p style="font-size:16px;color:#334155;margin-bottom:20px;">Your login credentials for <strong>${org.name}</strong> have been reset by an administrator.</p><div style="background:white;border:2px solid #14b8a6;border-radius:8px;padding:20px;margin:25px 0;"><h3 style="color:#0f766e;margin-top:0;margin-bottom:15px;">Your New Login Credentials</h3><p style="margin:8px 0;font-size:15px;"><strong>Email:</strong> <span style="color:#0d9488;">${doctorEmail}</span></p><p style="margin:8px 0;font-size:15px;"><strong>Temporary Password:</strong> <span style="color:#0d9488;">${newPassword}</span></p></div><p style="font-size:14px;color:#64748b;margin-bottom:20px;"><strong>⚠️ Important:</strong> You will be required to change your password when you log in.</p><div style="text-align:center;margin:30px 0;"><a href="https://medicare-nine-wine.vercel.app/auth" style="background:linear-gradient(135deg,#14b8a6,#0d9488);color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">Login to Your Dashboard</a></div><hr style="border:none;border-top:1px solid #e2e8f0;margin:25px 0;"><p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">If you didn't request this reset, please contact your organization administrator immediately.</p></div></body></html>`,
        }),
      }
    );

    if (!emailResponse.ok) {
      console.error("Failed to send email:", await emailResponse.text());
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `New credentials sent to ${doctorEmail}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
