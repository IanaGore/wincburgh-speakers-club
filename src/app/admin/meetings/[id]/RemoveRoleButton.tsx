'use client'

import { useRef } from 'react'

export default function RemoveRoleButton({ assignmentId, meetingId, actionFn }: {
  assignmentId: string
  meetingId: string
  actionFn: (formData: FormData) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action={actionFn}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="meetingId" value={meetingId} />
      <button
        type="button"
        onClick={() => {
          if (confirm('Remove this role? This cannot be undone.')) formRef.current?.requestSubmit()
        }}
        className="wsc-btn wsc-btn-sm wsc-btn-ghost"
      >
        Remove
      </button>
    </form>
  )
}
