'use client'
import { useState } from 'react'
import { markAttended, sendConversionInvite } from './actions'

export function MarkAttendedButton({ signupId }: { signupId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <button className="wsc-btn wsc-btn-sm wsc-btn-ghost" disabled={loading}
        onClick={async () => {
          setLoading(true)
          setError(null)
          try { await markAttended(signupId) }
          catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
          finally { setLoading(false) }
        }}>
        {loading ? '…' : 'Mark attended'}
      </button>
      {error && <span style={{ color: 'var(--error, #ef4444)', fontSize: 12, marginLeft: 8 }}>{error}</span>}
    </div>
  )
}

export function InviteButton({ signupId }: { signupId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <button className="wsc-btn wsc-btn-sm wsc-btn-primary" disabled={loading || done}
        onClick={async () => {
          setLoading(true)
          setError(null)
          try {
            await sendConversionInvite(signupId)
            setDone(true)
          }
          catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
          finally { setLoading(false) }
        }}>
        {done ? 'Invite sent ✓' : loading ? '…' : 'Invite to join'}
      </button>
      {error && <span style={{ color: 'var(--error, #ef4444)', fontSize: 12, marginLeft: 8 }}>{error}</span>}
    </div>
  )
}
