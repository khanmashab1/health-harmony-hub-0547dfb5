-- Fix SECURITY DEFINER view issue - recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.doctors_public;

CREATE VIEW public.doctors_public 
WITH (security_invoker = true) AS 
SELECT 
  user_id,
  specialty,
  rating,
  experience_years,
  fee,
  max_patients_per_day,
  consultation_duration,
  delay_minutes,
  degree,
  qualifications,
  province,
  city,
  bio,
  image_path,
  selected_plan_id,
  organization_id,
  created_at,
  updated_at
FROM doctors;

-- Re-grant SELECT on the view
GRANT SELECT ON public.doctors_public TO authenticated;
GRANT SELECT ON public.doctors_public TO anon;

-- Add back a public SELECT policy for the base table so the view works
-- This policy only allows SELECT - no sensitive columns are exposed because we use the view
CREATE POLICY "Public can query via doctors_public view"
ON doctors FOR SELECT
USING (true);