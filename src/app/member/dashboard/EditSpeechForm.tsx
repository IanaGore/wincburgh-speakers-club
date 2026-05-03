'use client'

import { useState } from 'react'
import { updateSpeechDetails, dropRole } from './actions'

export default function EditSpeechForm({ assignment }: { assignment: any }) {
  const [isEditing, setIsEditing] = useState(false)

  if (!isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--primary)", fontSize: "0.9rem", fontWeight: "bold" }}>You!</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}
          >
            Edit
          </button>
        </div>
        <form action={dropRole}>
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <button type="submit" style={{ background: "transparent", color: "#f87171", border: "none", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}>
            Drop out
          </button>
        </form>
      </div>
    )
  }

  return (
    <form action={updateSpeechDetails} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid var(--primary)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "bold", margin: 0 }}>Edit Speech Details</p>
        <select
          name="speech_level"
          required
          defaultValue={assignment.speech_level || ''}
          style={{ padding: "0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.1)", border: "1px solid var(--card-border)", color: "white", fontSize: "0.8rem" }}
        >
          <option value="">Select Level...</option>
          <optgroup label="Foundation">
            {['F1', 'F2', 'F3', 'F4', 'F5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
          <optgroup label="Advanced">
            {['A1', 'A2', 'A3', 'A4', 'A5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
        </select>
        <input
          type="text"
          name="speech_title"
          placeholder="Speech Title"
          required
          defaultValue={assignment.speech_title || ''}
          style={{ padding: "0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.1)", border: "1px solid var(--card-border)", color: "white", fontSize: "0.8rem" }}
        />
        <input
          type="text"
          name="speech_length"
          placeholder="Estimated Length"
          required
          defaultValue={assignment.speech_length || '6 - 8 minutes'}
          style={{ padding: "0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.1)", border: "1px solid var(--card-border)", color: "white", fontSize: "0.8rem" }}
        />
      </div>
      <button type="submit" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%" }}>
        Save
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer" }}
      >
        Cancel
      </button>
    </form>
  )
}
