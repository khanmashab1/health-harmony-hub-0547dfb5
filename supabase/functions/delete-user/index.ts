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
      const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
       return new Response(JSON.stringify({ error: "No authorization header" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Create client to verify the calling user is an admin
     const supabaseClient = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
     );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        console.error("Claims error:", claimsError);
        return new Response(JSON.stringify({ error: "Authentication failed" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callingUserId = String(claimsData.claims.sub);
      console.log("Calling user:", callingUserId);

     // Check if calling user is admin using our helper function
     const { data: isAdmin, error: roleError } = await supabaseClient.rpc("has_role", {
        user_uuid: callingUserId,
       check_role: "admin",
     });
 
    console.log("Role check result:", { isAdmin, roleError });

     if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required", roleError }), {
         status: 403,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const { userId } = await req.json();
     if (!userId) {
       return new Response(JSON.stringify({ error: "userId is required" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Prevent self-delete
      if (userId === callingUserId) {
       return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Create service role client for admin operations
     const supabaseAdmin = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
       { auth: { autoRefreshToken: false, persistSession: false } }
     );
 
      console.log(`Starting deletion for user: ${userId}`);

      // Delete all related data in correct order (foreign key constraints)
      // 1. Delete PA assignments (as PA or as doctor)
      const { error: paError1 } = await supabaseAdmin.from("pa_assignments").delete().eq("pa_user_id", userId);
      const { error: paError2 } = await supabaseAdmin.from("pa_assignments").delete().eq("doctor_user_id", userId);
      console.log("PA assignments deleted", { paError1, paError2 });
      
      // 2. Delete doctor schedules and breaks
      await supabaseAdmin.from("doctor_schedules").delete().eq("doctor_user_id", userId);
      await supabaseAdmin.from("doctor_breaks").delete().eq("doctor_user_id", userId);
      await supabaseAdmin.from("blocked_slots").delete().eq("doctor_user_id", userId);
      console.log("Doctor schedules/breaks deleted");
      
      // 3. Delete email logs for appointments (before appointments)
      const { data: userAppointments } = await supabaseAdmin
        .from("appointments")
        .select("id")
        .or(`patient_user_id.eq.${userId},doctor_user_id.eq.${userId}`);
      
      if (userAppointments && userAppointments.length > 0) {
        const appointmentIds = userAppointments.map(a => a.id);
        await supabaseAdmin.from("email_logs").delete().in("appointment_id", appointmentIds);
        console.log("Email logs deleted for appointments");
      }
      
      // 4. Delete reviews (both as patient and doctor)
      await supabaseAdmin.from("reviews").delete().eq("patient_user_id", userId);
      await supabaseAdmin.from("reviews").delete().eq("doctor_user_id", userId);
      console.log("Reviews deleted");
      
      // 5. Delete health metrics
      await supabaseAdmin.from("health_metrics").delete().eq("patient_user_id", userId);
      console.log("Health metrics deleted");
      
      // 6. Delete medical records
      await supabaseAdmin.from("medical_records").delete().eq("patient_user_id", userId);
      console.log("Medical records deleted");
      
      // 7. Delete symptom submissions
      await supabaseAdmin.from("symptom_submissions").delete().eq("patient_user_id", userId);
      console.log("Symptom submissions deleted");
      
      // 8. Delete managed patients
      await supabaseAdmin.from("managed_patients").delete().eq("manager_user_id", userId);
      await supabaseAdmin.from("managed_patients").delete().eq("patient_user_id", userId);
      console.log("Managed patients deleted");
      
      // 9. Delete audit logs
      await supabaseAdmin.from("audit_logs").delete().eq("user_id", userId);
      console.log("Audit logs deleted");
      
      // 10. Delete appointments (both as patient and doctor)
      await supabaseAdmin.from("appointments").delete().eq("patient_user_id", userId);
      await supabaseAdmin.from("appointments").delete().eq("doctor_user_id", userId);
      console.log("Appointments deleted");
      
      // 11. Delete doctor record
      await supabaseAdmin.from("doctors").delete().eq("user_id", userId);
      console.log("Doctor record deleted");
      
      // 12. Delete user roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      console.log("User roles deleted");
      
      // 13. Delete profile
      const { error: profileDeleteError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
      if (profileDeleteError) {
        console.error("Profile delete error:", profileDeleteError);
        throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
      }
      console.log("Profile deleted");
      
      // 14. Delete auth user (non-fatal if user doesn't exist in auth)
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error("Auth delete warning (non-fatal):", authDeleteError.message);
        // Don't throw — user may not exist in auth (e.g., after CSV migration)
      }
 
     console.log(`User ${userId} and all related data deleted successfully`);
 
     return new Response(JSON.stringify({ success: true }), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Delete user error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });