-- Add follow-up date column to appointments for reminders
ALTER TABLE public.appointments 
ADD COLUMN follow_up_date date;

-- Add follow-up reminder sent flag
ALTER TABLE public.appointments 
ADD COLUMN follow_up_reminder_sent boolean DEFAULT false;

-- Create index for follow-up queries
CREATE INDEX idx_appointments_follow_up ON public.appointments(follow_up_date) WHERE follow_up_date IS NOT NULL;