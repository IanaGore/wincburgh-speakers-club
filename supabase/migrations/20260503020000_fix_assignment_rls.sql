-- The original "Members can drop out of their role" policy had no WITH CHECK
-- clause, so PostgreSQL defaulted it to the same expression as USING.
-- After setting member_id = null, the new-row check (auth.uid() = null)
-- always fails, silently blocking the update and causing server action errors.
--
-- Replace with two focused policies that correctly allow:
--   1. Any authenticated user to claim an unassigned slot (volunteer / assign-on-behalf)
--   2. The assigned member to update or vacate their own slot (edit speech / drop out)

DROP POLICY IF EXISTS "Members can drop out of their role" ON public.meeting_assignments;
DROP POLICY IF EXISTS "Members can volunteer for roles"    ON public.meeting_assignments;
DROP POLICY IF EXISTS "Members can manage their own role"  ON public.meeting_assignments;

-- Claim an unassigned role (volunteer for self or assign another member)
CREATE POLICY "Members can volunteer for roles"
  ON public.meeting_assignments
  FOR UPDATE
  USING (member_id IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Edit speech details or drop out from an assigned role
CREATE POLICY "Members can manage their own role"
  ON public.meeting_assignments
  FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (true);
