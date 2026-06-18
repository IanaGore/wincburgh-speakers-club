'use client'
import { useActionState, useRef, useEffect } from 'react'
import { sendCorrespondenceReplyAction } from '../actions'

const initial = { error: null as string | null, success: false }

export default function ReplyForm({ correspondenceId }: { correspondenceId: string }) {
  const [state, formAction, pending] = useActionState(sendCorrespondenceReplyAction, initial)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (state.success && textareaRef.current) {
      textareaRef.current.value = ''
    }
  }, [state.success])

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '0.04em' }}>
        REPLY <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>· sending as president@winchburghspeakersclub.uk</span>
      </div>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="hidden" name="correspondence_id" value={correspondenceId} />
        <textarea
          ref={textareaRef}
          name="body"
          className="wsc-input wsc-textarea"
          rows={5}
          required
          placeholder="Write your reply…"
        />
        {state.error && (
          <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, margin: 0 }}>{state.error}</p>
        )}
        {state.success && (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>Reply sent.</p>
        )}
        <div>
          <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" disabled={pending}>
            {pending ? 'Sending…' : 'Send Reply'}
          </button>
        </div>
      </form>
    </div>
  )
}
