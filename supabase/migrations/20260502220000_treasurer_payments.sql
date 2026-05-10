CREATE TABLE IF NOT EXISTS public.payment_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.member_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id uuid REFERENCES public.payment_periods(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_paid boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(period_id, member_id)
);

-- RLS
ALTER TABLE public.payment_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view payment periods" ON public.payment_periods FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment periods" ON public.payment_periods FOR ALL USING (public.is_admin());

ALTER TABLE public.member_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payments" ON public.member_payments FOR ALL USING (public.is_admin());
CREATE POLICY "Members can view own payments" ON public.member_payments FOR SELECT USING (auth.uid() = member_id);

-- Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
