import { createClient } from '@/utils/supabase/server'
import { addCustomRole, deleteRoleFromForm } from './actions'
import Link from 'next/link'
import CopyAgendaButton from './CopyAgendaButton'
import RemoveRoleButton from './RemoveRoleButton'
import { groupAssignments } from '@/lib/assignments'

function AssignmentRow({ assignment, meetingId }: { assignment: any; meetingId: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--rule-soft)' }}>
      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{assignment.role_name}</span>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ color: assignment.member_id ? 'var(--clay)' : 'var(--ink-4)', fontSize: '0.9rem' }}>
          {assignment.member_id ? (assignment.profiles?.full_name || 'Member') : 'Open'}
        </span>
        <RemoveRoleButton assignmentId={assignment.id} meetingId={meetingId} actionFn={deleteRoleFromForm} />
      </div>
    </div>
  )
}

export default async function ManageMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, meeting_assignments(*, profiles(full_name))')
    .eq('id', id)
    .single()

  if (!meeting) return <div>Meeting not found</div>

  const { pairs, unpaired, others } = groupAssignments(meeting.meeting_assignments ?? [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/admin/meetings" style={{ color: 'var(--ink-3)', fontSize: '0.9rem', textDecoration: 'none', fontFamily: 'var(--mono)' }}>← Sessions</Link>
          <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 28, margin: '8px 0 0', color: 'var(--ink)' }}>
            {new Date(meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h1>
        </div>
        <Link href={`/admin/meetings/${id}/summary`} className="wsc-btn wsc-btn-ghost">
          Summary / Notes →
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Roles List */}
        <div className="wsc-card" style={{ flex: '2', minWidth: '400px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: 0, color: 'var(--ink)' }}>Roles</h2>
            <CopyAgendaButton meeting={meeting} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {others.map((a: any) => <AssignmentRow key={a.id} assignment={a} meetingId={id} />)}

            {pairs.map(({ speech, evaluator }: any) => (
              <div key={speech.id} style={{ borderBottom: '1px solid var(--rule-soft)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <AssignmentRow assignment={speech} meetingId={id} />
                {speech.member_id && (speech.speech_title || speech.speech_level) && (
                  <div style={{ paddingLeft: '1rem', paddingBottom: '0.4rem', fontSize: '0.82rem', color: 'var(--ink-3)' }}>
                    {speech.speech_level && <span style={{ color: 'var(--clay)', marginRight: '0.4rem' }}>[{speech.speech_level}]</span>}
                    {speech.speech_title && <span style={{ color: 'var(--ink-2)' }}>{speech.speech_title}</span>}
                    {speech.speech_length && <span style={{ color: 'var(--ink-4)', marginLeft: '0.4rem' }}>({speech.speech_length})</span>}
                  </div>
                )}
                {evaluator && (
                  <div style={{ paddingLeft: '1.5rem', borderLeft: '2px solid var(--rule)', marginLeft: '0.5rem' }}>
                    <AssignmentRow assignment={evaluator} meetingId={id} />
                  </div>
                )}
              </div>
            ))}

            {unpaired.map((a: any) => <AssignmentRow key={a.id} assignment={a} meetingId={id} />)}

            {meeting.meeting_assignments.length === 0 && (
              <p style={{ color: 'var(--ink-3)' }}>No roles assigned. Add some below.</p>
            )}
          </div>
        </div>

        {/* Add Custom Role */}
        <div className="wsc-card" style={{ flex: '1', minWidth: '300px', height: 'fit-content', padding: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Add Custom Role</h2>
          <form action={addCustomRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="hidden" name="meeting_id" value={meeting.id} />
            <input type="text" name="role_name" placeholder="e.g. 'Guest Speaker'" required className="wsc-input" />
            <button type="submit" className="wsc-btn wsc-btn-primary">Add Role</button>
          </form>
        </div>
      </div>
    </div>
  )
}
