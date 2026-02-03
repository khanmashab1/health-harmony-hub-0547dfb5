-- Create doctor_breaks table for managing break times (lunch, prayer, etc.)
CREATE TABLE public.doctor_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  break_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  applies_to_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_doctor_breaks_doctor_user_id ON public.doctor_breaks(doctor_user_id);

-- Enable RLS
ALTER TABLE public.doctor_breaks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view doctor breaks"
ON public.doctor_breaks
FOR SELECT
USING (true);

CREATE POLICY "Doctors can manage own breaks"
ON public.doctor_breaks
FOR ALL
USING (doctor_user_id = auth.uid());

CREATE POLICY "Admins can manage all breaks"
ON public.doctor_breaks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_doctor_breaks_updated_at
BEFORE UPDATE ON public.doctor_breaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();