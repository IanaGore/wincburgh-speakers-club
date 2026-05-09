import { createClient } from '@/utils/supabase/server'
import { logSpeech, deleteSpeech } from './actions'
import FeedbackForm from './FeedbackForm'

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SpeechesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Session speeches from the dashboard (meeting_assignments)
  const { data: sessionSpeeches } = await supabase
    .from('meeting_assignments')
    .select(`id, role_name, speech_title, speech_level, speech_length, meeting_id, meetings ( meeting_date )`)
    .like('role_name', 'Speech%')
    .eq('member_id', user.id)
    .not('speech_title', 'is', null)

  // Session evaluator slots
  const { data: sessionEvals } = await supabase
    .from('meeting_assignments')
    .select(`id, role_name, meeting_id, meetings ( meeting_date )`)
    .like('role_name', 'Evaluator%')
    .eq('member_id', user.id)

  // Sort both by meeting date descending
  const sortByDate = (a: any, b: any) =>
    (b.meetings?.meeting_date ?? '').localeCompare(a.meetings?.meeting_date ?? '')
  const sortedSessionSpeeches = (sessionSpeeches ?? []).sort(sortByDate)
  const sortedSessionEvals    = (sessionEvals ?? []).sort(sortByDate)

  // Manually logged speeches (speeches table)
  const { data: mySpeeches } = await supabase
    .from('speeches')
    .select(`*, meeting:meetings(meeting_date), evaluator:profiles!evaluator_id(full_name)`)
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  // Manually logged speeches being evaluated by this user
  const { data: evaluatingSpeeches } = await supabase
    .from('speeches')
    .select(`*, meeting:meetings(meeting_date), speaker:profiles!member_id(full_name)`)
    .eq('evaluator_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const { data: meetings } = await supabase.from('meetings').select('id, meeting_date').order('meeting_date', { ascending: false })

  // Exclude current user from evaluator dropdown
  const evaluatorOptions = (profiles ?? []).filter(p => p.id !== user.id)

  const cardStyle = {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "1.5rem"
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Speech Tracker</h1>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* ── Session Speeches (from dashboard assignments) ── */}
          <section>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem", color: "var(--primary)" }}>Session Speeches</h2>
            {sortedSessionSpeeches.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {sortedSessionSpeeches.map((s: any) => (
                  <div key={s.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: "0 0 0.25rem" }}>{s.speech_title}</h3>
                        <div style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                          {s.speech_level && <span style={{ color: "var(--primary)", marginRight: "0.5rem" }}>[{s.speech_level}]</span>}
                          {s.speech_length && <span>{s.speech_length}</span>}
                        </div>
                      </div>
                      <span style={{ color: "#94a3b8", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                        {s.meetings?.meeting_date ? fmtDate(s.meetings.meeting_date) : 'No date'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...cardStyle, textAlign: "center", color: "#94a3b8" }}>
                No session speeches yet — volunteer for a speech slot on the dashboard.
              </div>
            )}
          </section>

          {/* ── Session Evaluations ── */}
          {sortedSessionEvals.length > 0 && (
            <section>
              <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem", color: "#10b981" }}>Session Evaluations</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {sortedSessionEvals.map((e: any) => (
                  <div key={e.id} style={{ ...cardStyle, borderLeft: "4px solid #10b981" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <span style={{ fontWeight: "600" }}>{e.role_name}</span>
                      <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                        {e.meetings?.meeting_date ? fmtDate(e.meetings.meeting_date) : 'No date'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Manually Logged Speeches ── */}
          <section>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem", color: "var(--primary)" }}>Manually Logged Speeches</h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>For speeches not recorded through the dashboard (e.g. historical entries).</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {mySpeeches && mySpeeches.length > 0 ? mySpeeches.map(speech => (
                <div key={speech.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>{speech.title}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                        {speech.meeting?.meeting_date ? fmtDate(speech.meeting.meeting_date) : 'No date'}
                      </span>
                      <form action={deleteSpeech} onSubmit={(e) => { if (!confirm('Delete this speech entry?')) e.preventDefault() }}>
                        <input type="hidden" name="speechId" value={speech.id} />
                        <button type="submit" style={{ background: "none", border: "none", color: "#f87171", fontSize: "0.8rem", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Delete</button>
                      </form>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#cbd5e1", marginBottom: "1rem" }}>
                    <p style={{ margin: "0.2rem 0" }}><strong>Pathway:</strong> {speech.pathway || '—'}</p>
                    <p style={{ margin: "0.2rem 0" }}><strong>Project:</strong> {speech.project || '—'}</p>
                    <p style={{ margin: "0.2rem 0" }}><strong>Evaluator:</strong> {speech.evaluator?.full_name || 'Unassigned'}</p>
                  </div>
                  {speech.feedback_notes && (
                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", borderLeft: "3px solid var(--primary)" }}>
                      <h4 style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Evaluator Feedback</h4>
                      <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: "1.5", margin: 0 }}>{speech.feedback_notes}</p>
                    </div>
                  )}
                </div>
              )) : (
                <div style={{ ...cardStyle, textAlign: "center", color: "#94a3b8" }}>
                  No manually logged speeches. Use the form to add historical entries.
                </div>
              )}
            </div>
          </section>

          {/* ── Evaluations I'm assigned (manually logged speeches) ── */}
          {evaluatingSpeeches && evaluatingSpeeches.length > 0 && (
            <section>
              <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem", color: "#10b981" }}>Evaluating (Logged Speeches)</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {evaluatingSpeeches.map(speech => (
                  <div key={speech.id} style={{ ...cardStyle, borderLeft: "4px solid #10b981" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>{speech.title}</h3>
                      <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                        {speech.meeting?.meeting_date ? fmtDate(speech.meeting.meeting_date) : 'No date'}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "#cbd5e1", margin: "0.2rem 0 0.8rem" }}>
                      <strong>Speaker:</strong> {speech.speaker?.full_name || 'Unknown'}
                    </p>
                    <FeedbackForm speechId={speech.id} defaultValue={speech.feedback_notes || ''} />
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Sidebar: Log Speech Form */}
        <aside style={{ ...cardStyle, position: "sticky", top: "80px" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem", fontWeight: "bold" }}>Log a Historical Speech</h2>
          <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "1rem" }}>For speeches not recorded through the session dashboard.</p>
          <form action={logSpeech} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Title *</label>
              <input type="text" name="title" required style={{ padding: "0.6rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Meeting</label>
              <select name="meeting_id" style={{ padding: "0.6rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }}>
                <option value="">Select a meeting...</option>
                {meetings?.map(m => (
                  <option key={m.id} value={m.id}>{fmtDate(m.meeting_date)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Pathway</label>
              <input type="text" name="pathway" placeholder="e.g. Dynamic Leadership" style={{ padding: "0.6rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Project</label>
              <input type="text" name="project" placeholder="e.g. Ice Breaker" style={{ padding: "0.6rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Evaluator</label>
              <select name="evaluator_id" style={{ padding: "0.6rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }}>
                <option value="">Select evaluator...</option>
                {evaluatorOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || 'Unnamed'}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: "0.7rem", marginTop: "0.25rem" }}>Log Speech</button>
          </form>
        </aside>

      </div>
    </main>
  )
}
