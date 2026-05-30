import { createClient } from '@/utils/supabase/server'
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

  return <Navbar portalHref={portalHref} />
}
