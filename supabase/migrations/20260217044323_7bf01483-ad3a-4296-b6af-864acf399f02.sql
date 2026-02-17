
-- Create storage bucket for test reports
INSERT INTO storage.buckets (id, name, public) VALUES ('test-reports', 'test-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for test-reports bucket
CREATE POLICY "Patients can upload test reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'test-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'test-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Patients can delete own test reports"
ON storage.objects FOR DELETE
USING (bucket_id = 'test-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create test_reports table
CREATE TABLE public.test_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_reports ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own test reports
CREATE POLICY "Patients can upload own test reports"
ON public.test_reports FOR INSERT
WITH CHECK (uploaded_by = auth.uid());

-- Patients can view own test reports
CREATE POLICY "Patients can view own test reports"
ON public.test_reports FOR SELECT
USING (uploaded_by = auth.uid());

-- Patients can delete own test reports
CREATE POLICY "Patients can delete own test reports"
ON public.test_reports FOR DELETE
USING (uploaded_by = auth.uid());

-- Doctors can view test reports for their appointments
CREATE POLICY "Doctors can view test reports for their appointments"
ON public.test_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = test_reports.appointment_id
    AND appointments.doctor_user_id = auth.uid()
  )
);

-- PAs can view test reports for assigned doctors' appointments
CREATE POLICY "PAs can view test reports for assigned doctors"
ON public.test_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.pa_assignments pa ON pa.doctor_user_id = a.doctor_user_id
    WHERE a.id = test_reports.appointment_id
    AND pa.pa_user_id = auth.uid()
  )
);

-- Admins can manage all test reports
CREATE POLICY "Admins can manage all test reports"
ON public.test_reports FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_test_reports_appointment_id ON public.test_reports(appointment_id);
CREATE INDEX idx_test_reports_uploaded_by ON public.test_reports(uploaded_by);
