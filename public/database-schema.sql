-- ==============================================
-- MediCare+ Complete Database Schema
-- Generated: 2024
-- ==============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- ENUMS
-- ==============================================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('patient', 'doctor', 'pa', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- TABLES
-- ==============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  blood_type TEXT,
  province TEXT,
  city TEXT,
  avatar_path TEXT,
  role app_role NOT NULL DEFAULT 'patient',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (for role management)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  fee NUMERIC NOT NULL DEFAULT 500,
  max_patients_per_day INTEGER NOT NULL DEFAULT 30,
  rating NUMERIC DEFAULT 4.0,
  image_path TEXT,
  easypaisa_number TEXT,
  province TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PA (Physician Assistant) Assignments
CREATE TABLE IF NOT EXISTS public.pa_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pa_user_id, doctor_user_id)
);

-- Blocked slots for doctors
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  blocked_time TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id UUID NOT NULL REFERENCES public.profiles(id),
  patient_user_id UUID REFERENCES public.profiles(id),
  patient_full_name TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  appointment_date DATE NOT NULL,
  token_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Upcoming',
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  payment_status TEXT NOT NULL DEFAULT 'NA',
  receipt_path TEXT,
  reason TEXT,
  allergies TEXT,
  department TEXT,
  vitals_bp TEXT,
  vitals_heart_rate TEXT,
  vitals_temperature TEXT,
  vitals_weight TEXT,
  diagnosis TEXT,
  medicines TEXT,
  lab_tests TEXT,
  doctor_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Health metrics for patients
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  systolic INTEGER,
  diastolic INTEGER,
  weight NUMERIC,
  sugar_level NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Medical records
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_name TEXT,
  diagnosis TEXT,
  medicines TEXT,
  lab_tests TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  source TEXT DEFAULT 'internal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Symptom knowledge base
CREATE TABLE IF NOT EXISTS public.symptom_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  advice TEXT NOT NULL,
  red_flags TEXT,
  when_to_seek_help TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Symptom submissions from users
CREATE TABLE IF NOT EXISTS public.symptom_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  age INTEGER,
  gender TEXT,
  symptoms_text TEXT,
  selected_tags TEXT[],
  duration TEXT,
  severity TEXT,
  medical_history TEXT,
  result_condition TEXT,
  result_advice TEXT,
  result_confidence INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  header_text TEXT,
  footer_text TEXT DEFAULT 'Thank you for choosing our clinic.',
  clinic_name TEXT DEFAULT 'Medical Clinic',
  clinic_logo_url TEXT,
  primary_color TEXT DEFAULT '#0066cc',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'patient')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'patient')
  );
  
  RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to check if user is PA for a doctor
CREATE OR REPLACE FUNCTION public.is_pa_for_doctor(pa_uuid uuid, doctor_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pa_assignments 
    WHERE pa_user_id = pa_uuid AND doctor_user_id = doctor_uuid
  );
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = user_uuid;
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, check_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = check_role
  );
$$;

-- Function to allocate appointment token
CREATE OR REPLACE FUNCTION public.allocate_token(p_doctor_id uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_patients INT;
  v_next_token INT;
  v_blocked_count INT;
BEGIN
  SELECT max_patients_per_day INTO v_max_patients
  FROM public.doctors WHERE user_id = p_doctor_id;
  
  IF v_max_patients IS NULL THEN
    RAISE EXCEPTION 'Doctor not found';
  END IF;
  
  SELECT COUNT(*) INTO v_blocked_count
  FROM public.blocked_slots 
  WHERE doctor_user_id = p_doctor_id AND blocked_date = p_date;
  
  SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_next_token
  FROM public.appointments
  WHERE doctor_user_id = p_doctor_id 
    AND appointment_date = p_date 
    AND status != 'Cancelled';
  
  IF v_next_token > (v_max_patients - v_blocked_count) THEN
    RAISE EXCEPTION 'No slots available for this date';
  END IF;
  
  RETURN v_next_token;
END;
$$;

-- Function to get available slots for a doctor on a date
CREATE OR REPLACE FUNCTION public.get_available_slots(p_doctor_id uuid, p_date date)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(d.max_patients_per_day, 30) - 
    COALESCE((SELECT COUNT(*) FROM public.appointments 
              WHERE doctor_user_id = p_doctor_id 
              AND appointment_date = p_date 
              AND status != 'Cancelled'), 0) -
    COALESCE((SELECT COUNT(*) FROM public.blocked_slots 
              WHERE doctor_user_id = p_doctor_id 
              AND blocked_date = p_date), 0)
  FROM public.doctors d
  WHERE d.user_id = p_doctor_id;
$$;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctors_updated_at ON public.doctors;
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can view patient profiles for their appointments" ON public.profiles
  FOR SELECT USING (
    has_role(auth.uid(), 'doctor') AND 
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.patient_user_id = profiles.id 
      AND appointments.doctor_user_id = auth.uid()
    )
  );

CREATE POLICY "PAs can view profiles for assigned doctors" ON public.profiles
  FOR SELECT USING (
    has_role(auth.uid(), 'pa') AND (
      id = auth.uid() OR
      EXISTS (SELECT 1 FROM pa_assignments WHERE pa_user_id = auth.uid() AND doctor_user_id = profiles.id) OR
      EXISTS (
        SELECT 1 FROM appointments a
        JOIN pa_assignments pa ON pa.doctor_user_id = a.doctor_user_id
        WHERE pa.pa_user_id = auth.uid() AND a.patient_user_id = profiles.id
      )
    )
  );

-- USER ROLES POLICIES
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- DOCTORS POLICIES
CREATE POLICY "Anyone can view doctor public info" ON public.doctors
  FOR SELECT USING (true);

CREATE POLICY "Doctors can update own info" ON public.doctors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage doctors" ON public.doctors
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- PA ASSIGNMENTS POLICIES
CREATE POLICY "PAs can view own assignments" ON public.pa_assignments
  FOR SELECT USING (pa_user_id = auth.uid());

CREATE POLICY "Doctors can view their PAs" ON public.pa_assignments
  FOR SELECT USING (doctor_user_id = auth.uid());

CREATE POLICY "Admins can manage PA assignments" ON public.pa_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- BLOCKED SLOTS POLICIES
CREATE POLICY "Anyone can view blocked slots" ON public.blocked_slots
  FOR SELECT USING (true);

CREATE POLICY "Doctors can manage own blocked slots" ON public.blocked_slots
  FOR ALL USING (doctor_user_id = auth.uid());

CREATE POLICY "PAs can manage blocked slots for assigned doctors" ON public.blocked_slots
  FOR ALL USING (is_pa_for_doctor(auth.uid(), doctor_user_id));

CREATE POLICY "Admins can manage all blocked slots" ON public.blocked_slots
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- APPOINTMENTS POLICIES
CREATE POLICY "Patients can view own appointments" ON public.appointments
  FOR SELECT USING (patient_user_id = auth.uid());

CREATE POLICY "Patients can create own appointments" ON public.appointments
  FOR INSERT WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Patients can update own pending appointments" ON public.appointments
  FOR UPDATE USING (patient_user_id = auth.uid() AND status IN ('Pending', 'Upcoming'));

CREATE POLICY "Doctors can view their appointments" ON public.appointments
  FOR SELECT USING (doctor_user_id = auth.uid());

CREATE POLICY "Doctors can update their appointments" ON public.appointments
  FOR UPDATE USING (doctor_user_id = auth.uid());

CREATE POLICY "PAs can view appointments for assigned doctors" ON public.appointments
  FOR SELECT USING (is_pa_for_doctor(auth.uid(), doctor_user_id));

CREATE POLICY "PAs can update appointments for assigned doctors" ON public.appointments
  FOR UPDATE USING (is_pa_for_doctor(auth.uid(), doctor_user_id));

CREATE POLICY "Admins can manage all appointments" ON public.appointments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- HEALTH METRICS POLICIES
CREATE POLICY "Patients can manage own health metrics" ON public.health_metrics
  FOR ALL USING (patient_user_id = auth.uid());

CREATE POLICY "Doctors can view patient health metrics" ON public.health_metrics
  FOR SELECT USING (
    has_role(auth.uid(), 'doctor') AND
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_user_id = health_metrics.patient_user_id
      AND appointments.doctor_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all health metrics" ON public.health_metrics
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- MEDICAL RECORDS POLICIES
CREATE POLICY "Patients can view own medical records" ON public.medical_records
  FOR SELECT USING (patient_user_id = auth.uid());

CREATE POLICY "Doctors can manage medical records for their patients" ON public.medical_records
  FOR ALL USING (
    has_role(auth.uid(), 'doctor') AND
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_user_id = medical_records.patient_user_id
      AND appointments.doctor_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all medical records" ON public.medical_records
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- REVIEWS POLICIES
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
  FOR SELECT USING (status = 'Approved');

CREATE POLICY "Patients can view own reviews" ON public.reviews
  FOR SELECT USING (patient_user_id = auth.uid());

CREATE POLICY "Patients can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Admins can manage all reviews" ON public.reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SYMPTOM KNOWLEDGE POLICIES
CREATE POLICY "Anyone can read symptom knowledge" ON public.symptom_knowledge
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage symptom knowledge" ON public.symptom_knowledge
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SYMPTOM SUBMISSIONS POLICIES
CREATE POLICY "Patients can manage own symptom submissions" ON public.symptom_submissions
  FOR ALL USING (patient_user_id = auth.uid() OR patient_user_id IS NULL);

CREATE POLICY "Admins can view all symptom submissions" ON public.symptom_submissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- EMAIL TEMPLATES POLICIES
CREATE POLICY "Service can read email templates" ON public.email_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- EMAIL LOGS POLICIES
CREATE POLICY "Admins can manage email logs" ON public.email_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ==============================================
-- STORAGE BUCKETS
-- ==============================================

-- Create avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create receipts bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for receipts
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'));

-- ==============================================
-- SAMPLE DATA (Optional - remove in production)
-- ==============================================

-- Insert default email templates
INSERT INTO public.email_templates (template_type, subject, body_template)
VALUES 
  ('appointment_confirmation', 'Appointment Confirmed - Token #{token_number}', 
   'Dear {patient_name}, your appointment with Dr. {doctor_name} is confirmed for {appointment_date}. Your token number is {token_number}.'),
  ('appointment_reminder', 'Reminder: Appointment Tomorrow', 
   'Dear {patient_name}, this is a reminder that you have an appointment tomorrow with Dr. {doctor_name}. Token: {token_number}'),
  ('prescription_ready', 'Your Prescription is Ready', 
   'Dear {patient_name}, your prescription from Dr. {doctor_name} is ready. Please check your dashboard.'),
  ('review_approved', 'Your Review has been Published', 
   'Dear {patient_name}, thank you for your review. It has been approved and is now visible on our platform.'),
  ('review_rejected', 'Review Update', 
   'Dear {patient_name}, we reviewed your feedback. Unfortunately, we could not publish it at this time.')
ON CONFLICT (template_type) DO NOTHING;
