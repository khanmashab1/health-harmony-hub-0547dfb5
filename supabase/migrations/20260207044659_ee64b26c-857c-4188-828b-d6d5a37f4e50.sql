-- Add appointment_id to reviews table to tie reviews to specific appointments
ALTER TABLE public.reviews ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Create unique constraint so each appointment can only have one review
ALTER TABLE public.reviews ADD CONSTRAINT reviews_appointment_id_unique UNIQUE (appointment_id);

-- Create index for faster lookups
CREATE INDEX idx_reviews_appointment_id ON public.reviews(appointment_id);