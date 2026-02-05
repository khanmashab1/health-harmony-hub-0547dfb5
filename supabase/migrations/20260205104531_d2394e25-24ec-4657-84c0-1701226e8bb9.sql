-- Create doctor payment plans table
CREATE TABLE public.doctor_payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly, one-time
  features TEXT[] DEFAULT '{}',
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_payment_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active plans"
ON public.doctor_payment_plans
FOR SELECT
USING (is_active = true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage payment plans"
ON public.doctor_payment_plans
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_doctor_payment_plans_updated_at
BEFORE UPDATE ON public.doctor_payment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.doctor_payment_plans (name, description, price, billing_period, features, is_popular, sort_order) VALUES
('Basic', 'Perfect for getting started', 0, 'monthly', ARRAY['Up to 10 patients/day', 'Basic scheduling', 'Digital prescriptions', 'Email support'], false, 1),
('Professional', 'Most popular for growing practices', 2999, 'monthly', ARRAY['Up to 30 patients/day', 'Advanced scheduling', 'Digital prescriptions', 'Priority support', 'Analytics dashboard', 'Custom branding'], true, 2),
('Enterprise', 'For established clinics', 7999, 'monthly', ARRAY['Unlimited patients', 'Multi-doctor support', 'All features included', '24/7 phone support', 'Dedicated account manager', 'API access'], false, 3);