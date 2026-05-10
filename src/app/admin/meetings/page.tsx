import { createClient } from '@/utils/supabase/server'
import { createMeeting, deleteMeeting } from './actions'
import Link from 'next/link'

export default async function AdminMeetingsPage() {
  const supabase = await createClient()

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .order('meeting_date', { ascending: true })

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px', color: 'var(--ink)' }}>Session Planner</h1>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Create Meeting Form */}
        <div className="wsc-card" style={{ flex: '1', minWidth: '300px', padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Create New Meeting</h2>
          <form action={createMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="meeting_date" className="wsc-label">Meeting Date</label>
              <input type="date" id="meeting_date" name="meeting_date" required className="wsc-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="theme" className="wsc-label">Theme (Optional)</label>
              <input type="text" id="theme" name="theme" placeholder="e.g. 'Overcoming Fear'" className="wsc-input" />
            </div>

            <button type="submit" className="wsc-btn wsc-btn-primary" style={{ marginTop: '0.5rem' }}>Create Meeting</button>
          </form>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-4)', marginTop: '1rem', lineHeight: '1.5' }}>
            Creating a meeting will automatically scaffold the standard club roles (Toastmaster, Speakers, Evaluators, etc.) making them ready for members to claim.
          </p>
        </div>

        {/* List of Meetings */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Upcoming Meetings</h2>

          {meetings?.length === 0 ? (
            <div className="wsc-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
              No upcoming meetings scheduled. Use the form to create your first one!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {meetings?.map(meeting => (
                <div key={meeting.id} className="wsc-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--serif)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 0.2rem' }}>
                      {new Date(meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <p style={{ color: 'var(--ink-3)', margin: 0, fontSize: '0.9rem' }}>Theme: {meeting.theme || 'TBD'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link href={`/admin/meetings/${meeting.id}`} className="wsc-btn wsc-btn-sm wsc-btn-ghost">
                      Manage Roles
                    </Link>
                    <Link href={`/admin/meetings/${meeting.id}/summary`} className="wsc-btn wsc-btn-sm wsc-btn-ghost">
                      Summary
                    </Link>
                    <form action={async () => {
                      'use server'
                      await deleteMeeting(meeting.id)
                    }}>
                      <button className="wsc-btn wsc-btn-sm wsc-btn-ghost">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
