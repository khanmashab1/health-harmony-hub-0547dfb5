-- Fix security warning: Set search_path for calculate_age function
CREATE OR REPLACE FUNCTION public.calculate_age(birth_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN birth_date IS NULL THEN NULL
    ELSE EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date))::INTEGER
  END;
$$;