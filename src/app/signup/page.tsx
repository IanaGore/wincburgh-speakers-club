import { createClient } from '@/utils/supabase/server'
import Wordmark from '@/components/Wordmark'
import Link from 'next/link'
import SignupFlow from './SignupFlow'
import './signup.css'

export default async function SignupPage() {
  const supabase = await createClient()
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, meeting_date, theme, meeting_type')
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(5)

  return (
    <div className="signup-page">
      <div className="signup-topbar">
        <Wordmark />
        <Link href="/login" style={{ fontSize: 14, color: 'var(--ink-3)' }}>Already a member? <span style={{ color: 'var(--clay)' }}>Sign in</span></Link>
      </div>
      <main className="signup-main">
        <SignupFlow meetings={meetings ?? []} />
      </main>
    </div>
  )
}
