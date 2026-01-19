-- Create medicines catalog table
CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  strength TEXT,
  form TEXT, -- tablet, capsule, syrup, injection, etc.
  manufacturer TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast search
CREATE INDEX idx_medicines_name ON public.medicines USING gin(to_tsvector('english', name));
CREATE INDEX idx_medicines_generic ON public.medicines USING gin(to_tsvector('english', generic_name));

-- Enable RLS
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- Anyone can read medicines
CREATE POLICY "Anyone can view medicines"
ON public.medicines
FOR SELECT
USING (true);

-- Only admins can manage medicines
CREATE POLICY "Admins can manage medicines"
ON public.medicines
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert common medicines
INSERT INTO public.medicines (name, generic_name, category, strength, form) VALUES
-- Pain & Fever
('Paracetamol 500mg', 'Paracetamol', 'Analgesic', '500mg', 'Tablet'),
('Paracetamol 650mg', 'Paracetamol', 'Analgesic', '650mg', 'Tablet'),
('Ibuprofen 400mg', 'Ibuprofen', 'NSAID', '400mg', 'Tablet'),
('Ibuprofen 200mg', 'Ibuprofen', 'NSAID', '200mg', 'Tablet'),
('Aspirin 75mg', 'Aspirin', 'Analgesic', '75mg', 'Tablet'),
('Diclofenac 50mg', 'Diclofenac', 'NSAID', '50mg', 'Tablet'),
('Naproxen 500mg', 'Naproxen', 'NSAID', '500mg', 'Tablet'),

-- Antibiotics
('Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', '500mg', 'Capsule'),
('Amoxicillin 250mg', 'Amoxicillin', 'Antibiotic', '250mg', 'Capsule'),
('Azithromycin 500mg', 'Azithromycin', 'Antibiotic', '500mg', 'Tablet'),
('Azithromycin 250mg', 'Azithromycin', 'Antibiotic', '250mg', 'Tablet'),
('Ciprofloxacin 500mg', 'Ciprofloxacin', 'Antibiotic', '500mg', 'Tablet'),
('Metronidazole 400mg', 'Metronidazole', 'Antibiotic', '400mg', 'Tablet'),
('Cefixime 200mg', 'Cefixime', 'Antibiotic', '200mg', 'Tablet'),
('Levofloxacin 500mg', 'Levofloxacin', 'Antibiotic', '500mg', 'Tablet'),
('Doxycycline 100mg', 'Doxycycline', 'Antibiotic', '100mg', 'Capsule'),
('Cephalexin 500mg', 'Cephalexin', 'Antibiotic', '500mg', 'Capsule'),

-- Gastric
('Omeprazole 20mg', 'Omeprazole', 'PPI', '20mg', 'Capsule'),
('Pantoprazole 40mg', 'Pantoprazole', 'PPI', '40mg', 'Tablet'),
('Ranitidine 150mg', 'Ranitidine', 'H2 Blocker', '150mg', 'Tablet'),
('Domperidone 10mg', 'Domperidone', 'Antiemetic', '10mg', 'Tablet'),
('Ondansetron 4mg', 'Ondansetron', 'Antiemetic', '4mg', 'Tablet'),
('Esomeprazole 40mg', 'Esomeprazole', 'PPI', '40mg', 'Tablet'),

-- Allergy & Cold
('Cetirizine 10mg', 'Cetirizine', 'Antihistamine', '10mg', 'Tablet'),
('Loratadine 10mg', 'Loratadine', 'Antihistamine', '10mg', 'Tablet'),
('Fexofenadine 120mg', 'Fexofenadine', 'Antihistamine', '120mg', 'Tablet'),
('Montelukast 10mg', 'Montelukast', 'Leukotriene Antagonist', '10mg', 'Tablet'),
('Levocetirizine 5mg', 'Levocetirizine', 'Antihistamine', '5mg', 'Tablet'),

-- Cough & Respiratory
('Salbutamol 4mg', 'Salbutamol', 'Bronchodilator', '4mg', 'Tablet'),
('Ambroxol 30mg', 'Ambroxol', 'Mucolytic', '30mg', 'Tablet'),
('Dextromethorphan 15mg', 'Dextromethorphan', 'Antitussive', '15mg', 'Syrup'),
('Bromhexine 8mg', 'Bromhexine', 'Mucolytic', '8mg', 'Tablet'),

-- Diabetes
('Metformin 500mg', 'Metformin', 'Antidiabetic', '500mg', 'Tablet'),
('Metformin 850mg', 'Metformin', 'Antidiabetic', '850mg', 'Tablet'),
('Glimepiride 1mg', 'Glimepiride', 'Antidiabetic', '1mg', 'Tablet'),
('Glimepiride 2mg', 'Glimepiride', 'Antidiabetic', '2mg', 'Tablet'),
('Sitagliptin 100mg', 'Sitagliptin', 'Antidiabetic', '100mg', 'Tablet'),

-- Blood Pressure
('Amlodipine 5mg', 'Amlodipine', 'Calcium Channel Blocker', '5mg', 'Tablet'),
('Amlodipine 10mg', 'Amlodipine', 'Calcium Channel Blocker', '10mg', 'Tablet'),
('Losartan 50mg', 'Losartan', 'ARB', '50mg', 'Tablet'),
('Telmisartan 40mg', 'Telmisartan', 'ARB', '40mg', 'Tablet'),
('Atenolol 50mg', 'Atenolol', 'Beta Blocker', '50mg', 'Tablet'),
('Metoprolol 50mg', 'Metoprolol', 'Beta Blocker', '50mg', 'Tablet'),
('Enalapril 5mg', 'Enalapril', 'ACE Inhibitor', '5mg', 'Tablet'),

-- Cholesterol
('Atorvastatin 10mg', 'Atorvastatin', 'Statin', '10mg', 'Tablet'),
('Atorvastatin 20mg', 'Atorvastatin', 'Statin', '20mg', 'Tablet'),
('Rosuvastatin 10mg', 'Rosuvastatin', 'Statin', '10mg', 'Tablet'),

-- Vitamins & Supplements
('Vitamin D3 60000 IU', 'Cholecalciferol', 'Vitamin', '60000 IU', 'Capsule'),
('Vitamin B12 1500mcg', 'Methylcobalamin', 'Vitamin', '1500mcg', 'Tablet'),
('Calcium 500mg + Vitamin D3', 'Calcium Carbonate', 'Supplement', '500mg', 'Tablet'),
('Iron 100mg + Folic Acid', 'Ferrous Sulfate', 'Supplement', '100mg', 'Tablet'),
('Multivitamin', 'Multivitamin', 'Supplement', 'Various', 'Tablet'),
('Zinc 50mg', 'Zinc Sulfate', 'Supplement', '50mg', 'Tablet'),

-- Muscle Relaxants
('Thiocolchicoside 4mg', 'Thiocolchicoside', 'Muscle Relaxant', '4mg', 'Tablet'),
('Chlorzoxazone 500mg', 'Chlorzoxazone', 'Muscle Relaxant', '500mg', 'Tablet'),

-- Anxiety/Sleep
('Alprazolam 0.25mg', 'Alprazolam', 'Anxiolytic', '0.25mg', 'Tablet'),
('Clonazepam 0.5mg', 'Clonazepam', 'Anxiolytic', '0.5mg', 'Tablet'),
('Zolpidem 10mg', 'Zolpidem', 'Sedative', '10mg', 'Tablet');
