import { createClient } from '@/utils/supabase/server'
import { logSpeech } from './actions'
import FeedbackForm from './FeedbackForm'
import DeleteSpeechButton from './DeleteSpeechButton'
import RemoveSessionSpeechButton from './RemoveSessionSpeechButton'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import PathwayTracker from './PathwayTracker'
import './speeches.css'

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SpeechesPage({
  searchParams,
}: {
  searchParams: Promise<{ logged?: string; error?: string }>
}) {
  const { logged, error: logError } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const sortByDate = (a: any, b: any) =>
    (b.meetings?.meeting_date ?? '').localeCompare(a.meetings?.meeting_date ?? '')

  const { data: sessionSpeeches } = await supabase
    .from('meeting_assignments')
    .select('id, role_name, speech_title, speech_level, speech_length, meeting_id, meetings ( meeting_date )')
    .like('role_name', 'Speech%')
    .eq('member_id', user.id)
    .not('speech_title', 'is', null)
  const sortedSessionSpeeches = (sessionSpeeches ?? []).sort(sortByDate)

  const { data: sessionEvals } = await supabase
    .from('meeting_assignments')
    .select('id, role_name, meeting_id, meetings ( meeting_date )')
    .like('role_name', 'Evaluator%')
    .eq('member_id', user.id)
  const sortedSessionEvals = (sessionEvals ?? []).sort(sortByDate)

  const { data: mySpeeches } = await supabase
    .from('speeches')
    .select('*, speech_date, meeting:meetings(meeting_date), evaluator:profiles!speeches_evaluator_id_fkey(full_name)')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  const { data: evaluatingSpeeches } = await supabase
    .from('speeches')
    .select('*, meeting:meetings(meeting_date), speaker:profiles!speeches_member_id_fkey(full_name)')
    .eq('evaluator_id', user.id)
    .order('created_at', { ascending: false })

  const { data: pathwayProgress } = await supabase
    .from('speech_pathway_progress')
    .select('pathway_code, completed, completed_at, speech_title')
    .eq('member_id', user.id)

  const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const { data: meetings } = await supabase.from('meetings').select('id, meeting_date').order('meeting_date', { ascending: false })
  const evaluatorOptions = (profiles ?? []).filter(p => p.id !== user.id)

  return (
    <main className="speeches-page">
      <header className="speeches-header">
        <EyebrowLabel>Member</EyebrowLabel>
        <h1>Speech Tracker</h1>
      </header>

      <div className="speeches-layout">
        <div className="speeches-main">

          {/* Session Speeches */}
          <section className="speeches-section">
            <h2>Session Speeches</h2>
            <div className="speeches-list">
              {sortedSessionSpeeches.length > 0 ? sortedSessionSpeeches.map((s: any) => (
                <div key={s.id} className="wsc-card speech-card">
                  <div className="speech-card__body">
                    <h3 className="speech-card__title">{s.speech_title}</h3>
                    <div className="speech-card__meta">
                      {s.speech_level && <span className="wsc-tag wsc-tag-gold">{s.speech_level}</span>}
                      {s.speech_length && <span>{s.speech_length}</span>}
                    </div>
                  </div>
                  <div className="speech-card__actions">
                    <span className="speech-card__date">
                      {s.meetings?.meeting_date ? fmtDate(s.meetings.meeting_date) : 'No date'}
                    </span>
                    {(!s.meetings?.meeting_date || s.meetings.meeting_date >= new Date().toISOString().slice(0, 10)) && (
                      <RemoveSessionSpeechButton assignmentId={s.id} />
                    )}
                  </div>
                </div>
              )) : (
                <div className="wsc-card speech-card__empty">
                  No session speeches yet — volunteer for a speech slot on the dashboard.
                </div>
              )}
            </div>
          </section>

          {/* Session Evaluations */}
          {sortedSessionEvals.length > 0 && (
            <section className="speeches-section speeches-section--evals">
              <h2>Session Evaluations</h2>
              <div className="speeches-list">
                {sortedSessionEvals.map((e: any) => (
                  <div key={e.id} className="wsc-card speech-card speech-card--eval-border">
                    <span className="speech-card__role-name">{e.role_name}</span>
                    <span className="speech-card__date">
                      {e.meetings?.meeting_date ? fmtDate(e.meetings.meeting_date) : 'No date'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pathway Progress */}
          <PathwayTracker progress={pathwayProgress ?? []} />

          {/* Manually Logged Speeches */}
          <section className="speeches-section">
            <h2>Manually Logged Speeches</h2>
            <p className="speeches-section__hint">
              For speeches not recorded through the dashboard (e.g. historical entries).
            </p>
            <div className="speeches-list">
              {mySpeeches && mySpeeches.length > 0 ? mySpeeches.map(speech => (
                <div key={speech.id} className="wsc-card">
                  <div className="speech-card">
                    <div className="speech-card__body">
                      <h3 className="speech-card__title">{speech.title}</h3>
                    </div>
                    <div className="speech-card__actions">
                      <span className="speech-card__date">
                        {speech.speech_date
                          ? fmtDate(speech.speech_date)
                          : speech.meeting?.meeting_date
                            ? fmtDate(speech.meeting.meeting_date)
                            : 'No date'}
                      </span>
                      <DeleteSpeechButton speechId={speech.id} />
                    </div>
                  </div>
                  <div className="speech-card__details">
                    <span><strong>Pathway:</strong> {speech.pathway || '—'}</span>
                    <span><strong>Project:</strong> {speech.project || '—'}</span>
                    <span><strong>Evaluator:</strong> {speech.evaluator?.full_name || 'Unassigned'}</span>
                  </div>
                  {speech.feedback_notes && (
                    <div className="speech-card__feedback">
                      <h4 className="speech-card__feedback-heading">Evaluator Feedback</h4>
                      <p className="speech-card__feedback-body">{speech.feedback_notes}</p>
                    </div>
                  )}
                </div>
              )) : (
                <div className="wsc-card speech-card__empty">
                  No manually logged speeches. Use the form to add historical entries.
                </div>
              )}
            </div>
          </section>

          {/* Evaluations I'm Assigned */}
          {evaluatingSpeeches && evaluatingSpeeches.length > 0 && (
            <section className="speeches-section speeches-section--evals">
              <h2>Evaluating (Logged Speeches)</h2>
              <div className="speeches-list">
                {evaluatingSpeeches.map(speech => (
                  <div key={speech.id} className="wsc-card speech-card--eval-border speech-card--eval-padded">
                    <div className="speech-card">
                      <div className="speech-card__body">
                        <h3 className="speech-card__title">{speech.title}</h3>
                        <p className="speech-card__speaker">
                          <strong>Speaker:</strong> {speech.speaker?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <span className="speech-card__date">
                        {speech.meeting?.meeting_date ? fmtDate(speech.meeting.meeting_date) : 'No date'}
                      </span>
                    </div>
                    <FeedbackForm speechId={speech.id} defaultValue={speech.feedback_notes || ''} />
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Sidebar: Log Speech Form */}
        <aside className="speeches-sidebar wsc-card">
          {logged ? (
            <div className="speeches-confirm">
              <div className="speeches-confirm__icon">✓</div>
              <h2>Speech logged!</h2>
              <p className="speeches-sidebar__hint">
                &ldquo;{decodeURIComponent(logged)}&rdquo; added to your tracker.
              </p>
              <a href="/member/speeches" className="speeches-confirm__link">+ Log another</a>
            </div>
          ) : logError ? (
            <div className="speeches-error">
              <p className="speeches-error__message">Something went wrong saving your speech.</p>
              <a href="/member/speeches" className="speeches-confirm__link">Try again</a>
            </div>
          ) : (
            <>
              <h2>Log a Historical Speech</h2>
              <p className="speeches-sidebar__hint">For speeches not recorded through the session dashboard.</p>
              <form action={logSpeech} className="speeches-form">
                <div className="speeches-form__field">
                  <label className="wsc-label" htmlFor="speech-title">Title *</label>
                  <input id="speech-title" type="text" name="title" required className="wsc-input" />
                </div>
                <div className="speeches-form__field">
                  <label className="wsc-label" htmlFor="speech-date">Speech Date *</label>
                  <input id="speech-date" type="date" name="speech_date" required className="wsc-input" />
                </div>
                <div className="speeches-form__field">
                  <label className="wsc-label" htmlFor="speech-meeting">Link to a session (optional)</label>
                  <select id="speech-meeting" name="meeting_id" className="wsc-input">
                    <option value="">Select a meeting…</option>
                    {meetings?.map(m => (
                      <option key={m.id} value={m.id}>{fmtDate(m.meeting_date)}</option>
                    ))}
                  </select>
                </div>
                <div className="speeches-form__field">
                  <label className="wsc-label" htmlFor="speech-pathway">Pathway</label>
                  <input id="speech-pathway" type="text" name="pathway" placeholder="e.g. Dynamic Leadership" className="wsc-input" />
                </div>
                <div className="speeches-form__field">
                  <label className="wsc-label" htmlFor="speech-project">Project</label>
                  <input id="speech-project" type="text" name="project" placeholder="e.g. Ice Breaker" className="wsc-input" />
                </div>
                <div className="speeches-form__field">
                  <label className="wsc-label" htmlFor="speech-evaluator">Evaluator</label>
                  <select id="speech-evaluator" name="evaluator_id" className="wsc-input">
                    <option value="">Select evaluator…</option>
                    {evaluatorOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || 'Unnamed'}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="wsc-btn wsc-btn-primary">Log Speech</button>
              </form>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
