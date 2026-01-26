-- Allow anyone to view doctor profiles (for public display on home page, booking, etc.)
CREATE POLICY "Anyone can view doctor profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'doctor'::app_role
);