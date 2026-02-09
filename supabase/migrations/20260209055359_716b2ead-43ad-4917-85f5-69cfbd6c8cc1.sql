-- Fix 1: Audit logs - restrict inserts to user's own actions
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Users can log own actions"
ON audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- Fix 2: Create a secure function to get doctor payment info for appointment owners
CREATE OR REPLACE FUNCTION public.get_doctor_payment_for_appointment(p_appointment_id UUID)
RETURNS TABLE(
  specialty TEXT,
  fee NUMERIC,
  easypaisa_number TEXT,
  jazzcash_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_title TEXT,
  consultation_duration INTEGER,
  delay_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_user_id UUID;
  v_doctor_user_id UUID;
  v_caller_role app_role;
BEGIN
  -- Get appointment details
  SELECT a.patient_user_id, a.doctor_user_id 
  INTO v_patient_user_id, v_doctor_user_id
  FROM appointments a
  WHERE a.id = p_appointment_id;
  
  IF v_doctor_user_id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  -- Get caller's role
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  
  -- Authorization: Only allow access if:
  -- 1. User is the patient who owns the appointment
  -- 2. User is an admin
  -- 3. User is the doctor
  -- 4. User is a PA for this doctor
  IF NOT (
    v_patient_user_id = auth.uid() OR
    v_caller_role = 'admin' OR
    v_doctor_user_id = auth.uid() OR
    is_pa_for_doctor(auth.uid(), v_doctor_user_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not have access to this appointment payment details';
  END IF;
  
  -- Return doctor payment info
  RETURN QUERY
  SELECT 
    d.specialty,
    d.fee,
    d.easypaisa_number,
    d.jazzcash_number,
    d.bank_name,
    d.bank_account_number,
    d.bank_account_title,
    d.consultation_duration,
    d.delay_minutes
  FROM doctors d
  WHERE d.user_id = v_doctor_user_id;
END;
$$;

-- Fix 3: Update doctor-applications storage policy to require authenticated users
-- Remove the anonymous upload policy
DROP POLICY IF EXISTS "Anyone can upload application documents" ON storage.objects;

-- Create new policy that only allows authenticated users
CREATE POLICY "Authenticated users can upload application documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'doctor-applications' AND
  (storage.foldername(name))[1] IS NOT NULL
);