'use client'

import { useState } from 'react'
import { updateSpeechDetails, dropRole } from './actions'

export default function EditSpeechForm({ assignment, dark = false }: { assignment: any; dark?: boolean }) {
  const [isEditing, setIsEditing] = useState(false)

  const selectClass = dark ? 'dash-select' : 'wsc-input'
  const inputClass  = dark ? 'dash-input'  : 'wsc-input'

  if (!isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="dash-role__status">You</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="dash-btn-ghost-sm"
          >
            Edit
          </button>
        </div>
        <form action={dropRole}>
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <button type="submit" className="dash-drop-btn">Drop out</button>
        </form>
      </div>
    )
  }

  return (
    <form action={updateSpeechDetails} className="dash-volunteer-form">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <div className="dash-speech-expand">
        <p className="dash-speech-expand__label">Edit Speech Details</p>
        <select
          name="speech_level"
          required
          defaultValue={assignment.speech_level || ''}
          className={selectClass}
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
          className={inputClass}
        />
        <input
          type="text"
          name="speech_length"
          placeholder="Estimated Length"
          required
          defaultValue={assignment.speech_length || '6 - 8 minutes'}
          className={inputClass}
        />
      </div>
      <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%' }}>
        Save
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="dash-btn-ghost-sm"
      >
        Cancel
      </button>
    </form>
  )
}
