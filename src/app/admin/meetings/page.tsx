import { createClient } from '@/utils/supabase/server'
import { createMeeting, deleteMeeting } from './actions'
import Link from 'next/link'

export default async function AdminMeetingsPage() {
  const supabase = await createClient()

  // Fetch all upcoming meetings
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .order('meeting_date', { ascending: true })

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Admin: Session Planner</h1>
      </div>
      
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        {/* Create Meeting Form */}
        <div style={{ flex: "1", minWidth: "300px", background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)", height: "fit-content" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Create New Meeting</h2>
          <form action={createMeeting} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="meeting_date" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Meeting Date</label>
              <input type="date" id="meeting_date" name="meeting_date" required style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", colorScheme: "dark" }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="theme" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Theme (Optional)</label>
              <input type="text" id="theme" name="theme" placeholder="e.g. 'Overcoming Fear'" style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>Create Meeting</button>
          </form>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "1rem", lineHeight: "1.5" }}>
            * Creating a meeting will automatically scaffold the standard club roles (Toastmaster, Speakers, Evaluators, etc.) making them ready for members to claim.
          </p>
        </div>

        {/* List of Meetings */}
        <div style={{ flex: "2", minWidth: "400px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Upcoming Meetings</h2>
          
          {meetings?.length === 0 ? (
            <div style={{ padding: "2rem", border: "1px dashed var(--card-border)", borderRadius: "12px", textAlign: "center", color: "#94a3b8" }}>
              No upcoming meetings scheduled. Use the form to create your first one!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {meetings?.map(meeting => (
                <div key={meeting.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)", padding: "1.5rem", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--primary)" }}>
                      {new Date(meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <p style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>Theme: {meeting.theme || 'TBD'}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <Link href={`/admin/meetings/${meeting.id}`} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                      Manage Roles
                    </Link>
                    <Link href={`/admin/meetings/${meeting.id}/summary`} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}>
                      Summary
                    </Link>
                    <form action={async () => {
                      'use server'
                      await deleteMeeting(meeting.id)
                    }}>
                      <button className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#f87171" }}>
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
