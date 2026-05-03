-- Returns id + full_name for all active members with a name set.
-- SECURITY DEFINER bypasses the tightened RLS on profiles so any
-- authenticated user can populate role-assignment dropdowns without
-- exposing sensitive fields (phone, contact_email).
CREATE OR REPLACE FUNCTION public.get_member_directory()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name
  FROM public.profiles
  WHERE full_name IS NOT NULL
    AND is_active = true
  ORDER BY full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated;
