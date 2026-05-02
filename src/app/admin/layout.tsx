import PortalNav from '@/components/PortalNav'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/onboarding')
  }

  if (!profile?.is_admin) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", flex: 1 }}>
        <h1 style={{ color: "#f87171", marginBottom: "1rem" }}>Access Denied</h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>You must be an administrator to view this page.</p>
        <a href="/member/dashboard" className="btn-primary" style={{ padding: "0.8rem 1.5rem" }}>Return to Dashboard</a>
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
