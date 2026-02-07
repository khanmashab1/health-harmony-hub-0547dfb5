
-- Function to get active patient count (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_active_patient_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM profiles WHERE role = 'patient' AND status = 'Active';
$$;

-- Function to get top 3 patients by appointment count
CREATE OR REPLACE FUNCTION public.get_top_patients_by_appointments()
RETURNS TABLE(
  id uuid,
  name text,
  age integer,
  gender text,
  avatar_path text,
  patient_id text,
  appointment_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.age,
    p.gender,
    p.avatar_path,
    p.patient_id,
    COUNT(a.id) as appointment_count
  FROM profiles p
  INNER JOIN appointments a ON a.patient_user_id = p.id
  WHERE p.role = 'patient' AND p.status = 'Active'
  GROUP BY p.id, p.name, p.age, p.gender, p.avatar_path, p.patient_id
  ORDER BY appointment_count DESC
  LIMIT 3;
$$;
