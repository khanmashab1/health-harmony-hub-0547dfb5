
-- Drop all existing policies on doctor_applications
DROP POLICY IF EXISTS "Anyone can submit doctor application" ON public.doctor_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.doctor_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.doctor_applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.doctor_applications;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can submit doctor application"
ON public.doctor_applications
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
ON public.doctor_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update applications"
ON public.doctor_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete applications"
ON public.doctor_applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
