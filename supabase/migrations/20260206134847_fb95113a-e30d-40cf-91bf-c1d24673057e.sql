
-- Create function to recalculate doctor rating from approved reviews
CREATE OR REPLACE FUNCTION public.recalculate_doctor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_doctor_id UUID;
  avg_rating NUMERIC;
BEGIN
  -- Determine the doctor_user_id based on the operation
  IF TG_OP = 'DELETE' THEN
    target_doctor_id := OLD.doctor_user_id;
  ELSE
    target_doctor_id := NEW.doctor_user_id;
  END IF;

  -- Skip if no doctor associated
  IF target_doctor_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate average rating from approved reviews
  SELECT ROUND(AVG(rating)::numeric, 1)
  INTO avg_rating
  FROM public.reviews
  WHERE doctor_user_id = target_doctor_id
    AND status = 'Approved';

  -- Update the doctor's rating (keep existing if no approved reviews)
  IF avg_rating IS NOT NULL THEN
    UPDATE public.doctors
    SET rating = avg_rating
    WHERE user_id = target_doctor_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on reviews table for INSERT, UPDATE, DELETE
CREATE TRIGGER recalculate_doctor_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_doctor_rating();

-- Add missing RLS policies for patients to update/delete their own pending reviews
CREATE POLICY "Patients can update own pending reviews"
ON public.reviews
FOR UPDATE
USING (patient_user_id = auth.uid() AND status = 'Pending')
WITH CHECK (patient_user_id = auth.uid() AND status = 'Pending');

CREATE POLICY "Patients can delete own pending reviews"
ON public.reviews
FOR DELETE
USING (patient_user_id = auth.uid() AND status = 'Pending');
