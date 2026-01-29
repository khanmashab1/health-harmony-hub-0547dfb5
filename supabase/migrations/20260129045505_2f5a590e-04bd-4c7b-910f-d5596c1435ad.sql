-- Drop the old check constraint and add a new one with all needed status values
ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status = ANY (ARRAY['Pending'::text, 'Upcoming'::text, 'In Progress'::text, 'Completed'::text, 'Cancelled'::text, 'No Show'::text]));

-- Create managed_patients table for multi-patient management
CREATE TABLE public.managed_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'Family Member',
  patient_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manager_user_id, patient_user_id)
);

-- Enable RLS
ALTER TABLE public.managed_patients ENABLE ROW LEVEL SECURITY;

-- Users can manage their own managed patients list
CREATE POLICY "Users can manage their own patient list"
ON public.managed_patients
FOR ALL
USING (manager_user_id = auth.uid())
WITH CHECK (manager_user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all managed patients"
ON public.managed_patients
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));