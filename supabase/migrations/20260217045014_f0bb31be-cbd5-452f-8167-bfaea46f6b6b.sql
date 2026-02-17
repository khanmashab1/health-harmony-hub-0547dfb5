
-- Allow doctors to update test reports (mark as reviewed) for their appointments
CREATE POLICY "Doctors can update test reports for their appointments"
ON public.test_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = test_reports.appointment_id
    AND appointments.doctor_user_id = auth.uid()
  )
);
