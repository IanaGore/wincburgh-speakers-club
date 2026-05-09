-- Post-session write-up field on meetings
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS summary text;

-- Attendance tracking per meeting
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attended    boolean NOT NULL DEFAULT false,
  UNIQUE (meeting_id, member_id)
);

ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attendance"
  ON public.meeting_attendance
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Members view own attendance"
  ON public.meeting_attendance
  FOR SELECT
  USING (auth.uid() = member_id);
