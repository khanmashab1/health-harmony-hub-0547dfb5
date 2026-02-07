-- Add prescription stamp setting
INSERT INTO public.site_settings (setting_key, setting_value)
VALUES ('prescription_stamp_url', NULL)
ON CONFLICT (setting_key) DO NOTHING;