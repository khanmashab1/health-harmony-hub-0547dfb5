-- Recreate doctors_public view WITHOUT security_invoker
-- This allows anonymous and all authenticated users to see doctor listings
-- The view already excludes sensitive financial columns (bank details, easypaisa, jazzcash)

DROP VIEW IF EXISTS public.doctors_public;

CREATE VIEW public.doctors_public AS
  SELECT
    user_id,
    specialty,
    degree,
    qualifications,
    bio,
    province,
    city,
    image_path,
    rating,
    experience_years,
    fee,
    max_patients_per_day,
    consultation_duration,
    delay_minutes,
    selected_plan_id,
    organization_id,
    created_at,
    updated_at
  FROM public.doctors;