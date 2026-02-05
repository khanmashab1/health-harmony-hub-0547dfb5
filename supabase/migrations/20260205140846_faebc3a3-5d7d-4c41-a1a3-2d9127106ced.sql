-- Add selected plan column to doctors table
ALTER TABLE public.doctors 
ADD COLUMN selected_plan_id UUID REFERENCES public.doctor_payment_plans(id);

-- Add index for faster lookups
CREATE INDEX idx_doctors_plan ON public.doctors(selected_plan_id);