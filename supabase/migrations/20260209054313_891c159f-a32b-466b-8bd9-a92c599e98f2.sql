-- FINAL FIX: Remove public access to doctors table entirely
-- Sensitive data (payment info) will only be accessible to owners/admins/PAs

DROP POLICY IF EXISTS "Public can select doctor public info via view" ON doctors;
DROP POLICY IF EXISTS "Owners can view own doctor info" ON doctors;
DROP POLICY IF EXISTS "PAs can view assigned doctor info" ON doctors;

-- Create proper restrictive policies
-- 1. Admins can do everything (already exists: "Admins can manage doctors")
-- 2. Doctors can view their own complete record (including payment info)
CREATE POLICY "Doctors can view own record"
ON doctors FOR SELECT
USING (auth.uid() = user_id);

-- 3. PAs can view their assigned doctor's complete record
CREATE POLICY "PAs can view assigned doctor record"
ON doctors FOR SELECT
USING (is_pa_for_doctor(auth.uid(), user_id));

-- The view doctors_public will be used for public queries via application code
-- Since there's no public RLS policy, unauthenticated queries to doctors table will fail
-- This is the desired behavior - force use of the view for public access