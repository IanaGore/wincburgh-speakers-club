import { createClient } from '@/utils/supabase/server'
import { VENUE_COLUMNS } from '@/lib/venue'
import NavbarServer from '@/components/NavbarServer'
import Footer from '@/components/Footer'
import GetStartedClient from './GetStartedClient'
import './get-started.css'

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>
}) {
  const { intent } = await searchParams
  const validIntent = intent === 'attend' || intent === 'ask' ? intent : null

  const supabase = await createClient()

  const [{ data: meetings }, { data: venue }, { data: facilities }] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, meeting_date, theme, meeting_type')
      .gte('meeting_date', new Date().toISOString().split('T')[0])
      .order('meeting_date', { ascending: true })
      .limit(5),
    supabase
      .from('site_settings')
      .select(VENUE_COLUMNS)
      .eq('id', 1)
      .single(),
    supabase
      .from('facilities')
      .select('id, icon, label')
      .order('sort_order', { ascending: true }),
  ])

  return (
    <>
      <NavbarServer />
      <main className="get-started-page">
        <GetStartedClient
          initialIntent={validIntent}
          meetings={meetings ?? []}
          venue={venue ?? null}
          facilities={facilities ?? []}
        />
      </main>
      <Footer />
    </>
  )
}
