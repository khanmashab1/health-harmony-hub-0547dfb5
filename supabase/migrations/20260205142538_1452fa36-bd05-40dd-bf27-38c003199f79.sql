-- Add Stripe-related columns to doctor_payment_plans
ALTER TABLE public.doctor_payment_plans 
ADD COLUMN stripe_product_id TEXT,
ADD COLUMN stripe_price_id TEXT;

-- Update existing plans with Stripe IDs
UPDATE public.doctor_payment_plans 
SET stripe_product_id = 'prod_TvK8JxgcxvEJ7h', 
    stripe_price_id = 'price_1SxTUDRtoRrRsqHgxC88X3B3'
WHERE name = 'Professional';

UPDATE public.doctor_payment_plans 
SET stripe_product_id = 'prod_TvK84oytIxLyqh', 
    stripe_price_id = 'price_1SxTUVRtoRrRsqHgmqq0wl0w'
WHERE name = 'Enterprise';