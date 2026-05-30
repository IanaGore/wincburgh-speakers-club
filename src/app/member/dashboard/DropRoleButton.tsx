'use client'

import { useTransition } from 'react'
import { getFaro } from '@/lib/faro'
import { dropRole } from './actions'

interface DropRoleButtonProps {
  assignmentId: string
  meetingId: string
}

export default function DropRoleButton({ assignmentId, meetingId }: DropRoleButtonProps) {
  const [, startTransition] = useTransition()

  function handleDrop(formData: FormData) {
    startTransition(async () => {
      await dropRole(formData)
      getFaro()?.api.pushEvent('volunteer_dropped', { meetingId, roleId: assignmentId })
    })
  }

  return (
    <form action={handleDrop}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button type="submit" className="dash-drop-btn">Drop out</button>
    </form>
  )
}
