'use client'
import { useActionState, useState, useEffect, useRef } from 'react'
import { sendEnquiryMessage } from './actions'

type Message = {
  id: string
  direction: string
  body: string
  sent_at: string
}

const initial = { error: null }

export default function EnquiryMessageForm({
  enquiryId,
  messages,
}: {
  enquiryId: string
  messages: Message[]
}) {
  const [state, formAction, pending] = useActionState(sendEnquiryMessage, initial)
  const [successKey, setSuccessKey] = useState(0)
  const prevPending = useRef(false)

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      setSuccessKey(k => k + 1)
    }
    prevPending.current = pending
  }, [pending, state.error])

  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1rem', marginTop: '0.5rem' }}>
      {messages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: msg.direction === 'outbound' ? 'var(--clay-soft)' : 'var(--paper-2)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-4)', marginBottom: 4 }}>
                <span>{msg.direction === 'outbound' ? 'You' : 'Enquirer'}</span>
                <span>·</span>
                <span>
                  {new Date(msg.sent_at).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--ink-2)' }}>
                {msg.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <form key={successKey} action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="hidden" name="enquiry_id" value={enquiryId} />
        <label className="wsc-label" htmlFor={`msg-${enquiryId}`}>Send a message</label>
        <textarea
          id={`msg-${enquiryId}`}
          name="body"
          className="wsc-input wsc-textarea"
          rows={4}
          placeholder="Type your message…"
          required
        />
        {state.error && (
          <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, margin: 0 }}>{state.error}</p>
        )}
        <div>
          <button type="submit" disabled={pending} className="wsc-btn wsc-btn-primary wsc-btn-sm">
            {pending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  )
}
