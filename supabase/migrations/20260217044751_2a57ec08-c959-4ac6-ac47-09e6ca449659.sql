
-- Add review and test name columns to test_reports
ALTER TABLE public.test_reports
ADD COLUMN test_name text,
ADD COLUMN reviewed_at timestamp with time zone,
ADD COLUMN reviewed_by uuid,
ADD COLUMN review_notes text;
