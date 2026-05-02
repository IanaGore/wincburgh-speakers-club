'use client'

import { useState } from 'react'

export default function VolunteerForm({ assignment, actionFn }: { assignment: any, actionFn: any }) {
  const [showDetails, setShowDetails] = useState(false)
  const isSpeech = assignment.role_name.startsWith('Speech') || assignment.role_name.startsWith('Speaker')

  if (isSpeech && !showDetails) {
    return (
      <button onClick={() => setShowDetails(true)} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%" }}>
        Volunteer
      </button>
    )
  }

  return (
    <form action={actionFn} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <input type="hidden" name="assignmentId" value={assignment.id} />
      
      {isSpeech && showDetails && (
        <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid var(--primary)", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "bold", margin: 0 }}>Speech Details</p>
          <select name="speech_level" required style={{ padding: "0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.1)", border: "1px solid var(--card-border)", color: "white", fontSize: "0.8rem" }}>
            <option value="">Select Level...</option>
            <optgroup label="Foundation">
              {['F1', 'F2', 'F3', 'F4', 'F5'].map(l => <option key={l} value={l}>{l}</option>)}
            </optgroup>
            <optgroup label="Advanced">
              {['A1', 'A2', 'A3', 'A4', 'A5'].map(l => <option key={l} value={l}>{l}</option>)}
            </optgroup>
          </select>
          <input type="text" name="speech_title" placeholder="Speech Title" required style={{ padding: "0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.1)", border: "1px solid var(--card-border)", color: "white", fontSize: "0.8rem" }} />
          <input type="text" name="speech_length" placeholder="Estimated Length" defaultValue="6 - 8 minutes" required style={{ padding: "0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.1)", border: "1px solid var(--card-border)", color: "white", fontSize: "0.8rem" }} />
        </div>
      )}

      <button type="submit" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "100%", marginTop: isSpeech ? "0.5rem" : "0" }}>
        {isSpeech ? "Confirm Speech" : "Volunteer"}
      </button>
      {isSpeech && showDetails && (
        <button type="button" onClick={() => setShowDetails(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer", marginTop: "0.2rem" }}>
          Cancel
        </button>
      )}
    </form>
  )
}
