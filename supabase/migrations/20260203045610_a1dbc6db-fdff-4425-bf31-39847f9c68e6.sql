-- Add new columns to doctors table for schedule and payment settings
ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS consultation_duration INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS jazzcash_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_title TEXT;

-- Create doctor_schedules table for day-wise timing
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_user_id, day_of_week)
);

-- Enable RLS on doctor_schedules
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for doctor_schedules
CREATE POLICY "Anyone can view doctor schedules"
ON public.doctor_schedules FOR SELECT
USING (true);

CREATE POLICY "Doctors can manage own schedules"
ON public.doctor_schedules FOR ALL
USING (doctor_user_id = auth.uid());

CREATE POLICY "Admins can manage all schedules"
ON public.doctor_schedules FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_doctor_schedules_updated_at
  BEFORE UPDATE ON public.doctor_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();