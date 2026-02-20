
-- =====================================================
-- PHARMACY STOCK LOGS TABLE (Audit Trail)
-- Tracks all stock changes for transparency & FYP audit
-- =====================================================
CREATE TABLE public.pharmacy_stock_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.pharmacy_inventory(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('sale', 'restock', 'manual', 'adjustment')),
  quantity_changed INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pharmacy_stock_logs ENABLE ROW LEVEL SECURITY;

-- Pharmacy owners can view and insert logs for their pharmacy
CREATE POLICY "Pharmacy owners can manage own stock logs"
  ON public.pharmacy_stock_logs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_stock_logs.pharmacy_id AND pharmacies.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_stock_logs.pharmacy_id AND pharmacies.owner_user_id = auth.uid()
  ));

-- Admins can manage all stock logs
CREATE POLICY "Admins can manage all stock logs"
  ON public.pharmacy_stock_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_stock_logs_inventory ON public.pharmacy_stock_logs(inventory_id);
CREATE INDEX idx_stock_logs_pharmacy ON public.pharmacy_stock_logs(pharmacy_id);
CREATE INDEX idx_stock_logs_created ON public.pharmacy_stock_logs(created_at DESC);
