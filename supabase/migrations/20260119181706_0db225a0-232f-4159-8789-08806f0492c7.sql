-- Add doctor_user_id to reviews table for doctor-specific reviews
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS doctor_user_id UUID REFERENCES public.profiles(id);

-- Create index for efficient doctor review queries
CREATE INDEX IF NOT EXISTS idx_reviews_doctor_user_id ON public.reviews(doctor_user_id);

-- Update RLS policy to allow reading reviews by doctor
DROP POLICY IF EXISTS "Users can view approved reviews" ON public.reviews;
CREATE POLICY "Users can view approved reviews" 
ON public.reviews 
FOR SELECT 
USING (status = 'Approved' OR patient_user_id = auth.uid());