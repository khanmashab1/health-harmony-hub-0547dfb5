-- Fix PUBLIC_DATA_EXPOSURE: Create a secure view for public doctor information
-- This excludes sensitive payment fields from public access

-- Create a public view that excludes sensitive payment information
CREATE OR REPLACE VIEW public.doctors_public AS 
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

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.doctors_public TO authenticated;
GRANT SELECT ON public.doctors_public TO anon;

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view doctor public info" ON doctors;

-- Create a new policy that only allows owners and admins to see full doctor records
CREATE POLICY "Owners can view own doctor info" 
ON doctors FOR SELECT 
USING (auth.uid() = user_id);

-- PAs assigned to doctors can view their doctor's info
CREATE POLICY "PAs can view assigned doctor info"
ON doctors FOR SELECT
USING (is_pa_for_doctor(auth.uid(), user_id));