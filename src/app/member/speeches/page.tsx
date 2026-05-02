import { createClient } from '@/utils/supabase/server'
import { logSpeech, addFeedback } from './actions'
export default async function SpeechesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: mySpeeches } = await supabase
    .from('speeches')
    .select(`
      *,
      meeting:meetings(meeting_date),
      evaluator:profiles!evaluator_id(full_name)
    `)
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  const { data: evaluatingSpeeches } = await supabase
    .from('speeches')
    .select(`
      *,
      meeting:meetings(meeting_date),
      speaker:profiles!member_id(full_name)
    `)
    .eq('evaluator_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const { data: meetings } = await supabase.from('meetings').select('id, meeting_date').order('meeting_date', { ascending: false })

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Speech Tracker</h1>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" }}>

        {/* Main Content: Speeches */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--primary)" }}>My Speeches</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {mySpeeches && mySpeeches.length > 0 ? mySpeeches.map(speech => (
                <div key={speech.id} className="card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{speech.title}</h3>
                    <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                      {speech.meeting?.meeting_date ? new Date(speech.meeting.meeting_date).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#cbd5e1", marginBottom: "1rem" }}>
                    <p><strong>Pathway:</strong> {speech.pathway || 'N/A'}</p>
                    <p><strong>Project:</strong> {speech.project || 'N/A'}</p>
                    <p><strong>Evaluator:</strong> {speech.evaluator?.full_name || 'Unassigned'}</p>
                  </div>
                  {speech.feedback_notes && (
                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", borderLeft: "3px solid var(--primary)" }}>
                      <h4 style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Evaluator Feedback</h4>
                      <p style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem", lineHeight: "1.5" }}>{speech.feedback_notes}</p>
                    </div>
                  )}
                </div>
              )) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  You haven&apos;t logged any speeches yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#10b981" }}>Speeches I&apos;m Evaluating</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {evaluatingSpeeches && evaluatingSpeeches.length > 0 ? evaluatingSpeeches.map(speech => (
                <div key={speech.id} className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #10b981" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{speech.title}</h3>
                    <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                      {speech.meeting?.meeting_date ? new Date(speech.meeting.meeting_date).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#cbd5e1", marginBottom: "1rem" }}>
                    <p><strong>Speaker:</strong> {speech.speaker?.full_name || 'Unknown'}</p>
                    <p><strong>Pathway:</strong> {speech.pathway || 'N/A'}</p>
                    <p><strong>Project:</strong> {speech.project || 'N/A'}</p>
                  </div>

                  <form action={addFeedback} style={{ marginTop: "1rem" }}>
                    <input type="hidden" name="speech_id" value={speech.id} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Your Feedback</label>
                      <textarea
                        name="feedback_notes"
                        defaultValue={speech.feedback_notes || ''}
                        rows={4}
                        placeholder="Provide constructive feedback here..."
                        style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                      />
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", background: "#10b981" }}>Save Feedback</button>
                  </form>
                </div>
              )) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  You are not assigned to evaluate any speeches.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Sidebar: Log Speech Form */}
        <aside className="card" style={{ padding: "1.5rem", position: "sticky", top: "80px" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", fontWeight: "bold" }}>Log a New Speech</h2>
          <form action={logSpeech} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Title *</label>
              <input type="text" name="title" required style={{ padding: "0.6rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Meeting</label>
              <select name="meeting_id" style={{ padding: "0.6rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }}>
                <option value="">Select a meeting...</option>
                {meetings?.map(m => (
                  <option key={m.id} value={m.id}>{new Date(m.meeting_date).toLocaleDateString()}</option>
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
                {profiles?.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || 'Unnamed'}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: "0.8rem", marginTop: "0.5rem" }}>Log Speech</button>
          </form>
        </aside>

      </div>
    </main>
  )
}
