-- Add RLS policy to allow PAs to insert appointments for their assigned doctors
CREATE POLICY "PAs can create appointments for assigned doctors"
ON public.appointments
FOR INSERT
WITH CHECK (is_pa_for_doctor(auth.uid(), doctor_user_id));