-- Create disease_symptoms table to store the uploaded CSV data
CREATE TABLE public.disease_symptoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  symptom_keywords TEXT NOT NULL,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disease_symptoms ENABLE ROW LEVEL SECURITY;

-- Allow public read access for symptom checker
CREATE POLICY "Disease symptoms are publicly readable" 
ON public.disease_symptoms 
FOR SELECT 
USING (true);

-- Allow admins to manage data
CREATE POLICY "Admins can manage disease symptoms" 
ON public.disease_symptoms 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create index for faster searches
CREATE INDEX idx_disease_symptoms_keywords ON public.disease_symptoms USING gin(to_tsvector('english', symptom_keywords));
CREATE INDEX idx_disease_symptoms_title ON public.disease_symptoms USING gin(to_tsvector('english', title));