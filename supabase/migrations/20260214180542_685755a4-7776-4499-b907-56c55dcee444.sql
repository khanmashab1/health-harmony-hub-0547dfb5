
-- Patient AI credit plans (managed by admin)
CREATE TABLE public.patient_ai_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  credits integer NOT NULL DEFAULT 10,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_popular boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  stripe_price_id text,
  stripe_product_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_ai_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.patient_ai_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage plans"
ON public.patient_ai_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Patient AI credits balance
CREATE TABLE public.patient_ai_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits integer NOT NULL DEFAULT 0,
  used_credits integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.patient_ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
ON public.patient_ai_credits FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own credits"
ON public.patient_ai_credits FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own credits"
ON public.patient_ai_credits FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all credits"
ON public.patient_ai_credits FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Purchase history
CREATE TABLE public.patient_ai_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.patient_ai_plans(id),
  credits_purchased integer NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_ai_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
ON public.patient_ai_purchases FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own purchases"
ON public.patient_ai_purchases FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all purchases"
ON public.patient_ai_purchases FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to consume AI credit (returns true if allowed)
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  SELECT (total_credits - used_credits) INTO v_remaining
  FROM patient_ai_credits
  WHERE user_id = p_user_id;

  IF v_remaining IS NULL OR v_remaining <= 0 THEN
    RETURN false;
  END IF;

  UPDATE patient_ai_credits
  SET used_credits = used_credits + 1, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- Function to add credits after purchase
CREATE OR REPLACE FUNCTION public.add_ai_credits(p_user_id uuid, p_credits integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO patient_ai_credits (user_id, total_credits, used_credits)
  VALUES (p_user_id, p_credits, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET total_credits = patient_ai_credits.total_credits + p_credits, updated_at = now();
END;
$$;

-- Add default patient AI plans
INSERT INTO public.patient_ai_plans (name, description, credits, price, is_popular, sort_order) VALUES
('Starter', 'Perfect for occasional use', 10, 99, false, 1),
('Popular', 'Best value for regular users', 30, 249, true, 2),
('Premium', 'Unlimited peace of mind', 100, 699, false, 3);
