'use client'

import { useState } from 'react'

const selectStyle = {
  padding: "0.5rem",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid var(--card-border)",
  color: "white",
  fontSize: "0.8rem",
  width: "100%"
} as const

export default function VolunteerForm({
  assignment,
  actionFn,
  members
}: {
  assignment: any
  actionFn: any
  members: { id: string; full_name: string }[]
}) {
  const [showSpeechForm, setShowSpeechForm] = useState(false)
  const [showAssignOther, setShowAssignOther] = useState(false)

  const isSpeech = assignment.role_name.startsWith('Speech') || assignment.role_name.startsWith('Speaker')

  // ── Non-speech: assign-other mode ─────────────────────────
  if (!isSpeech && showAssignOther) {
    return (
      <form action={actionFn} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <select name="target_member_id" required style={selectStyle}>
          <option value="">Select member...</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%" }}>
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setShowAssignOther(false)}
          style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer" }}
        >
          Cancel
        </button>
      </form>
    )
  }

  // ── Non-speech: default mode ───────────────────────────────
  if (!isSpeech) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <form action={actionFn}>
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <button type="submit" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%" }}>
            Volunteer
          </button>
        </form>
        <button
          type="button"
          onClick={() => setShowAssignOther(true)}
          style={{ background: "transparent", border: "1px solid var(--card-border)", color: "#94a3b8", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.78rem", cursor: "pointer", width: "100%" }}
        >
          Assign to member
        </button>
      </div>
    )
  }

  // ── Speech: initial button ─────────────────────────────────
  if (!showSpeechForm) {
    return (
      <button onClick={() => setShowSpeechForm(true)} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%" }}>
        Volunteer
      </button>
    )
  }

  // ── Speech: expanded form ──────────────────────────────────
  return (
    <form action={actionFn} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <input type="hidden" name="assignmentId" value={assignment.id} />

      <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid var(--primary)", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "bold", margin: 0 }}>Speech Details</p>

        {/* Who is volunteering? */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", color: "#64748b" }}>Volunteering as</label>
          <select name="target_member_id" style={selectStyle}>
            <option value="">Myself</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>

        <select name="speech_level" required style={selectStyle}>
          <option value="">Select Level...</option>
          <optgroup label="Foundation">
            {['F1', 'F2', 'F3', 'F4', 'F5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
          <optgroup label="Advanced">
            {['A1', 'A2', 'A3', 'A4', 'A5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
        </select>
        <input type="text" name="speech_title" placeholder="Speech Title" required style={{ ...selectStyle, padding: "0.5rem" }} />
        <input type="text" name="speech_length" placeholder="Estimated Length" defaultValue="6 - 8 minutes" required style={{ ...selectStyle, padding: "0.5rem" }} />
      </div>

      <button type="submit" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%", marginTop: "0.5rem" }}>
        Confirm Speech
      </button>
      <button
        type="button"
        onClick={() => setShowSpeechForm(false)}
        style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer", marginTop: "0.2rem" }}
      >
        Cancel
      </button>
    </form>
  )
}
