
-- Fix infinite recursion: create security definer function to check pharmacy ownership
CREATE OR REPLACE FUNCTION public.is_pharmacy_owner(check_user_id uuid, check_pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacies
    WHERE id = check_pharmacy_id AND owner_user_id = check_user_id
  );
$$;

-- Drop and recreate pharmacy_cashiers policies using the function
DROP POLICY IF EXISTS "Pharmacy owners can manage own cashiers" ON public.pharmacy_cashiers;
CREATE POLICY "Pharmacy owners can manage own cashiers" ON public.pharmacy_cashiers FOR ALL
  USING (is_pharmacy_owner(auth.uid(), pharmacy_id))
  WITH CHECK (is_pharmacy_owner(auth.uid(), pharmacy_id));

-- Also fix the pharmacies policy that causes the recursion
DROP POLICY IF EXISTS "Cashiers can view their pharmacy" ON public.pharmacies;
CREATE POLICY "Cashiers can view their pharmacy" ON public.pharmacies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pharmacy_cashiers
    WHERE pharmacy_cashiers.pharmacy_id = pharmacies.id
      AND pharmacy_cashiers.user_id = auth.uid()
      AND pharmacy_cashiers.is_active = true
  ));
