import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      user_uuid: user.id,
      check_role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { applicationId, adminNotes } = await req.json();

    if (!applicationId) {
      return new Response(JSON.stringify({ error: "Application ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the application
    const { data: application, error: appError } = await supabase
      .from("doctor_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a user with this email already exists
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    const existingUser = existingAuth?.users?.find(u => u.email === application.email);

    let doctorUserId: string;

    if (existingUser) {
      // User already exists, update their profile to doctor role
      doctorUserId = existingUser.id;
      
      // Update profiles table role
      await supabase
        .from("profiles")
        .update({ 
          role: "doctor",
          name: application.full_name,
          phone: application.phone,
          date_of_birth: application.date_of_birth,
          gender: application.gender,
          province: application.province,
          city: application.city,
        })
        .eq("id", doctorUserId);

      // Update user_roles table
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", doctorUserId)
        .single();

      if (existingRole) {
        await supabase
          .from("user_roles")
          .update({ role: "doctor" })
          .eq("user_id", doctorUserId);
      } else {
        await supabase
          .from("user_roles")
          .insert({ user_id: doctorUserId, role: "doctor" });
      }
    } else {
      // Create a new user with a temporary password
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: application.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: application.full_name,
          role: "doctor",
        },
      });

      if (createError || !newUser.user) {
        return new Response(JSON.stringify({ error: "Failed to create user: " + (createError?.message || "Unknown error") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      doctorUserId = newUser.user.id;

      // The profile and user_roles should be created by the trigger
      // But let's update to make sure it has doctor role
      await supabase
        .from("profiles")
        .update({ 
          role: "doctor",
          name: application.full_name,
          phone: application.phone,
          date_of_birth: application.date_of_birth,
          gender: application.gender,
          province: application.province,
          city: application.city,
        })
        .eq("id", doctorUserId);

      await supabase
        .from("user_roles")
        .upsert({ user_id: doctorUserId, role: "doctor" });

      // Send password reset email so doctor can set their own password
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email: application.email,
        options: {
          redirectTo: "https://medicare-nine-wine.vercel.app/auth",
        },
      });
    }

    // Create the doctors record
    const { error: doctorError } = await supabase
      .from("doctors")
      .upsert({
        user_id: doctorUserId,
        specialty: application.specialty,
        degree: application.degree,
        qualifications: application.qualifications,
        experience_years: application.experience_years,
        fee: application.consultation_fee,
        bio: application.bio,
        city: application.city,
        province: application.province,
        max_patients_per_day: 30,
      });

    if (doctorError) {
      console.error("Error creating doctor record:", doctorError);
      return new Response(JSON.stringify({ error: "Failed to create doctor record: " + doctorError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create default schedule for the doctor (Mon-Sat, 9am-5pm)
    const defaultSchedule = [];
    for (let day = 1; day <= 6; day++) {
      defaultSchedule.push({
        doctor_user_id: doctorUserId,
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_available: true,
      });
    }
    // Sunday off
    defaultSchedule.push({
      doctor_user_id: doctorUserId,
      day_of_week: 0,
      start_time: "09:00",
      end_time: "17:00",
      is_available: false,
    });

    await supabase.from("doctor_schedules").insert(defaultSchedule);

    // Update the application status
    const { error: updateError } = await supabase
      .from("doctor_applications")
      .update({
        status: "approved",
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", applicationId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update application status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      doctorUserId,
      message: existingUser 
        ? "Existing user promoted to doctor" 
        : "New doctor account created. Password reset email sent."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});