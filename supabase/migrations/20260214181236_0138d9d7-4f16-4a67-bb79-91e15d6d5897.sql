CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining integer;
  v_credits_per_use integer := 5;
BEGIN
  SELECT (total_credits - used_credits) INTO v_remaining
  FROM patient_ai_credits
  WHERE user_id = p_user_id;

  IF v_remaining IS NULL OR v_remaining < v_credits_per_use THEN
    RETURN false;
  END IF;

  UPDATE patient_ai_credits
  SET used_credits = used_credits + v_credits_per_use, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;