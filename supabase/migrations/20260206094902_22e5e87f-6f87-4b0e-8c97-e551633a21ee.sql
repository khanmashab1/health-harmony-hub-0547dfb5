-- Add password_hash column to doctor_applications to store encrypted password for approval
ALTER TABLE public.doctor_applications 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.doctor_applications.password_hash IS 'Encrypted password stored during application, used to create account on approval';