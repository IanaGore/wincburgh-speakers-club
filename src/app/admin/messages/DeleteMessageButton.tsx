'use client'

import { useRef } from 'react'
import { deleteMessage } from './actions'

export default function DeleteMessageButton({ messageId }: { messageId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action={deleteMessage}>
      <input type="hidden" name="message_id" value={messageId} />
      <button
        type="button"
        onClick={() => {
          if (confirm('Delete this message? This cannot be undone.')) formRef.current?.requestSubmit()
        }}
        className="wsc-btn wsc-btn-sm wsc-btn-ghost"
      >
        Delete
      </button>
    </form>
  )
}
