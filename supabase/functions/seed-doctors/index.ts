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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const dummyDoctors = [
      {
        email: "dr.ayesha.khan@medicare.test",
        name: "Ayesha Khan",
        specialty: "Dermatologist",
        fee: 2500,
        rating: 4.7,
        experience_years: 10,
        city: "Islamabad",
        province: "ICT",
        bio: "Expert dermatologist specializing in skin disorders, acne treatment, and cosmetic procedures. Committed to helping patients achieve healthy skin.",
        degree: "MBBS, FCPS Dermatology",
        qualifications: "MBBS from Shifa College of Medicine, FCPS Dermatology from CPSP",
      },
      {
        email: "dr.usman.ali@medicare.test",
        name: "Usman Ali",
        specialty: "Orthopedic Surgeon",
        fee: 3500,
        rating: 4.6,
        experience_years: 18,
        city: "Lahore",
        province: "Punjab",
        bio: "Renowned orthopedic surgeon with expertise in joint replacement, sports injuries, and spine surgery.",
        degree: "MBBS, MS Orthopedics",
        qualifications: "MBBS from Allama Iqbal Medical College, MS Orthopedics from Mayo Hospital",
      },
      {
        email: "dr.fatima.zahra@medicare.test",
        name: "Fatima Zahra",
        specialty: "Gynecologist",
        fee: 2000,
        rating: 4.9,
        experience_years: 14,
        city: "Karachi",
        province: "Sindh",
        bio: "Compassionate gynecologist providing comprehensive women healthcare including prenatal care, fertility treatments, and routine checkups.",
        degree: "MBBS, FCPS Gynecology",
        qualifications: "MBBS from Dow Medical College, FCPS Obstetrics & Gynecology",
      },
      {
        email: "dr.ahmed.raza@medicare.test",
        name: "Ahmed Raza",
        specialty: "Pediatrician",
        fee: 1800,
        rating: 4.5,
        experience_years: 8,
        city: "Faisalabad",
        province: "Punjab",
        bio: "Dedicated pediatrician providing comprehensive child healthcare from newborn care to adolescent medicine.",
        degree: "MBBS, DCH",
        qualifications: "MBBS from Punjab Medical College, DCH from Children Hospital Lahore",
      },
      {
        email: "dr.sana.mirza@medicare.test",
        name: "Sana Mirza",
        specialty: "Psychiatrist",
        fee: 4000,
        rating: 4.8,
        experience_years: 11,
        city: "Rawalpindi",
        province: "Punjab",
        bio: "Experienced psychiatrist specializing in anxiety, depression, and behavioral disorders with a patient-centered approach.",
        degree: "MBBS, MRCPsych",
        qualifications: "MBBS from Army Medical College, MRCPsych (UK)",
      },
      {
        email: "dr.bilal.hussain@medicare.test",
        name: "Bilal Hussain",
        specialty: "ENT Specialist",
        fee: 2200,
        rating: 4.4,
        experience_years: 9,
        city: "Peshawar",
        province: "KPK",
        bio: "Skilled ENT specialist treating ear, nose, and throat conditions including sinus surgery and hearing disorders.",
        degree: "MBBS, FCPS ENT",
        qualifications: "MBBS from Khyber Medical College, FCPS ENT from CPSP",
      },
    ];

    const results = [];

    for (const doc of dummyDoctors) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === doc.email);

      let userId: string;

      if (existing) {
        userId = existing.id;
        results.push({ email: doc.email, status: "already_exists", userId });
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: doc.email,
          password: "Doctor@123",
          email_confirm: true,
          user_metadata: { name: doc.name, role: "doctor" },
        });

        if (authError) {
          results.push({ email: doc.email, status: "auth_error", error: authError.message });
          continue;
        }
        userId = authData.user.id;
      }

      // Ensure profile has doctor role
      await supabase
        .from("profiles")
        .update({ role: "doctor", name: doc.name, city: doc.city, province: doc.province })
        .eq("id", userId);

      // Upsert doctor record
      const { error: docError } = await supabase.from("doctors").upsert(
        {
          user_id: userId,
          specialty: doc.specialty,
          fee: doc.fee,
          rating: doc.rating,
          experience_years: doc.experience_years,
          city: doc.city,
          province: doc.province,
          bio: doc.bio,
          degree: doc.degree,
          qualifications: doc.qualifications,
          max_patients_per_day: 25,
        },
        { onConflict: "user_id" }
      );

      if (docError) {
        results.push({ email: doc.email, status: "doctor_error", error: docError.message });
      } else {
        results.push({ email: doc.email, status: "success", userId });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
