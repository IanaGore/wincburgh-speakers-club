import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import CopyAgendaButton from './CopyAgendaButton'
import AssignmentRow, {
  type MeetingAssignmentItem,
  type MemberOption,
} from './AssignmentRow'
import MeetingDetailsCard from './MeetingDetailsCard'
import AddRoleForm from './AddRoleForm'
import { groupAssignments } from '@/lib/assignments'
import './meeting-manage.css'

type AssignmentRecord = MeetingAssignmentItem & {
  created_at?: string | null
}

function getOtherAssignmentsByMember(
  assignments: AssignmentRecord[],
  excludeAssignmentId?: string,
): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const a of assignments) {
    if (!a.member_id || a.id === excludeAssignmentId) continue
    if (!map[a.member_id]) {
      map[a.member_id] = []
    }
    map[a.member_id].push(a.role_name)
  }
  return map
}

export default async function ManageMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, meeting_assignments(*, profiles(full_name))')
    .eq('id', id)
    .single()

  if (!meeting) return <div>Meeting not found</div>

  let members: MemberOption[] = []
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_member_directory')
  if (!rpcError && rpcData) {
    members = rpcData as MemberOption[]
  } else {
    const { data: fallback } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('full_name', 'is', null)
      .order('full_name')
    members = (fallback ?? []) as MemberOption[]
  }

  const rawAssignments = (meeting.meeting_assignments ?? []) as AssignmentRecord[]
  const sortedAssignments = [...rawAssignments].sort(
    (a, b) =>
      (a.created_at ?? '').localeCompare(b.created_at ?? '') ||
      a.id.localeCompare(b.id),
  )

  const { pairs, unpaired, others } = groupAssignments(sortedAssignments)
  const allAssignedByMember = getOtherAssignmentsByMember(sortedAssignments)

  const hasAgendaNotes = 'agenda_notes' in meeting
  const hasMeetingType = 'meeting_type' in meeting
  const agendaNotes = hasAgendaNotes
    ? ((meeting as { agenda_notes?: string | null }).agenda_notes ?? '')
    : ''
  const meetingType = hasMeetingType
    ? ((meeting as { meeting_type?: string | null }).meeting_type ?? '')
    : ''

  return (
    <div className="meeting-manage">
      <div className="meeting-manage__header">
        <div>
          <Link href="/admin/meetings" className="meeting-manage__back">
            ← Sessions
          </Link>
          <h1 className="meeting-manage__title">
            {new Date(meeting.meeting_date).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h1>
          {(meeting.theme || agendaNotes) && (
            <p className="meeting-manage__subtitle">
              {meeting.theme ? `Theme: ${meeting.theme}` : ''}
              {meeting.theme && agendaNotes ? ' · ' : ''}
              {agendaNotes}
            </p>
          )}
        </div>
        <Link href={`/admin/meetings/${id}/summary`} className="wsc-btn wsc-btn-ghost">
          Summary / Notes →
        </Link>
      </div>

      <div className="meeting-manage__grid">
        {/* Roles List */}
        <div className="wsc-card meeting-manage__roles-card">
          <div className="meeting-manage__card-header">
            <h2 className="meeting-manage__card-title">Roles</h2>
            <CopyAgendaButton meeting={meeting} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {others.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                meetingId={id}
                members={members}
                otherAssignmentsByMember={getOtherAssignmentsByMember(sortedAssignments, a.id)}
              />
            ))}

            {pairs.map(({ speech, evaluator }) => (
              <div key={speech.id} className="meeting-role-pair">
                <AssignmentRow
                  assignment={speech}
                  meetingId={id}
                  members={members}
                  otherAssignmentsByMember={getOtherAssignmentsByMember(
                    sortedAssignments,
                    speech.id,
                  )}
                />
                {evaluator && (
                  <div className="meeting-role-pair__evaluator">
                    <AssignmentRow
                      assignment={evaluator}
                      meetingId={id}
                      members={members}
                      otherAssignmentsByMember={getOtherAssignmentsByMember(
                        sortedAssignments,
                        evaluator.id,
                      )}
                    />
                  </div>
                )}
              </div>
            ))}

            {unpaired.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                meetingId={id}
                members={members}
                otherAssignmentsByMember={getOtherAssignmentsByMember(sortedAssignments, a.id)}
              />
            ))}

            {sortedAssignments.length === 0 && (
              <p style={{ color: 'var(--ink-3)' }}>No roles assigned. Add some on the right.</p>
            )}
          </div>
        </div>

        {/* Sidebar: Meeting Details + Add Custom Role */}
        <div className="meeting-manage__sidebar">
          <MeetingDetailsCard
            meetingId={meeting.id}
            initialDate={meeting.meeting_date}
            initialTheme={meeting.theme ?? ''}
            initialAgendaNotes={agendaNotes}
            hasAgendaNotes={hasAgendaNotes}
            initialMeetingType={meetingType}
            hasMeetingType={hasMeetingType}
          />

          <AddRoleForm
            meetingId={meeting.id}
            members={members}
            assignedRolesByMember={allAssignedByMember}
          />
        </div>
      </div>
    </div>
  )
}
