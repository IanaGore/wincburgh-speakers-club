import { createClient } from '@/utils/supabase/server'
import NavbarServer from '@/components/NavbarServer'
import Footer from '@/components/Footer'
import PhotoSlot from '@/components/ui/PhotoSlot'
import Link from 'next/link'
import './meetings.css'

export const metadata = { title: 'Meetings | West Lothian Speakers Club' }

export default async function MeetingsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, meeting_date, theme')
    .gte('meeting_date', today)
    .order('meeting_date', { ascending: true })

  const { data: settings } = await supabase
    .from('site_settings')
    .select('venue_name, meeting_time')
    .eq('id', 1)
    .single()

  const venueName  = settings?.venue_name  ?? 'Winchburgh Community Centre'
  const meetingTime = settings?.meeting_time ?? '7:00pm'

  return (
    <div className="meetings-page">
      <NavbarServer />
      <main>
        <section className="meetings-hero">
          <PhotoSlot mediaKey="meetings_hero" width="100%" height="100%" label="meetings hero" style={{ position: 'absolute', inset: 0 }} />
          <div className="meetings-hero__overlay">
            <h1 className="meetings-hero__title">Upcoming Meetings</h1>
          </div>
        </section>

        <section className="meetings-content">
          {meetings && meetings.length > 0 ? (
            <ul className="meetings-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {meetings.map(m => {
                const d = new Date(m.meeting_date)
                const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' })
                const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                return (
                  <li key={m.id}>
                    <div className="meeting-card wsc-card">
                      <div className="meeting-card__date-block">
                        <span className="meeting-card__day">{dayName}</span>
                        <span className="meeting-card__date">{dateStr}</span>
                      </div>
                      <div className="meeting-card__meta">
                        <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{meetingTime}</span>
                        <span className="meeting-card__venue">{venueName}</span>
                        {m.theme && <span style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.2rem' }}>{m.theme}</span>}
                      </div>
                      <Link href="/signup" className="wsc-btn wsc-btn-primary wsc-btn-sm">
                        RSVP
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="meetings-empty">No meetings scheduled yet — check back soon.</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
