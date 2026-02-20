
-- Add 'pharmacy' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacy';

-- Pharmacies table
CREATE TABLE public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  owner_user_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all pharmacies" ON public.pharmacies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacy owners can view own pharmacy" ON public.pharmacies FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Pharmacy owners can update own pharmacy" ON public.pharmacies FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Pharmacy inventory (links medicines table to pharmacies with stock)
CREATE TABLE public.pharmacy_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  form TEXT,
  strength TEXT,
  manufacturer TEXT,
  batch_number TEXT,
  expiry_date DATE,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  unit_cost NUMERIC DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all inventory" ON public.pharmacy_inventory FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacy owners can manage own inventory" ON public.pharmacy_inventory FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pharmacies WHERE id = pharmacy_inventory.pharmacy_id AND owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pharmacies WHERE id = pharmacy_inventory.pharmacy_id AND owner_user_id = auth.uid()
  ));

-- Pharmacy sales
CREATE TABLE public.pharmacy_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.appointments(id),
  patient_name TEXT,
  patient_phone TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  payment_status TEXT DEFAULT 'Paid',
  sold_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all sales" ON public.pharmacy_sales FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacy owners can manage own sales" ON public.pharmacy_sales FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pharmacies WHERE id = pharmacy_sales.pharmacy_id AND owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pharmacies WHERE id = pharmacy_sales.pharmacy_id AND owner_user_id = auth.uid()
  ));

-- Sale items (individual medicines in a sale)
CREATE TABLE public.pharmacy_sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.pharmacy_sales(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.pharmacy_inventory(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all sale items" ON public.pharmacy_sale_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacy owners can manage own sale items" ON public.pharmacy_sale_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pharmacy_sales s
    JOIN public.pharmacies p ON p.id = s.pharmacy_id
    WHERE s.id = pharmacy_sale_items.sale_id AND p.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pharmacy_sales s
    JOIN public.pharmacies p ON p.id = s.pharmacy_id
    WHERE s.id = pharmacy_sale_items.sale_id AND p.owner_user_id = auth.uid()
  ));

-- Supplier orders
CREATE TABLE public.pharmacy_supplier_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  status TEXT DEFAULT 'Pending',
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_supplier_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all supplier orders" ON public.pharmacy_supplier_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacy owners can manage own supplier orders" ON public.pharmacy_supplier_orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pharmacies WHERE id = pharmacy_supplier_orders.pharmacy_id AND owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pharmacies WHERE id = pharmacy_supplier_orders.pharmacy_id AND owner_user_id = auth.uid()
  ));

-- Supplier order items
CREATE TABLE public.pharmacy_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.pharmacy_supplier_orders(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all order items" ON public.pharmacy_order_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacy owners can manage own order items" ON public.pharmacy_order_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pharmacy_supplier_orders o
    JOIN public.pharmacies p ON p.id = o.pharmacy_id
    WHERE o.id = pharmacy_order_items.order_id AND p.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pharmacy_supplier_orders o
    JOIN public.pharmacies p ON p.id = o.pharmacy_id
    WHERE o.id = pharmacy_order_items.order_id AND p.owner_user_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_inventory_updated_at BEFORE UPDATE ON public.pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_supplier_orders_updated_at BEFORE UPDATE ON public.pharmacy_supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
