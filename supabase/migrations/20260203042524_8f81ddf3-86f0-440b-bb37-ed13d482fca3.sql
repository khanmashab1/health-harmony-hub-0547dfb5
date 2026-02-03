-- Insert default footer settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
  ('footer_address', '123 Medical Center, Blue Area, Islamabad, Pakistan'),
  ('footer_phone', '+92 51 1234567'),
  ('footer_email', 'info@medicare.pk'),
  ('footer_facebook', ''),
  ('footer_twitter', ''),
  ('footer_instagram', ''),
  ('footer_linkedin', ''),
  ('footer_copyright', '© {year} MediCare+. All rights reserved.')
ON CONFLICT (setting_key) DO NOTHING;