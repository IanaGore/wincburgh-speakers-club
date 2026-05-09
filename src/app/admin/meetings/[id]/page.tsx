import { createClient } from '@/utils/supabase/server'
import { addCustomRole, deleteRoleFromForm } from './actions'
import Link from 'next/link'
import CopyAgendaButton from './CopyAgendaButton'
import RemoveRoleButton from './RemoveRoleButton'

function getRoleNumber(name: string): number | null {
  const m = name.match(/(\d+)$/)
  return m ? parseInt(m[1]) : null
}

function groupAssignments(assignments: any[]) {
  const speeches  = assignments.filter(a => a.role_name.startsWith('Speech'))
  const evaluators = assignments.filter(a => a.role_name.startsWith('Evaluator'))
  const others    = assignments.filter(a => !a.role_name.startsWith('Speech') && !a.role_name.startsWith('Evaluator'))
  const pairs = speeches.map(s => ({
    speech: s,
    evaluator: evaluators.find(e => getRoleNumber(e.role_name) === getRoleNumber(s.role_name)) ?? null
  }))
  const unpaired = evaluators.filter(e => !speeches.some(s => getRoleNumber(s.role_name) === getRoleNumber(e.role_name)))
  return { pairs, unpaired, others }
}

function AssignmentRow({ assignment, meetingId }: { assignment: any; meetingId: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontWeight: "600" }}>{assignment.role_name}</span>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <span style={{ color: assignment.member_id ? "var(--primary)" : "#94a3b8", fontSize: "0.9rem" }}>
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
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>
          Manage Session: {new Date(meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href={`/admin/meetings/${id}/summary`} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}>
            Summary / Notes →
          </Link>
          <Link href="/admin/meetings" style={{ color: "var(--primary)" }}>← Back</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        {/* Roles List */}
        <div style={{ flex: "2", minWidth: "400px", background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem" }}>Roles</h2>
            <CopyAgendaButton meeting={meeting} />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Standalone roles first (Chairperson, Timekeeper, etc.) */}
            {others.map((a: any) => <AssignmentRow key={a.id} assignment={a} meetingId={id} />)}

            {/* Speech / Evaluator pairs */}
            {pairs.map(({ speech, evaluator }: any) => (
              <div key={speech.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                <AssignmentRow assignment={speech} meetingId={id} />
                {speech.member_id && (speech.speech_title || speech.speech_level) && (
                  <div style={{ paddingLeft: "1rem", paddingBottom: "0.4rem", fontSize: "0.82rem", color: "#94a3b8" }}>
                    {speech.speech_level && <span style={{ color: "var(--primary)", marginRight: "0.4rem" }}>[{speech.speech_level}]</span>}
                    {speech.speech_title && <span style={{ color: "#cbd5e1" }}>{speech.speech_title}</span>}
                    {speech.speech_length && <span style={{ color: "#64748b", marginLeft: "0.4rem" }}>({speech.speech_length})</span>}
                  </div>
                )}
                {evaluator && (
                  <div style={{ paddingLeft: "1.5rem", borderLeft: "2px solid rgba(14, 165, 233, 0.2)", marginLeft: "0.5rem" }}>
                    <AssignmentRow assignment={evaluator} meetingId={id} />
                  </div>
                )}
              </div>
            ))}

            {/* Unpaired evaluators (edge case) */}
            {unpaired.map((a: any) => <AssignmentRow key={a.id} assignment={a} meetingId={id} />)}

            {meeting.meeting_assignments.length === 0 && (
              <p style={{ color: "#94a3b8" }}>No roles assigned. Add some below.</p>
            )}
          </div>
        </div>

        {/* Add Custom Role */}
        <div style={{ flex: "1", minWidth: "300px", height: "fit-content", background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Add Custom Role</h2>
          <form action={addCustomRole} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input type="hidden" name="meeting_id" value={meeting.id} />
            <input type="text" name="role_name" placeholder="e.g. 'Guest Speaker'" required style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            <button type="submit" className="btn-primary">Add Role</button>
          </form>
        </div>
      </div>
    </div>
  )
}
