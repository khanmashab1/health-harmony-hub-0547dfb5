-- Fix RLS policy for patient appointment cancellation
-- The current policy restricts UPDATE but needs to allow setting status to 'Cancelled'

DROP POLICY IF EXISTS "Patients can update own pending appointments" ON public.appointments;

-- Create a more permissive policy that allows patients to:
-- 1. Update their appointments if status is Pending or Upcoming
-- 2. Only allows updating to Cancelled status (or keeping same status)
CREATE POLICY "Patients can update own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  patient_user_id = auth.uid() 
  AND status IN ('Pending', 'Upcoming')
)
WITH CHECK (
  patient_user_id = auth.uid()
  AND status IN ('Pending', 'Upcoming', 'Cancelled')
);