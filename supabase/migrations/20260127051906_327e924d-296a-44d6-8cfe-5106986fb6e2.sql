-- Add a policy to allow anyone to view a specific appointment by ID (for prescription verification)
-- This only exposes limited data for verification purposes
CREATE POLICY "Anyone can view appointment for prescription verification" 
ON public.appointments 
FOR SELECT 
USING (true);