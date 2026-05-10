import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { toggleAttendance, saveSummary } from './actions'
import PrintButton from './PrintButton'

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

export default async function MeetingSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, meeting_assignments(*, profiles(full_name))')
    .eq('id', id)
    .single()

  if (!meeting) notFound()

  const { data: allMembers } = await supabase
    .from('profiles')
    .select('id, full_name, club_roles')
    .not('full_name', 'is', null)
    .order('full_name')

  if (allMembers && allMembers.length > 0) {
    await supabase
      .from('meeting_attendance')
      .upsert(
        allMembers.map(m => ({ meeting_id: id, member_id: m.id, attended: false })),
        { onConflict: 'meeting_id,member_id', ignoreDuplicates: true }
      )
  }

  const { data: attendanceRows } = await supabase
    .from('meeting_attendance')
    .select('member_id, attended')
    .eq('meeting_id', id)

  const attendanceMap: Record<string, boolean> = {}
  for (const row of attendanceRows ?? []) {
    attendanceMap[row.member_id] = row.attended
  }

  const presentCount = Object.values(attendanceMap).filter(Boolean).length
  const totalCount   = allMembers?.length ?? 0

  const dateStr = new Date(meeting.meeting_date).toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const { pairs, unpaired, others } = groupAssignments(meeting.meeting_assignments ?? [])

  return (
    <div>
      {/* Header */}
      <div className="no-print" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: 0, color: 'var(--ink)' }}>Session Summary</h1>
          <PrintButton />
        </div>
        <Link href={`/admin/meetings/${id}`} className="wsc-btn wsc-btn-ghost" style={{ display: 'inline-flex', marginTop: '1rem' }}>
          ← Back to Roles
        </Link>
      </div>

      {/* ===== SECTION A: PROGRAMME (printable) ===== */}
      <div className="wsc-card" style={{ padding: '2rem', marginBottom: '2rem' }} id="programme">
        {/* Print header — only visible when printing */}
        <div className="print-only" style={{ display: 'none', marginBottom: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', margin: 0, fontFamily: 'var(--serif)' }}>Winchburgh Speakers Club</h2>
          <p style={{ color: 'var(--ink-3)', margin: '0.3rem 0 0' }}>Session Programme</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: 0, color: 'var(--ink)' }}>{dateStr}</h2>
            {meeting.theme && <p style={{ color: 'var(--ink-3)', margin: '0.3rem 0 0' }}>Theme: {meeting.theme}</p>}
          </div>
        </div>

        {/* Standalone roles */}
        {others.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            {others.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{a.role_name}</span>
                <span style={{ color: a.member_id ? 'var(--ink-2)' : 'var(--ink-4)' }}>{a.member_id ? (a.profiles?.full_name || 'Member') : 'Open'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Speech / evaluator pairs */}
        {pairs.map(({ speech, evaluator }: any) => (
          <div key={speech.id} style={{ marginBottom: '1.2rem', paddingBottom: '1.2rem', borderBottom: '1px solid var(--rule-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{speech.role_name}</span>
              <span style={{ color: speech.member_id ? 'var(--ink-2)' : 'var(--ink-4)' }}>{speech.member_id ? (speech.profiles?.full_name || 'Member') : 'Open'}</span>
            </div>
            {speech.member_id && speech.speech_title && (
              <div style={{ paddingLeft: '1rem', marginTop: '0.3rem', fontSize: '0.88rem', color: 'var(--ink-3)' }}>
                {speech.speech_level && <span style={{ color: 'var(--clay)', marginRight: '0.4rem' }}>[{speech.speech_level}]</span>}
                <em>&quot;{speech.speech_title}&quot;</em>
                {speech.speech_length && <span style={{ marginLeft: '0.4rem', color: 'var(--ink-4)' }}>({speech.speech_length})</span>}
              </div>
            )}
            {evaluator && (
              <div style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', borderLeft: '2px solid var(--rule)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--ink-3)' }}>{evaluator.role_name}</span>
                <span style={{ fontSize: '0.9rem', color: evaluator.member_id ? 'var(--ink-2)' : 'var(--ink-4)' }}>{evaluator.member_id ? (evaluator.profiles?.full_name || 'Member') : 'Open'}</span>
              </div>
            )}
          </div>
        ))}

        {unpaired.map((a: any) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rule-soft)' }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{a.role_name}</span>
            <span style={{ color: a.member_id ? 'var(--ink-2)' : 'var(--ink-4)' }}>{a.member_id ? (a.profiles?.full_name || 'Member') : 'Open'}</span>
          </div>
        ))}
      </div>

      {/* ===== SECTION B: ATTENDANCE ===== */}
      <div className="wsc-card no-print" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: 0, color: 'var(--ink)' }}>Attendance</h2>
          <span className="wsc-tag wsc-tag-clay">{presentCount} / {totalCount} present</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
          {allMembers?.map(member => {
            const attended = attendanceMap[member.id] ?? false
            return (
              <form key={member.id} action={toggleAttendance} style={{ display: 'contents' }}>
                <input type="hidden" name="meeting_id" value={id} />
                <input type="hidden" name="member_id" value={member.id} />
                <input type="hidden" name="attended" value={attended ? 'true' : 'false'} />
                <button
                  type="submit"
                  className={`wsc-btn wsc-btn--ghost${attended ? ' wsc-btn--active' : ''}`}
                  style={attended ? { borderColor: 'var(--clay)', background: 'var(--clay-soft)' } : undefined}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{member.full_name}</span>
                  <span style={{ fontSize: '0.8rem', color: attended ? 'var(--clay-deep)' : 'var(--ink-4)', fontWeight: 600 }}>
                    {attended ? 'Present' : 'Absent'}
                  </span>
                </button>
              </form>
            )
          })}
        </div>
      </div>

      {/* ===== SECTION C: SESSION NOTES ===== */}
      <div className="wsc-card no-print" style={{ padding: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0 0 1.2rem', color: 'var(--ink)' }}>Session Notes</h2>
        <form action={saveSummary} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="meeting_id" value={id} />
          <textarea
            name="summary"
            rows={8}
            defaultValue={meeting.summary || ''}
            placeholder="Write up what happened on the night — highlights, attendance notes, any actions for the committee..."
            className="wsc-input"
            style={{ resize: 'vertical', lineHeight: '1.6' }}
          />
          <div>
            <button type="submit" className="wsc-btn wsc-btn-primary">Save Notes</button>
          </div>
        </form>
      </div>
    </div>
  )
}
