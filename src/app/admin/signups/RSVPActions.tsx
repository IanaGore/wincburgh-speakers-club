'use client'
import { useState } from 'react'
import { markAttended, sendConversionInvite } from './actions'

export function MarkAttendedButton({ signupId }: { signupId: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <button className="wsc-btn wsc-btn-sm wsc-btn-ghost" disabled={loading}
      onClick={async () => { setLoading(true); await markAttended(signupId); setLoading(false) }}>
      {loading ? '…' : 'Mark attended'}
    </button>
  )
}

export function InviteButton({ signupId }: { signupId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <button className="wsc-btn wsc-btn-sm wsc-btn-primary" disabled={loading || done}
      onClick={async () => {
        setLoading(true)
        await sendConversionInvite(signupId)
        setLoading(false)
        setDone(true)
      }}>
      {done ? 'Invite sent ✓' : loading ? '…' : 'Invite to join'}
    </button>
  )
}
