import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try multiple free GeoIP services for reliability
    let countryCode = "";

    try {
      const res = await fetch("https://ipapi.co/json/", {
        headers: { "User-Agent": "MediCarePlus/1.0" },
      });
      if (res.ok) {
        const data = await res.json();
        countryCode = data.country_code || "";
      }
    } catch {
      // fallback below
    }

    if (!countryCode) {
      try {
        const res = await fetch("https://ip2c.org/self");
        if (res.ok) {
          const text = await res.text();
          // Format: 1;CC;CCC;Country Name
          const parts = text.split(";");
          if (parts[0] === "1" && parts[1]) {
            countryCode = parts[1];
          }
        }
      } catch {
        // If all fail, allow access
      }
    }

    return new Response(JSON.stringify({ country: countryCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Geo check error:", error);
    // On error, don't block - allow access
    return new Response(JSON.stringify({ country: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
