-- Add delay_minutes column to doctors table for "Doctor is late" feature
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS delay_minutes integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.doctors.delay_minutes IS 'Extra delay in minutes when doctor is running late. Added to estimated appointment times.';