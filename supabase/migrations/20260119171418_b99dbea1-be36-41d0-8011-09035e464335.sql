-- Create storage bucket for hero slides
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-slides', 'hero-slides', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for hero slides
CREATE POLICY "Anyone can view hero slides images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'hero-slides');

CREATE POLICY "Admins can upload hero slides images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'hero-slides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update hero slides images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'hero-slides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hero slides images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'hero-slides' AND public.has_role(auth.uid(), 'admin'));