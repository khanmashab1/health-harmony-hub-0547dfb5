-- Drop old restrictive policies that only allow editing Pending reviews
DROP POLICY IF EXISTS "Patients can update own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Patients can delete own pending reviews" ON public.reviews;

-- Create new policies that allow patients to edit/delete their own reviews regardless of status
CREATE POLICY "Patients can update own reviews"
  ON public.reviews FOR UPDATE
  USING (patient_user_id = auth.uid())
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Patients can delete own reviews"
  ON public.reviews FOR DELETE
  USING (patient_user_id = auth.uid());

-- Update default status for reviews table to 'Approved'
ALTER TABLE public.reviews ALTER COLUMN status SET DEFAULT 'Approved';