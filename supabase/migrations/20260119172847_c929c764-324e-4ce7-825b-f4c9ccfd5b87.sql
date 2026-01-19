-- Add first_login_welcomed column to track if welcome email was sent
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_login_welcomed boolean DEFAULT false;