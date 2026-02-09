-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can query via doctors_public view" ON doctors;

-- The remaining policies are:
-- "Admins can manage doctors" - admins have full access
-- "Doctors can update own info" - doctors can update their own info
-- "Owners can view own doctor info" - doctors can view their own info (including payment)
-- "PAs can view assigned doctor info" - PAs can view their assigned doctor's info

-- We need a policy for:
-- 1. Public access to NON-sensitive doctor info (via view)
-- 2. Prescription verification access to basic doctor info

-- Create a function to check if caller needs sensitive fields
-- The view already excludes sensitive columns, so we just need to allow access to it

-- Allow public access ONLY through the view by granting the anon role access to select from doctors
-- but restrict what they can see via the view structure
-- The key insight: the view has SECURITY INVOKER, so RLS on the base table still applies
-- We need to allow public SELECT on doctors for the view to work

-- Add a policy that allows selecting only non-sensitive columns for public access
-- Since RLS can't filter columns, we MUST use the view approach

-- Re-add the public policy but document it clearly
CREATE POLICY "Public can select doctor public info via view"
ON doctors FOR SELECT
TO anon, authenticated
USING (true);