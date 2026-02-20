
-- =====================================================
-- PHARMACY CASHIERS TABLE
-- Links cashier user accounts to pharmacies
-- Cashiers can ONLY use POS (sell medicines)
-- =====================================================
CREATE TABLE public.pharmacy_cashiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pharmacy_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pharmacy_cashiers ENABLE ROW LEVEL SECURITY;

-- Pharmacy owners can manage their cashiers
CREATE POLICY "Pharmacy owners can manage own cashiers"
  ON public.pharmacy_cashiers
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_cashiers.pharmacy_id AND pharmacies.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_cashiers.pharmacy_id AND pharmacies.owner_user_id = auth.uid()
  ));

-- Admins can manage all cashiers
CREATE POLICY "Admins can manage all cashiers"
  ON public.pharmacy_cashiers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Cashiers can view their own record
CREATE POLICY "Cashiers can view own record"
  ON public.pharmacy_cashiers
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow cashiers to read pharmacy info (for POS header)
CREATE POLICY "Cashiers can view their pharmacy"
  ON public.pharmacies
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pharmacy_cashiers WHERE pharmacy_cashiers.pharmacy_id = pharmacies.id AND pharmacy_cashiers.user_id = auth.uid() AND pharmacy_cashiers.is_active = true
  ));

-- Allow cashiers to search inventory (read-only for POS)
CREATE POLICY "Cashiers can view pharmacy inventory"
  ON public.pharmacy_inventory
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pharmacy_cashiers WHERE pharmacy_cashiers.pharmacy_id = pharmacy_inventory.pharmacy_id AND pharmacy_cashiers.user_id = auth.uid() AND pharmacy_cashiers.is_active = true
  ));

-- Allow cashiers to create sales
CREATE POLICY "Cashiers can create sales"
  ON public.pharmacy_sales
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_cashiers WHERE pharmacy_cashiers.pharmacy_id = pharmacy_sales.pharmacy_id AND pharmacy_cashiers.user_id = auth.uid() AND pharmacy_cashiers.is_active = true
  ));

-- Allow cashiers to view their own sales
CREATE POLICY "Cashiers can view own sales"
  ON public.pharmacy_sales
  FOR SELECT
  USING (sold_by = auth.uid());

-- Allow cashiers to create sale items
CREATE POLICY "Cashiers can create sale items"
  ON public.pharmacy_sale_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_sales s
    JOIN pharmacy_cashiers c ON c.pharmacy_id = s.pharmacy_id
    WHERE s.id = pharmacy_sale_items.sale_id AND c.user_id = auth.uid() AND c.is_active = true
  ));

-- Allow cashiers to update inventory stock (for sale deductions only)
CREATE POLICY "Cashiers can update inventory stock"
  ON public.pharmacy_inventory
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM pharmacy_cashiers WHERE pharmacy_cashiers.pharmacy_id = pharmacy_inventory.pharmacy_id AND pharmacy_cashiers.user_id = auth.uid() AND pharmacy_cashiers.is_active = true
  ));

-- Allow cashiers to insert stock logs
CREATE POLICY "Cashiers can insert stock logs"
  ON public.pharmacy_stock_logs
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_cashiers WHERE pharmacy_cashiers.pharmacy_id = pharmacy_stock_logs.pharmacy_id AND pharmacy_cashiers.user_id = auth.uid() AND pharmacy_cashiers.is_active = true
  ));

-- Index for performance
CREATE INDEX idx_pharmacy_cashiers_pharmacy ON public.pharmacy_cashiers(pharmacy_id);
CREATE INDEX idx_pharmacy_cashiers_user ON public.pharmacy_cashiers(user_id);
