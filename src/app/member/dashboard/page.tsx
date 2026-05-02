import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { volunteerForRole, dropRole } from './actions'
import VolunteerForm from './VolunteerForm'

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
        id, role_name, member_id, speech_title, speech_level, speech_length,
        profiles ( full_name )
      )
    `)
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(2)

  return (
    <div style={{ padding: "2rem 5%", flex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.5rem)", fontWeight: "700", margin: 0 }}>Upcoming Sessions</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>{user.email}</p>
      </div>
      
      <div style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
        {meetings?.map((meeting: any) => {
          const filledRoles = meeting.meeting_assignments?.filter((a: any) => a.member_id).length || 0
          const totalRoles = meeting.meeting_assignments?.length || 0
          
          return (
            <div key={meeting.id} style={{ background: "var(--card-bg)", padding: "clamp(1rem, 4vw, 2rem)", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "0.5rem" }}>
                <h2 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", color: "var(--primary)", margin: 0 }}>
                  {new Date(meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <span style={{ background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.4rem 0.8rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", whiteSpace: "nowrap" }}>
                  {filledRoles}/{totalRoles} Filled
                </span>
              </div>
              <p style={{ color: "#94a3b8", marginBottom: "1.5rem", marginTop: "0.5rem" }}>Theme: {meeting.theme || 'TBD'}</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                {meeting.meeting_assignments?.map((assignment: any) => {
                  const isAssignedToMe = assignment.member_id === user.id;
                  const isUnassigned = !assignment.member_id;
                  const assigneeName = assignment.profiles?.full_name || 'Member';
                  const isSpeech = assignment.role_name.startsWith('Speech');

                  return (
                    <div key={assignment.id} style={{ 
                      padding: "1.2rem", 
                      borderRadius: "12px", 
                      background: isAssignedToMe ? "rgba(14, 165, 233, 0.1)" : "rgba(0,0,0,0.2)", 
                      border: "1px solid " + (isAssignedToMe ? "rgba(14, 165, 233, 0.5)" : "var(--card-border)"),
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "1rem" // Added gap instead of minHeight to fix wasted space
                    }}>
                      <div>
                        <div style={{ fontWeight: "700", marginBottom: "0.3rem", fontSize: "1.05rem" }}>{assignment.role_name}</div>
                        {isSpeech && assignment.speech_title && (
                          <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                            <span style={{ color: "var(--primary)" }}>[{assignment.speech_level}]</span> {assignment.speech_title} <br/>
                            <span style={{ color: "#64748b" }}>({assignment.speech_length})</span>
                          </div>
                        )}
                      </div>
                      
                      {isUnassigned ? (
                        <VolunteerForm assignment={assignment} actionFn={volunteerForRole} />
                      ) : isAssignedToMe ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--primary)", fontSize: "0.9rem", fontWeight: "bold" }}>You!</span>
                          <form action={dropRole}>
                            <input type="hidden" name="assignmentId" value={assignment.id} />
                            <button type="submit" style={{ background: "transparent", color: "#f87171", border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline", padding: 0 }}>
                              Drop out
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "500" }}>
                          🔒 {assigneeName}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {meetings?.length === 0 && (
          <div style={{ padding: "3rem", border: "1px dashed var(--card-border)", borderRadius: "12px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅</div>
              No upcoming sessions are scheduled yet. Check back soon!
          </div>
        )}
      </div>
    </div>
  )
}
