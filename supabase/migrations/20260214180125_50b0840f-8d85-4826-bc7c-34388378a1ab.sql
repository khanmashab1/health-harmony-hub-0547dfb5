
-- Table to track daily AI feature usage
CREATE TABLE public.ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type text NOT NULL, -- 'symptom_checker' or 'risk_evaluator'
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_type, usage_date)
);

-- For anonymous users, track by session/IP (nullable user_id with identifier)
ALTER TABLE public.ai_usage_tracking ADD COLUMN anonymous_id text;

-- Allow tracking for anonymous too
ALTER TABLE public.ai_usage_tracking DROP CONSTRAINT ai_usage_tracking_user_id_feature_type_usage_date_key;
ALTER TABLE public.ai_usage_tracking ADD CONSTRAINT ai_usage_unique UNIQUE(user_id, anonymous_id, feature_type, usage_date);

-- Enable RLS
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
ON public.ai_usage_tracking
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own usage
CREATE POLICY "Users can insert own usage"
ON public.ai_usage_tracking
FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can update their own usage
CREATE POLICY "Users can update own usage"
ON public.ai_usage_tracking
FOR UPDATE
USING (user_id = auth.uid());

-- Service role can manage all (for edge functions)
CREATE POLICY "Service can manage all usage"
ON public.ai_usage_tracking
FOR ALL
USING (true)
WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all usage"
ON public.ai_usage_tracking
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check and increment usage, returns remaining uses
CREATE OR REPLACE FUNCTION public.check_ai_usage(
  p_user_id uuid,
  p_feature_type text,
  p_daily_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
  v_result jsonb;
BEGIN
  -- Get current usage for today
  SELECT usage_count INTO v_current_count
  FROM ai_usage_tracking
  WHERE user_id = p_user_id
    AND feature_type = p_feature_type
    AND usage_date = CURRENT_DATE;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  -- Check if limit exceeded
  IF v_current_count >= p_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'daily_limit', p_daily_limit,
      'remaining', 0
    );
  END IF;

  -- Increment usage
  INSERT INTO ai_usage_tracking (user_id, feature_type, usage_date, usage_count)
  VALUES (p_user_id, p_feature_type, CURRENT_DATE, 1)
  ON CONFLICT ON CONSTRAINT ai_usage_unique
  DO UPDATE SET usage_count = ai_usage_tracking.usage_count + 1, updated_at = now();

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count + 1,
    'daily_limit', p_daily_limit,
    'remaining', p_daily_limit - v_current_count - 1
  );
END;
$$;
