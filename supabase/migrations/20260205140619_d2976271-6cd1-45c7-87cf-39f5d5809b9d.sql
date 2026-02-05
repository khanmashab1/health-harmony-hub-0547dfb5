-- Add selected plan column to doctor_applications
ALTER TABLE public.doctor_applications 
ADD COLUMN selected_plan_id UUID REFERENCES public.doctor_payment_plans(id);

-- Add index for faster lookups
CREATE INDEX idx_doctor_applications_plan ON public.doctor_applications(selected_plan_id);