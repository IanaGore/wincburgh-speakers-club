import PortalNav from '@/components/PortalNav'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/onboarding')
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <PortalNav isAdminView={false} />
      {children}
    </div>
  )
}
