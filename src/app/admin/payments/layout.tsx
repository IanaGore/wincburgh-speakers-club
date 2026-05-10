import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// Nav and outer wrapper come from the parent admin layout.
// This layout only adds the Treasurer access gate.
export default async function PaymentsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin, club_roles')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) redirect('/onboarding')

  const canAccess = profile?.is_admin || profile?.club_roles?.includes('Treasurer')

  if (!canAccess) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, color: 'var(--ink)', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: '2rem' }}>Only administrators and the club treasurer can manage payments.</p>
        <a href="/member/dashboard" className="wsc-btn wsc-btn-primary">Return to Dashboard</a>
      </div>
    )
  }

  return <>{children}</>
}
