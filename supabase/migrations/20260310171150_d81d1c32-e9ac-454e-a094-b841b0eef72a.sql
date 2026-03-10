
ALTER TABLE public.doctors ADD COLUMN clinic_address text DEFAULT NULL;
ALTER TABLE public.doctors ADD COLUMN google_maps_link text DEFAULT NULL;

-- Also update the public view
DROP VIEW IF EXISTS public.doctors_public;
CREATE VIEW public.doctors_public AS
SELECT 
  user_id, rating, experience_years, fee, max_patients_per_day,
  consultation_duration, delay_minutes, selected_plan_id, organization_id,
  created_at, updated_at, specialty, degree, qualifications, bio,
  province, city, image_path, clinic_address, google_maps_link
FROM public.doctors;
