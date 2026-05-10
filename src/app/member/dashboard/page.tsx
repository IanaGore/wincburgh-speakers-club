import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { volunteerForRole, dropRole } from './actions'
import VolunteerForm from './VolunteerForm'
import EditSpeechForm from './EditSpeechForm'
import './dashboard.css'

type Member = { id: string; full_name: string }

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function getRoleNumber(name: string): number | null {
  const m = name.match(/(\d+)$/)
  return m ? parseInt(m[1]) : null
}

function groupAssignments(assignments: any[]) {
  const speeches   = assignments.filter(a => a.role_name.startsWith('Speech'))
  const evaluators = assignments.filter(a => a.role_name.startsWith('Evaluator'))
  const others     = assignments.filter(a => !a.role_name.startsWith('Speech') && !a.role_name.startsWith('Evaluator'))
  const pairs = speeches.map(s => ({
    speech: s,
    evaluator: evaluators.find(e => getRoleNumber(e.role_name) === getRoleNumber(s.role_name)) ?? null
  }))
  const unpaired = evaluators.filter(e => !speeches.some(s => getRoleNumber(s.role_name) === getRoleNumber(e.role_name)))
  return { pairs, unpaired, others }
}

function RoleRow({
  assignment,
  userId,
  members,
  meetingId,
  dark = false,
}: {
  assignment: any
  userId: string
  members: Member[]
  meetingId: string
  dark?: boolean
}) {
  const isMe         = assignment.member_id === userId
  const isOpen       = !assignment.member_id
  const isSpeech     = assignment.role_name.startsWith('Speech') || assignment.role_name.startsWith('Speaker')
  const assigneeName = assignment.profiles?.full_name ?? 'Member'

  const badgeVariant = isOpen ? 'open' : isMe ? 'you' : 'filled'
  const badgeLabel   = isOpen ? '?' : isMe ? 'YOU' : assigneeName.slice(0, 2).toUpperCase()

  return (
    <div className="dash-role">
      <span className={`dash-role__badge dash-role__badge--${badgeVariant}`}>{badgeLabel}</span>
      <span className="dash-role__name">
        {assignment.role_name}
        {isSpeech && assignment.speech_title && (
          <span className="dash-role__speech-detail">
            {' '}&mdash;{' '}
            <span className="dash-role__speech-level">[{assignment.speech_level}]</span>
            {assignment.speech_title}
          </span>
        )}
      </span>
      <div className="dash-role__actions">
        {isOpen ? (
          <VolunteerForm
            assignment={assignment}
            actionFn={volunteerForRole}
            members={members}
            meetingId={meetingId}
            dark={dark}
          />
        ) : isMe ? (
          isSpeech ? (
            <EditSpeechForm assignment={assignment} dark={dark} />
          ) : (
            <>
              <span className="dash-role__status">You</span>
              <form action={dropRole}>
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <button type="submit" className="dash-drop-btn">Drop out</button>
              </form>
            </>
          )
        ) : (
          <Link
            href={`/member/profile/${assignment.member_id}`}
            className="dash-role__status"
            style={{ textDecoration: 'none' }}
          >
            {assigneeName}
          </Link>
        )}
      </div>
    </div>
  )
}

export default async function MemberDashboard() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Upcoming meetings (3)
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
    .limit(3)

  // Speech count (gracefully handle if table doesn't exist)
  let speechCount = 0
  try {
    const { count } = await supabase
      .from('speeches')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', user.id)
    speechCount = count ?? 0
  } catch {
    // speeches table may not exist yet
  }

  // Member directory
  let members: Member[] = []
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_member_directory')
  if (!rpcError && rpcData) {
    members = rpcData
  } else {
    const { data: fallback } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('full_name', 'is', null)
      .order('full_name')
    members = fallback ?? []
  }

  const [nextMeeting, ...otherMeetings] = meetings ?? []

  const nextAssignments = nextMeeting?.meeting_assignments ?? []
  const { pairs, unpaired, others } = groupAssignments(nextAssignments)
  const allNextRoles = [...others, ...pairs.flatMap(p => [p.speech, p.evaluator].filter(Boolean)), ...unpaired]
  const filledNext = nextAssignments.filter((a: any) => a.member_id).length
  const totalNext  = nextAssignments.length

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="dashboard-page">
      {/* Greeting */}
      <div className="dashboard-greeting">
        <span className="wsc-eyebrow" style={{ color: 'var(--gold)' }}>{dateStr}</span>
        <h1>
          Good {getTimeOfDay()},{' '}
          <em style={{ fontStyle: 'italic', color: 'oklch(0.55 0.155 60)' }}>
            {profile?.first_name ?? (profile?.full_name?.split(' ')[0]) ?? 'there'}
          </em>.
        </h1>
      </div>

      <div className="dashboard-grid">
        {/* Main column */}
        <div className="dashboard-main">
          {/* Next meeting dark card */}
          {nextMeeting ? (
            <div className="dash-next">
              <div className="dash-next-header">
                <span className="wsc-eyebrow" style={{ color: 'oklch(0.68 0.030 235)' }}>Next session</span>
                <div className="dash-next-meta">
                  <h2 className="dash-next-title">
                    {new Date(nextMeeting.meeting_date).toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </h2>
                  <span className="dash-fill-badge">{filledNext}/{totalNext} filled</span>
                </div>
                {nextMeeting.theme && (
                  <p className="dash-next-theme">Theme: {nextMeeting.theme}</p>
                )}
              </div>

              <div className="dash-roles">
                {allNextRoles.map((a: any) => (
                  <RoleRow
                    key={a.id}
                    assignment={a}
                    userId={user.id}
                    members={members}
                    meetingId={nextMeeting.id}
                    dark
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="dash-empty">No upcoming sessions scheduled yet. Check back soon.</div>
          )}

          {/* Additional upcoming meetings */}
          {otherMeetings.length > 0 && (
            <div className="dash-meeting-list">
              {otherMeetings.map((meeting: any) => {
                const filled = meeting.meeting_assignments?.filter((a: any) => a.member_id).length ?? 0
                const total  = meeting.meeting_assignments?.length ?? 0
                const { pairs: mPairs, unpaired: mUnpaired, others: mOthers } = groupAssignments(meeting.meeting_assignments ?? [])
                const allRoles = [...mOthers, ...mPairs.flatMap((p: any) => [p.speech, p.evaluator].filter(Boolean)), ...mUnpaired]
                return (
                  <div key={meeting.id} className="dash-meeting-item">
                    <div className="dash-meeting-item-header">
                      <span className="dash-meeting-item-date">
                        {new Date(meeting.meeting_date).toLocaleDateString('en-GB', {
                          weekday: 'long', day: 'numeric', month: 'long'
                        })}
                      </span>
                      <span className="dash-fill-badge" style={{ border: '1px solid var(--rule)', background: 'var(--paper-2)', color: 'var(--ink-3)' }}>
                        {filled}/{total}
                      </span>
                    </div>
                    {meeting.theme && (
                      <p className="dash-meeting-item-theme">Theme: {meeting.theme}</p>
                    )}
                    <div className="dash-meeting-item-roles">
                      {allRoles.map((a: any) => (
                        <RoleRow
                          key={a.id}
                          assignment={a}
                          userId={user.id}
                          members={members}
                          meetingId={meeting.id}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          {/* Speech stats card */}
          <div className="dash-sidebar-card">
            <span className="wsc-eyebrow">My Progress</span>
            <div className="dash-stats" style={{ marginTop: 16 }}>
              <div className="dash-stat">
                <span className="dash-stat__num">{speechCount}</span>
                <span className="dash-stat__label">Speeches</span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat__num">—</span>
                <span className="dash-stat__label">Evals</span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat__num">—</span>
                <span className="dash-stat__label">Roles</span>
              </div>
            </div>
            <div className="dash-progress-bar" style={{ marginTop: 20 }}>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`dash-progress-seg${i < speechCount ? ' dash-progress-seg--done' : i === speechCount ? ' dash-progress-seg--current' : ''}`}
                />
              ))}
            </div>
            {profile?.pathway && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
                Pathway: {profile.pathway}
              </p>
            )}
          </div>

          {/* Feedback placeholder card */}
          <div className="dash-sidebar-card">
            <span className="wsc-eyebrow">Latest Feedback</span>
            <div className="dash-feedback" style={{ marginTop: 16 }}>
              <blockquote>
                &ldquo;Feedback from evaluators will appear here once the speech tracker is live.&rdquo;
              </blockquote>
              <cite>— Coming soon</cite>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
