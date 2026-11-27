'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PATHWAY_DEFINITIONS } from '@/lib/pathways'
import { deleteRoleFromForm, quickAssignMember, updateAssignment } from './actions'
import RemoveRoleButton from './RemoveRoleButton'

export type MeetingAssignmentItem = {
  id: string
  role_name: string
  member_id: string | null
  speech_title?: string | null
  speech_level?: string | null
  speech_length?: string | null
  profiles?: { full_name?: string | null } | null
}

export type MemberOption = {
  id: string
  full_name: string
}

type AssignmentRowProps = {
  assignment: MeetingAssignmentItem
  meetingId: string
  members: MemberOption[]
  otherAssignmentsByMember: Record<string, string[]>
}

function isSpeechRoleName(roleName: string): boolean {
  const trimmed = roleName.trim()
  return trimmed.startsWith('Speech') || trimmed.startsWith('Speaker')
}

function buildMemberOptions(
  members: MemberOption[],
  assignment: MeetingAssignmentItem,
): MemberOption[] {
  if (!assignment.member_id) return members
  const exists = members.some((m) => m.id === assignment.member_id)
  if (exists) return members
  return [
    ...members,
    {
      id: assignment.member_id,
      full_name: assignment.profiles?.full_name || 'Member',
    },
  ]
}

export default function AssignmentRow({
  assignment,
  meetingId,
  members,
  otherAssignmentsByMember,
}: AssignmentRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticMemberId, setOptimisticMemberId] = useOptimistic(
    assignment.member_id ?? '',
  )
  const [quickError, setQuickError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [roleName, setRoleName] = useState(assignment.role_name)
  const [memberId, setMemberId] = useState(assignment.member_id ?? '')
  const [speechLevel, setSpeechLevel] = useState(assignment.speech_level ?? '')
  const [speechTitle, setSpeechTitle] = useState(assignment.speech_title ?? '')
  const [speechLength, setSpeechLength] = useState(
    assignment.speech_length ?? '6 - 8 minutes',
  )
  const [editError, setEditError] = useState<string | null>(null)

  const memberOptions = buildMemberOptions(members, assignment)

  function formatOptionLabel(member: MemberOption): string {
    const otherRoles = otherAssignmentsByMember[member.id]
    if (otherRoles && otherRoles.length > 0) {
      return `${member.full_name} (already: ${otherRoles.join(', ')})`
    }
    return member.full_name
  }

  function handleQuickMemberChange(nextValue: string) {
    setQuickError(null)
    startTransition(async () => {
      setOptimisticMemberId(nextValue)
      try {
        const result = await quickAssignMember(
          assignment.id,
          meetingId,
          nextValue || null,
        )
        if (result?.error) {
          setQuickError(result.error)
          return
        }
        router.refresh()
      } catch {
        setQuickError('Could not update assigned member. Please try again.')
      }
    })
  }

  function openEdit() {
    setRoleName(assignment.role_name)
    setMemberId(assignment.member_id ?? '')
    setSpeechLevel(assignment.speech_level ?? '')
    setSpeechTitle(assignment.speech_title ?? '')
    setSpeechLength(assignment.speech_length || '6 - 8 minutes')
    setEditError(null)
    setQuickError(null)
    setIsEditing(true)
  }

  function handleEditMemberChange(nextMemberId: string) {
    if (nextMemberId !== memberId) {
      setSpeechLevel('')
      setSpeechTitle('')
      setSpeechLength('6 - 8 minutes')
    }
    setMemberId(nextMemberId)
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditError(null)

    const formData = new FormData()
    formData.set('assignment_id', assignment.id)
    formData.set('meeting_id', meetingId)
    formData.set('role_name', roleName)
    formData.set('member_id', memberId)
    if (isSpeechRoleName(roleName) && memberId !== '') {
      formData.set('speech_level', speechLevel)
      formData.set('speech_title', speechTitle)
      formData.set('speech_length', speechLength)
    }

    startTransition(async () => {
      try {
        const result = await updateAssignment(formData)
        if (result?.error) {
          setEditError(result.error)
          return
        }
        setIsEditing(false)
        router.refresh()
      } catch {
        setEditError('Could not save role changes. Please try again.')
      }
    })
  }

  const showSpeechFields = isSpeechRoleName(roleName) && memberId !== ''

  if (isEditing) {
    return (
      <form onSubmit={handleEditSubmit} className="meeting-role-editor">
        <div className="meeting-role-editor__grid">
          <div className="meeting-manage__field">
            <label htmlFor={`role-name-${assignment.id}`} className="wsc-label">
              Role Name
            </label>
            <input
              id={`role-name-${assignment.id}`}
              type="text"
              required
              maxLength={100}
              className="wsc-input"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </div>

          <div className="meeting-manage__field">
            <label htmlFor={`role-member-${assignment.id}`} className="wsc-label">
              Assigned Member
            </label>
            <select
              id={`role-member-${assignment.id}`}
              className="wsc-input"
              value={memberId}
              onChange={(e) => handleEditMemberChange(e.target.value)}
            >
              <option value="">Open (Unassigned)</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {formatOptionLabel(member)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showSpeechFields && (
          <div className="meeting-role-editor__speech">
            <p className="meeting-role-editor__speech-title">Speech Details (Optional)</p>
            <div className="meeting-role-editor__grid">
              <div className="meeting-manage__field">
                <label htmlFor={`speech-level-${assignment.id}`} className="wsc-label">
                  Speech Level
                </label>
                <select
                  id={`speech-level-${assignment.id}`}
                  className="wsc-input"
                  value={speechLevel}
                  onChange={(e) => setSpeechLevel(e.target.value)}
                >
                  <option value="">Select Level (optional)...</option>
                  <optgroup label="Foundation">
                    {PATHWAY_DEFINITIONS.foundation.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} — {item.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Advanced">
                    {PATHWAY_DEFINITIONS.advanced.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} — {item.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="meeting-manage__field">
                <label htmlFor={`speech-title-${assignment.id}`} className="wsc-label">
                  Speech Title
                </label>
                <input
                  id={`speech-title-${assignment.id}`}
                  type="text"
                  maxLength={200}
                  placeholder="Speech title"
                  className="wsc-input"
                  value={speechTitle}
                  onChange={(e) => setSpeechTitle(e.target.value)}
                />
              </div>

              <div className="meeting-manage__field">
                <label htmlFor={`speech-length-${assignment.id}`} className="wsc-label">
                  Estimated Length
                </label>
                <input
                  id={`speech-length-${assignment.id}`}
                  type="text"
                  maxLength={50}
                  placeholder="6 - 8 minutes"
                  className="wsc-input"
                  value={speechLength}
                  onChange={(e) => setSpeechLength(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {editError && (
          <p role="alert" className="meeting-manage__alert">
            {editError}
          </p>
        )}

        <div className="meeting-manage__actions">
          <button
            type="submit"
            disabled={isPending}
            className="wsc-btn wsc-btn-sm wsc-btn-primary"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsEditing(false)}
            className="wsc-btn wsc-btn-sm wsc-btn-ghost"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="meeting-role-row">
      <div className="meeting-role-row__main">
        <div className="meeting-role-row__info">
          <span className="meeting-role-row__name">{assignment.role_name}</span>
          {assignment.member_id &&
            (assignment.speech_title || assignment.speech_level) && (
              <div className="meeting-role-row__speech">
                {assignment.speech_level && (
                  <span className="meeting-role-row__speech-level">
                    [{assignment.speech_level}]
                  </span>
                )}
                {assignment.speech_title && (
                  <span>{assignment.speech_title}</span>
                )}
                {assignment.speech_length && (
                  <span style={{ color: 'var(--ink-4)', marginLeft: '0.4rem' }}>
                    ({assignment.speech_length})
                  </span>
                )}
              </div>
            )}
        </div>

        <div className="meeting-role-row__controls">
          <select
            aria-label={`Assigned member for ${assignment.role_name}`}
            className={`wsc-input meeting-role-row__select${
              optimisticMemberId === '' ? ' meeting-role-row__select--open' : ''
            }`}
            value={optimisticMemberId}
            disabled={isPending}
            onChange={(e) => handleQuickMemberChange(e.target.value)}
          >
            <option value="">Open</option>
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {formatOptionLabel(member)}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={isPending}
            onClick={openEdit}
            className="wsc-btn wsc-btn-sm wsc-btn-ghost"
          >
            Edit
          </button>

          <RemoveRoleButton
            assignmentId={assignment.id}
            meetingId={meetingId}
            actionFn={deleteRoleFromForm}
          />
        </div>
      </div>

      {quickError && (
        <p role="alert" className="meeting-manage__alert" style={{ marginTop: '0.6rem' }}>
          {quickError}
        </p>
      )}
    </div>
  )
}
