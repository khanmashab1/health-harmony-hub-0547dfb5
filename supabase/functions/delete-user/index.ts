 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const authHeader = req.headers.get("authorization");
     if (!authHeader) {
       return new Response(JSON.stringify({ error: "No authorization header" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Create client to verify the calling user is an admin
     const supabaseClient = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_ANON_KEY")!,
       { global: { headers: { authorization: authHeader } } }
     );
 
     const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser();
     if (authError || !callingUser) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Check if calling user is admin using our helper function
     const { data: isAdmin } = await supabaseClient.rpc("has_role", {
       user_uuid: callingUser.id,
       check_role: "admin",
     });
 
     if (!isAdmin) {
       return new Response(JSON.stringify({ error: "Admin access required" }), {
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
     if (userId === callingUser.id) {
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
 
     // Delete all related data in correct order (foreign key constraints)
     // 1. Delete PA assignments
     await supabaseAdmin.from("pa_assignments").delete().or(`pa_user_id.eq.${userId},doctor_user_id.eq.${userId}`);
     
     // 2. Delete doctor schedules and breaks
     await supabaseAdmin.from("doctor_schedules").delete().eq("doctor_user_id", userId);
     await supabaseAdmin.from("doctor_breaks").delete().eq("doctor_user_id", userId);
     await supabaseAdmin.from("blocked_slots").delete().eq("doctor_user_id", userId);
     
     // 3. Delete reviews (both as patient and doctor)
     await supabaseAdmin.from("reviews").delete().or(`patient_user_id.eq.${userId},doctor_user_id.eq.${userId}`);
     
     // 4. Delete health metrics
     await supabaseAdmin.from("health_metrics").delete().eq("patient_user_id", userId);
     
     // 5. Delete medical records
     await supabaseAdmin.from("medical_records").delete().eq("patient_user_id", userId);
     
     // 6. Delete symptom submissions
     await supabaseAdmin.from("symptom_submissions").delete().eq("patient_user_id", userId);
     
     // 7. Delete managed patients
     await supabaseAdmin.from("managed_patients").delete().or(`manager_user_id.eq.${userId},patient_user_id.eq.${userId}`);
     
     // 8. Delete appointments (both as patient and doctor)
     await supabaseAdmin.from("appointments").delete().or(`patient_user_id.eq.${userId},doctor_user_id.eq.${userId}`);
     
     // 9. Delete doctor record
     await supabaseAdmin.from("doctors").delete().eq("user_id", userId);
     
     // 10. Delete user roles
     await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
     
     // 11. Delete profile
     const { error: profileDeleteError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
     if (profileDeleteError) {
       console.error("Profile delete error:", profileDeleteError);
       throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
     }
     
     // 12. Delete auth user
     const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
     if (authDeleteError) {
       console.error("Auth delete error:", authDeleteError);
       throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
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