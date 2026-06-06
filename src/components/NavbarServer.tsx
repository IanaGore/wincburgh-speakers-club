import { createClient } from '@/utils/supabase/server'
import { formatMeetingShort, VENUE_COLUMNS } from '@/lib/venue'
import Navbar from './Navbar'

export default async function NavbarServer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let portalHref: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    portalHref = profile?.is_admin ? '/admin/meetings' : '/member/dashboard'
  }

  const { data: settings } = await supabase
    .from('site_settings')
    .select(VENUE_COLUMNS)
    .eq('id', 1)
    .single()

  return <Navbar portalHref={portalHref} meetingShort={formatMeetingShort(settings ?? {})} />
}
