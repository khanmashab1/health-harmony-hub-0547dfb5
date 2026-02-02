-- Add unique patient_id to profiles table for easy search/filter
ALTER TABLE public.profiles 
ADD COLUMN patient_id TEXT UNIQUE;

-- Create function to generate patient ID
CREATE OR REPLACE FUNCTION public.generate_patient_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_patient_id TEXT;
  counter INT;
BEGIN
  -- Only generate for patients
  IF NEW.role = 'patient' THEN
    -- Get count of patients and generate sequential ID
    SELECT COUNT(*) + 1 INTO counter FROM public.profiles WHERE patient_id IS NOT NULL;
    new_patient_id := 'PAT-' || LPAD(counter::TEXT, 6, '0');
    
    -- Ensure uniqueness by checking if exists
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE patient_id = new_patient_id) LOOP
      counter := counter + 1;
      new_patient_id := 'PAT-' || LPAD(counter::TEXT, 6, '0');
    END LOOP;
    
    NEW.patient_id := new_patient_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate patient_id on insert
CREATE TRIGGER trigger_generate_patient_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_patient_id();

-- Backfill existing patients with patient_ids
DO $$
DECLARE
  rec RECORD;
  counter INT := 0;
  new_id TEXT;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE role = 'patient' AND patient_id IS NULL ORDER BY created_at
  LOOP
    counter := counter + 1;
    new_id := 'PAT-' || LPAD(counter::TEXT, 6, '0');
    UPDATE public.profiles SET patient_id = new_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Add is_paused column to appointments for lab test pause feature
ALTER TABLE public.appointments
ADD COLUMN is_paused BOOLEAN DEFAULT FALSE;