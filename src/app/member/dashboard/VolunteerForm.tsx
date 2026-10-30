'use client'

import { useState, useTransition } from 'react'
import { getFaro } from '@/lib/faro'

interface Assignment {
  id: string
  role_name: string
  member_id: string | null
  speech_title?: string | null
  speech_level?: string | null
  speech_length?: string | null
}

interface VolunteerFormProps {
  assignment: Assignment
  actionFn: (formData: FormData) => Promise<void>
  members: { id: string; full_name: string }[]
  meetingId: string
  dark?: boolean
}

export default function VolunteerForm({
  assignment,
  actionFn,
  members,
  meetingId,
  dark = false,
}: VolunteerFormProps) {
  const [showSpeechForm, setShowSpeechForm] = useState(false)
  const [showAssignOther, setShowAssignOther] = useState(false)
  const [, startTransition] = useTransition()

  const isSpeech = assignment.role_name.startsWith('Speech') || assignment.role_name.startsWith('Speaker')

  function handleVolunteer(formData: FormData) {
    startTransition(async () => {
      await actionFn(formData)
      getFaro()?.api.pushEvent('volunteer_claimed', { meetingId, roleId: assignment.id })
    })
  }

  const selectClass = dark ? 'dash-select' : 'wsc-input'
  const inputClass  = dark ? 'dash-input'  : 'wsc-input'

  // ── Assign-other mode (speech & non-speech) ───────────────
  if (showAssignOther) {
    return (
      <form action={handleVolunteer} className="dash-volunteer-form">
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <input type="hidden" name="meetingId" value={meetingId} />
        <select name="target_member_id" required className={selectClass}>
          <option value="">Select member...</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        {isSpeech && (
          <div className="dash-speech-expand" style={{ marginTop: 0 }}>
            <p className="dash-speech-expand__label">Speech Details (Optional)</p>
            <select name="speech_level" className={selectClass}>
              <option value="">Select Level (optional)...</option>
              <optgroup label="Foundation">
                {['F1', 'F2', 'F3', 'F4', 'F5'].map(l => <option key={l} value={l}>{l}</option>)}
              </optgroup>
              <optgroup label="Advanced">
                {['A1', 'A2', 'A3', 'A4', 'A5'].map(l => <option key={l} value={l}>{l}</option>)}
              </optgroup>
            </select>
            <input type="text" name="speech_title" placeholder="Speech Title (optional)" className={inputClass} />
            <input type="text" name="speech_length" placeholder="Estimated Length" defaultValue="6 - 8 minutes" className={inputClass} />
          </div>
        )}
        <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%', marginTop: isSpeech ? 4 : 0 }}>
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

  // ── Default mode (idle) ───────────────────────────────────
  if (!showSpeechForm) {
    return (
      <div className="dash-volunteer-form">
        {isSpeech ? (
          <button
            type="button"
            onClick={() => setShowSpeechForm(true)}
            className="wsc-btn wsc-btn-primary wsc-btn-sm"
            style={{ width: '100%' }}
          >
            Volunteer
          </button>
        ) : (
          <form action={handleVolunteer}>
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <input type="hidden" name="meetingId" value={meetingId} />
            <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%' }}>
              Volunteer
            </button>
          </form>
        )}
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

  // ── Speech: expanded volunteer form ────────────────────────
  return (
    <form action={handleVolunteer} className="dash-volunteer-form">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="meetingId" value={meetingId} />

      <div className="dash-speech-expand">
        <p className="dash-speech-expand__label">Speech Details</p>

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
