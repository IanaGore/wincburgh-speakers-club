'use client'

import { useState, useTransition } from 'react'
import { addFeedback } from './actions'

export default function FeedbackForm({ speechId, defaultValue }: { speechId: string; defaultValue: string }) {
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addFeedback(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form action={handleSubmit} style={{ marginTop: "1rem" }}>
      <input type="hidden" name="speech_id" value={speechId} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Your Feedback</label>
        <textarea
          name="feedback_notes"
          defaultValue={defaultValue}
          rows={4}
          placeholder="Provide constructive feedback here..."
          style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none", resize: "vertical", fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary"
          style={{ padding: "0.5rem 1rem", background: "#10b981" }}
        >
          {isPending ? 'Saving…' : 'Save Feedback'}
        </button>
        {saved && (
          <span style={{ color: "#10b981", fontSize: "0.9rem", fontWeight: "600" }}>✓ Saved!</span>
        )}
      </div>
    </form>
  )
}
