import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { volunteerForRole, dropRole } from './actions'

export default async function MemberDashboard() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  // Fetch upcoming meetings with their assignments
  const { data: meetings } = await supabase
    .from('meetings')
    .select(`
      id, meeting_date, theme,
      meeting_assignments (
        id, role_name, member_id,
        profiles ( full_name )
      )
    `)
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(2)

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Member Dashboard</h1>
      </div>

      <p style={{ color: "#94a3b8", marginBottom: "3rem" }}>Welcome back, {user.email}! Here are the upcoming sessions.</p>
      
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", flexDirection: "column" }}>
        {meetings?.map((meeting: any) => (
          <div key={meeting.id} style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
            <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "0.5rem" }}>
              {new Date(meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>Theme: {meeting.theme || 'TBD'}</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {meeting.meeting_assignments?.map((assignment: any) => {
                const isAssignedToMe = assignment.member_id === user.id;
                const isUnassigned = !assignment.member_id;
                const assigneeName = assignment.profiles?.full_name || 'Member';

                return (
                  <div key={assignment.id} style={{ 
                    padding: "1rem", 
                    borderRadius: "8px", 
                    background: isAssignedToMe ? "rgba(14, 165, 233, 0.1)" : "rgba(0,0,0,0.2)", 
                    border: "1px solid " + (isAssignedToMe ? "rgba(14, 165, 233, 0.5)" : "var(--card-border)"),
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "100px"
                  }}>
                    <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>{assignment.role_name}</div>
                    
                    {isUnassigned ? (
                      <form action={async () => {
                        'use server'
                        await volunteerForRole(assignment.id)
                      }}>
                        <button type="submit" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%" }}>
                          Volunteer
                        </button>
                      </form>
                    ) : isAssignedToMe ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--primary)", fontSize: "0.9rem", fontWeight: "bold" }}>You!</span>
                        <form action={async () => {
                          'use server'
                          await dropRole(assignment.id)
                        }}>
                          <button type="submit" style={{ background: "transparent", color: "#f87171", border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>
                            Drop out
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        🔒 {assigneeName}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {meetings?.length === 0 && (
          <div style={{ padding: "2rem", border: "1px dashed var(--card-border)", borderRadius: "12px", textAlign: "center", color: "#94a3b8" }}>
              No upcoming meetings are scheduled yet. Check back soon!
          </div>
        )}
      </div>
    </div>
  )
}
