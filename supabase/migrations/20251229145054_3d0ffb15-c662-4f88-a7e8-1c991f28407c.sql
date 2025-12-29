-- Email templates table for admin-editable email customization
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type text NOT NULL UNIQUE,
  subject text NOT NULL,
  clinic_name text DEFAULT 'Medical Clinic',
  clinic_logo_url text,
  primary_color text DEFAULT '#0066cc',
  footer_text text DEFAULT 'Thank you for choosing our clinic.',
  header_text text,
  body_template text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions can read templates
CREATE POLICY "Service can read email templates"
  ON public.email_templates FOR SELECT
  USING (true);

-- Insert default templates
INSERT INTO public.email_templates (template_type, subject, body_template) VALUES
('payment_confirmed', 'Payment Confirmed - Token #{token_number}', 'Your payment has been confirmed. Your token number is {token_number}. Please arrive on time for your appointment on {appointment_date}.'),
('payment_rejected', 'Payment Issue - Action Required', 'Unfortunately, your payment could not be verified. {rejection_reason}. Please resubmit your payment receipt or contact us.'),
('appointment_reminder', 'Appointment Reminder - Tomorrow', 'This is a reminder that you have an appointment tomorrow ({appointment_date}). Your token number is {token_number}.');

-- Symptom knowledge base table for RAG
CREATE TABLE public.symptom_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symptom text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  advice text NOT NULL,
  red_flags text,
  when_to_seek_help text,
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.symptom_knowledge ENABLE ROW LEVEL SECURITY;

-- Anyone can read symptom knowledge (public health info)
CREATE POLICY "Anyone can read symptom knowledge"
  ON public.symptom_knowledge FOR SELECT
  USING (true);

-- Only admins can manage symptom knowledge
CREATE POLICY "Admins can manage symptom knowledge"
  ON public.symptom_knowledge FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for full-text search on symptoms
CREATE INDEX idx_symptom_knowledge_symptom ON public.symptom_knowledge USING gin(to_tsvector('english', symptom || ' ' || description));

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();