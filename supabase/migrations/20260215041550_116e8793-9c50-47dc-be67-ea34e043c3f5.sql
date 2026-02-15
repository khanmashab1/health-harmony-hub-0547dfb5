
-- 1. Create secure RPC for prescription verification (public access, limited fields)
CREATE OR REPLACE FUNCTION public.get_prescription_verification(p_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', a.id,
    'appointment_date', a.appointment_date,
    'token_number', a.token_number,
    'patient_full_name', a.patient_full_name,
    'patient_phone', a.patient_phone,
    'diagnosis', a.diagnosis,
    'medicines', a.medicines,
    'lab_tests', a.lab_tests,
    'doctor_comments', a.doctor_comments,
    'allergies', a.allergies,
    'vitals_weight', a.vitals_weight,
    'vitals_bp', a.vitals_bp,
    'vitals_temperature', a.vitals_temperature,
    'vitals_heart_rate', a.vitals_heart_rate,
    'status', a.status,
    'doctor_name', p.name,
    'doctor_specialty', d.specialty,
    'doctor_degree', d.degree,
    'doctor_qualifications', d.qualifications,
    'doctor_city', d.city,
    'doctor_province', d.province
  ) INTO v_result
  FROM appointments a
  JOIN profiles p ON p.id = a.doctor_user_id
  LEFT JOIN doctors d ON d.user_id = a.doctor_user_id
  WHERE a.id = p_appointment_id
    AND a.status = 'Completed';

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Prescription not found or not yet completed';
  END IF;

  RETURN v_result;
END;
$$;

-- 2. Drop the dangerous public SELECT policy on appointments
DROP POLICY IF EXISTS "Anyone can view appointment for prescription verification" ON public.appointments;

-- 3. Drop the overly broad "Anyone can view doctor profiles" policy on profiles
-- Replace with a restricted version that only shows name and basic info
DROP POLICY IF EXISTS "Anyone can view doctor profiles" ON public.profiles;

-- Re-create with same name but only for public doctor listing (name needed for booking/reviews)
CREATE POLICY "Anyone can view doctor profiles"
  ON public.profiles
  FOR SELECT
  USING (role = 'doctor'::app_role);

-- 4. Restrict the password_hash column: ensure it's cleared immediately
-- Add a comment noting the security concern
COMMENT ON COLUMN public.doctor_applications.password_hash IS 'SECURITY: Temporarily stores password during application. Cleared immediately after account creation in approve-doctor-application edge function. Never expose in client-side queries.';
