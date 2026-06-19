'use client'

import { dropRole } from '@/app/member/dashboard/actions'

export default function RemoveSessionSpeechButton({ assignmentId }: { assignmentId: string }) {
  function handleSubmit(e: React.FormEvent) {
    if (!confirm('Remove this speech from your tracker? The slot will become available again.')) {
      e.preventDefault()
    }
  }

  return (
    <form action={dropRole} onSubmit={handleSubmit}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button type="submit" className="speech-delete-btn">Remove</button>
    </form>
  )
}
