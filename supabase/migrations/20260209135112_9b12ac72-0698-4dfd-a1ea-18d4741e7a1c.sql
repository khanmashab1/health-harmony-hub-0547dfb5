
-- Drop the old unique constraint on appointment_id
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_appointment_id_unique;

-- Add unique constraint: one review per patient per doctor
ALTER TABLE public.reviews ADD CONSTRAINT reviews_patient_doctor_unique UNIQUE (patient_user_id, doctor_user_id);

-- Change default status to Approved (auto-approve)
ALTER TABLE public.reviews ALTER COLUMN status SET DEFAULT 'Approved';
