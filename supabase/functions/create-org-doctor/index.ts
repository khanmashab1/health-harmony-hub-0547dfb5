import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDoctorRequest {
  organizationId: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  specialty: string;
  degree?: string;
  fee: number;
  experienceYears?: number;
  bio?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the requesting user is an org owner
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

    const body: CreateDoctorRequest = await req.json();
    const { 
      organizationId, 
      email, 
      password, 
      name, 
      phone, 
      specialty, 
      degree, 
      fee, 
      experienceYears, 
      bio 
    } = body;

    // Verify the user owns the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*, owner_user_id, max_doctors")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org.owner_user_id !== user.id) {
      // Check if user is an admin of the org
      const { data: membership } = await supabaseAdmin
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        return new Response(
          JSON.stringify({ error: "Not authorized to add doctors to this organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if organization has reached max doctors
    const { count } = await supabaseAdmin
      .from("doctors")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (count !== null && count >= (org.max_doctors || 10)) {
      return new Response(
        JSON.stringify({ error: `Organization has reached maximum of ${org.max_doctors} doctors` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user account with doctor role
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for org-created doctors
      user_metadata: {
        name,
        role: "doctor",
      },
    });

    if (createError || !newUser.user) {
      console.error("Create user error:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;

    // Update profile with phone
    if (phone) {
      await supabaseAdmin
        .from("profiles")
        .update({ phone })
        .eq("id", newUserId);
    }

    // Create doctor record
    const { error: doctorError } = await supabaseAdmin
      .from("doctors")
      .insert({
        user_id: newUserId,
        specialty,
        degree: degree || null,
        fee,
        experience_years: experienceYears || 0,
        bio: bio || null,
        organization_id: organizationId,
        max_patients_per_day: 30, // Default professional limit
      });

    if (doctorError) {
      console.error("Create doctor error:", doctorError);
      // Cleanup: delete the user if doctor creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Failed to create doctor record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add to organization_members
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: newUserId,
        role: "member",
      });

    if (memberError) {
      console.error("Add member error:", memberError);
    }

    // Create default schedules for the doctor (Mon-Fri, 9 AM - 5 PM)
    const defaultSchedules = [1, 2, 3, 4, 5].map(day => ({
      doctor_user_id: newUserId,
      day_of_week: day,
      start_time: "09:00",
      end_time: "17:00",
      is_available: true,
    }));

    await supabaseAdmin.from("doctor_schedules").insert(defaultSchedules);

    // Send welcome email with login credentials
    try {
      const emailResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: email,
            subject: "Welcome to Medicare - Your Doctor Account is Ready",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Medicare!</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
                  <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                    Dear <strong>Dr. ${name}</strong>,
                  </p>
                  <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                    Your doctor account has been created by <strong>${org.name}</strong>. You now have access to your Professional dashboard.
                  </p>
                  
                  <div style="background: white; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #0f766e; margin-top: 0; margin-bottom: 15px;">Your Login Credentials</h3>
                    <p style="margin: 8px 0; font-size: 15px;">
                      <strong>Email:</strong> <span style="color: #0d9488;">${email}</span>
                    </p>
                    <p style="margin: 8px 0; font-size: 15px;">
                      <strong>Password:</strong> <span style="color: #0d9488;">${password}</span>
                    </p>
                  </div>
                  
                  <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
                    <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://medicare-nine-wine.vercel.app/auth" 
                       style="background: linear-gradient(135deg, #14b8a6, #0d9488); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                      Login to Your Dashboard
                    </a>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                  
                  <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
                    This email was sent by Medicare. If you didn't expect this email, please contact your organization administrator.
                  </p>
                </div>
              </div>
            `,
          }),
        }
      );
      
      if (!emailResponse.ok) {
        console.error("Failed to send welcome email:", await emailResponse.text());
      } else {
        console.log("Welcome email sent successfully to:", email);
      }
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the whole operation if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        doctorId: newUserId,
        message: `Doctor ${name} created successfully. Login credentials sent to ${email}.` 
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
