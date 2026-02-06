-- Drop existing insert policy that requires authentication
DROP POLICY IF EXISTS "Anyone can submit doctor application" ON public.doctor_applications;

-- Create new policy that allows both authenticated and anonymous users to submit applications
CREATE POLICY "Anyone can submit doctor application" 
ON public.doctor_applications 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Ensure file uploads work for anonymous users too
-- Update storage policy for doctor-applications bucket
DROP POLICY IF EXISTS "Anyone can upload application documents" ON storage.objects;
CREATE POLICY "Anyone can upload application documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'doctor-applications');