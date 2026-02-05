-- Add date_of_birth column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create a function to calculate age from date_of_birth
CREATE OR REPLACE FUNCTION public.calculate_age(birth_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN birth_date IS NULL THEN NULL
    ELSE EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date))::INTEGER
  END;
$$;

-- Create doctor_applications table for pending applications
CREATE TABLE IF NOT EXISTS public.doctor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Personal Info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  city TEXT,
  province TEXT,
  
  -- Professional Info
  specialty TEXT NOT NULL,
  degree TEXT NOT NULL,
  qualifications TEXT,
  experience_years INTEGER NOT NULL,
  bio TEXT,
  
  -- Financial Info
  consultation_fee NUMERIC NOT NULL,
  
  -- Documents
  medical_license_path TEXT,
  degree_certificate_path TEXT,
  
  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctor_applications
-- Anyone can submit an application (insert)
CREATE POLICY "Anyone can submit doctor application"
ON public.doctor_applications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.doctor_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
ON public.doctor_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete applications
CREATE POLICY "Admins can delete applications"
ON public.doctor_applications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_doctor_applications_updated_at
BEFORE UPDATE ON public.doctor_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for doctor application documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-applications', 'doctor-applications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for doctor-applications bucket
-- Authenticated users can upload their own documents
CREATE POLICY "Users can upload application documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'doctor-applications');

-- Admins can view all application documents
CREATE POLICY "Admins can view application documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'doctor-applications' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Admins can delete application documents
CREATE POLICY "Admins can delete application documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'doctor-applications' 
  AND public.has_role(auth.uid(), 'admin')
);