-- Add columns for member profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS club_roles text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Give users the ability to update their own avatar and roles for now
-- The existing policy "Users can update own profile" might already cover this,
-- but we ensure it's there.
