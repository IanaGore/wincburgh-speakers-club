'use client'

import { useState } from 'react'

export default function VolunteerForm({
  assignment,
  actionFn,
  members,
  meetingId,
  dark = false,
}: {
  assignment: any
  actionFn: any
  members: { id: string; full_name: string }[]
  meetingId: string
  dark?: boolean
}) {
  const [showSpeechForm, setShowSpeechForm] = useState(false)
  const [showAssignOther, setShowAssignOther] = useState(false)

  const isSpeech = assignment.role_name.startsWith('Speech') || assignment.role_name.startsWith('Speaker')

  const selectClass = dark ? 'dash-select' : 'wsc-input'
  const inputClass  = dark ? 'dash-input'  : 'wsc-input'

  // ── Non-speech: assign-other mode ─────────────────────────
  if (!isSpeech && showAssignOther) {
    return (
      <form action={actionFn} className="dash-volunteer-form">
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <input type="hidden" name="meetingId" value={meetingId} />
        <select name="target_member_id" required className={selectClass}>
          <option value="">Select member...</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%' }}>
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setShowAssignOther(false)}
          className="dash-btn-ghost-sm"
        >
          Cancel
        </button>
      </form>
    )
  }

  // ── Non-speech: default mode ───────────────────────────────
  if (!isSpeech) {
    return (
      <div className="dash-volunteer-form">
        <form action={actionFn}>
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <input type="hidden" name="meetingId" value={meetingId} />
          <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%' }}>
            Volunteer
          </button>
        </form>
        <button
          type="button"
          onClick={() => setShowAssignOther(true)}
          className="dash-btn-ghost-sm"
        >
          Assign to member
        </button>
      </div>
    )
  }

  // ── Speech: initial button ─────────────────────────────────
  if (!showSpeechForm) {
    return (
      <button
        onClick={() => setShowSpeechForm(true)}
        className="wsc-btn wsc-btn-primary wsc-btn-sm"
        style={{ width: '100%' }}
      >
        Volunteer
      </button>
    )
  }

  // ── Speech: expanded form ──────────────────────────────────
  return (
    <form action={actionFn} className="dash-volunteer-form">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="meetingId" value={meetingId} />

      <div className="dash-speech-expand">
        <p className="dash-speech-expand__label">Speech Details</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="wsc-label" style={{ fontSize: 11 }}>Volunteering as</label>
          <select name="target_member_id" className={selectClass}>
            <option value="">Myself</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>

        <select name="speech_level" required className={selectClass}>
          <option value="">Select Level...</option>
          <optgroup label="Foundation">
            {['F1', 'F2', 'F3', 'F4', 'F5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
          <optgroup label="Advanced">
            {['A1', 'A2', 'A3', 'A4', 'A5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
        </select>
        <input type="text" name="speech_title" placeholder="Speech Title" required className={inputClass} />
        <input type="text" name="speech_length" placeholder="Estimated Length" defaultValue="6 - 8 minutes" required className={inputClass} />
      </div>

      <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%', marginTop: 4 }}>
        Confirm Speech
      </button>
      <button
        type="button"
        onClick={() => setShowSpeechForm(false)}
        className="dash-btn-ghost-sm"
      >
        Cancel
      </button>
    </form>
  )
}
