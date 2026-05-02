import PortalNav from '@/components/PortalNav'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function PaymentsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin, club_roles')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/onboarding')
  }

  const canAccess = profile?.is_admin || profile?.club_roles?.includes('Treasurer')

  if (!canAccess) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <PortalNav isAdminView={true} />
        <div style={{ padding: "4rem", textAlign: "center", flex: 1 }}>
          <h1 style={{ color: "#f87171", marginBottom: "1rem" }}>Access Denied</h1>
          <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>Only administrators and the club treasurer can manage payments.</p>
          <a href="/member/dashboard" className="btn-primary" style={{ padding: "0.8rem 1.5rem" }}>Return to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <PortalNav isAdminView={true} />
      {children}
    </div>
  )
}
