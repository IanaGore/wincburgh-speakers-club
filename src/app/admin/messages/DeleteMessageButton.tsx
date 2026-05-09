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
        className="btn-secondary"
        style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#f87171" }}
      >
        Delete
      </button>
    </form>
  )
}
