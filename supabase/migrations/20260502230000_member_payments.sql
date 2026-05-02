-- ============================================================
-- 1. Extend profiles with contact info and active status
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS contact_email  text,
  ADD COLUMN IF NOT EXISTS is_active      boolean NOT NULL DEFAULT true;

-- ============================================================
-- 2. Tighten profiles SELECT policies so contact fields are
--    only readable by the owner or an admin.
--    Drop any broad "all authenticated users" SELECT policy first.
-- ============================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 3. Helper: check if current user is treasurer or admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_treasurer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    is_admin = true
    OR 'Treasurer' = ANY(club_roles)
  )
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- ============================================================
-- 4. Payment periods table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_periods (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text        NOT NULL,
  start_date  date        NOT NULL,
  end_date    date        NOT NULL,
  created_by  uuid        REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treasurer or admin manage payment periods"
  ON public.payment_periods
  FOR ALL
  USING (public.is_treasurer_or_admin())
  WITH CHECK (public.is_treasurer_or_admin());

-- ============================================================
-- 5. Member payments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.member_payments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id  uuid        NOT NULL REFERENCES public.payment_periods(id) ON DELETE CASCADE,
  member_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  has_paid   boolean     NOT NULL DEFAULT false,
  paid_at    timestamptz,
  notes      text,
  UNIQUE (period_id, member_id)
);

ALTER TABLE public.member_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treasurer or admin manage member payments"
  ON public.member_payments
  FOR ALL
  USING (public.is_treasurer_or_admin())
  WITH CHECK (public.is_treasurer_or_admin());

CREATE POLICY "Members can view own payment status"
  ON public.member_payments
  FOR SELECT
  USING (auth.uid() = member_id);
