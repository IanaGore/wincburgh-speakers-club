import PortalNav from '@/components/PortalNav'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import '../portal.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
      <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--sans)', padding: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, color: 'var(--ink)', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: '2rem' }}>You must be an administrator to view this page.</p>
        <a href="/member/dashboard" className="wsc-btn wsc-btn-primary">Return to Dashboard</a>
      </div>
    )
  }

  return (
    <div className="portal-root" style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--sans)' }}>
      <PortalNav isAdminView={true} />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 56px' }}>
        {children}
      </main>
    </div>
  )
}
