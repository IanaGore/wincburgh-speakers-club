import { createClient } from '@/utils/supabase/server'
import { VENUE_COLUMNS } from '@/lib/venue'
import NavbarServer from '@/components/NavbarServer'
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

  const { data: venue } = await supabase
    .from('site_settings')
    .select(VENUE_COLUMNS)
    .eq('id', 1)
    .single()

  return (
    <div className="signup-page">
      <NavbarServer />
      <main className="signup-main">
        <SignupFlow meetings={meetings ?? []} venue={venue ?? null} />
      </main>
    </div>
  )
}
