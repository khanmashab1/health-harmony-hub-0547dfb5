-- Add dark theme logo setting
INSERT INTO public.site_settings (setting_key, setting_value)
VALUES ('logo_url_dark', NULL)
ON CONFLICT (setting_key) DO NOTHING;