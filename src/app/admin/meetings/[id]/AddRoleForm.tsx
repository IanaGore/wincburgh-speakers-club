'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addCustomRole } from './actions'
import type { MemberOption } from './AssignmentRow'

type AddRoleFormProps = {
  meetingId: string
  members: MemberOption[]
  assignedRolesByMember: Record<string, string[]>
}

export default function AddRoleForm({
  meetingId,
  members,
  assignedRolesByMember,
}: AddRoleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [roleName, setRoleName] = useState('')
  const [memberId, setMemberId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('meeting_id', meetingId)
    formData.set('role_name', roleName)
    formData.set('member_id', memberId)

    startTransition(async () => {
      try {
        const result = await addCustomRole(formData)
        if (result?.error) {
          setError(result.error)
          return
        }
        setRoleName('')
        setMemberId('')
        router.refresh()
      } catch {
        setError('Could not add role. Please try again.')
      }
    })
  }

  return (
    <div className="wsc-card meeting-manage__card">
      <div className="meeting-manage__card-header" style={{ marginBottom: '1.25rem' }}>
        <h2 className="meeting-manage__card-title">Add Custom Role</h2>
      </div>

      <form onSubmit={handleSubmit} className="meeting-manage__form">
        <div className="meeting-manage__field">
          <label htmlFor="add-role-name" className="wsc-label">
            Role Name
          </label>
          <input
            id="add-role-name"
            type="text"
            name="role_name"
            maxLength={100}
            placeholder="e.g. Guest Speaker"
            required
            className="wsc-input"
            value={roleName}
            onChange={(e) => {
              setRoleName(e.target.value)
              setError(null)
            }}
          />
        </div>

        <div className="meeting-manage__field">
          <label htmlFor="add-role-member" className="wsc-label">
            Assign Member (Optional)
          </label>
          <select
            id="add-role-member"
            name="member_id"
            className="wsc-input"
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value)
              setError(null)
            }}
          >
            <option value="">Open (Unassigned)</option>
            {members.map((member) => {
              const existingRoles = assignedRolesByMember[member.id]
              const label =
                existingRoles && existingRoles.length > 0
                  ? `${member.full_name} (already: ${existingRoles.join(', ')})`
                  : member.full_name
              return (
                <option key={member.id} value={member.id}>
                  {label}
                </option>
              )
            })}
          </select>
        </div>

        {error && (
          <p role="alert" className="meeting-manage__alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="wsc-btn wsc-btn-primary"
        >
          {isPending ? 'Adding...' : 'Add Role'}
        </button>
      </form>
    </div>
  )
}
