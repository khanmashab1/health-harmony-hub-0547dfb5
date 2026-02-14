
-- Drop the overly permissive policy
DROP POLICY "Service can manage all usage" ON public.ai_usage_tracking;

-- Allow anonymous inserts with anonymous_id
CREATE POLICY "Anonymous can insert usage"
ON public.ai_usage_tracking
FOR INSERT
WITH CHECK (user_id IS NULL AND anonymous_id IS NOT NULL);

-- Allow anonymous to view own usage by anonymous_id  
CREATE POLICY "Anonymous can view own usage"
ON public.ai_usage_tracking
FOR SELECT
USING (user_id IS NULL AND anonymous_id IS NOT NULL);

-- Allow anonymous to update own usage
CREATE POLICY "Anonymous can update own usage"
ON public.ai_usage_tracking
FOR UPDATE
USING (user_id IS NULL AND anonymous_id IS NOT NULL);
