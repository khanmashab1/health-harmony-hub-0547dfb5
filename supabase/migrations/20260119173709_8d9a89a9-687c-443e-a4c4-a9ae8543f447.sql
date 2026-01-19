-- Create site_settings table for dynamic logo and favicon
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (for logo/favicon display)
CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Only admins can manage site settings
CREATE POLICY "Admins can manage site settings"
  ON public.site_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
  ('logo_url', NULL),
  ('favicon_url', NULL),
  ('site_name', 'MediCare+');

-- Create trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();