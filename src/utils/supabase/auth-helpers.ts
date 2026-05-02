import { createClient } from './server'

export async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (error || !profile?.is_admin) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function checkTreasurerOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, club_roles')
    .eq('id', user.id)
    .single()

  if (error || (!profile?.is_admin && !profile?.club_roles?.includes('Treasurer'))) {
    throw new Error('Unauthorized')
  }

  return user
}
