'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMeetingDetails } from './actions'

type MeetingDetailsCardProps = {
  meetingId: string
  initialDate: string
  initialTheme: string
  initialAgendaNotes?: string
  hasAgendaNotes: boolean
  initialMeetingType?: string
  hasMeetingType: boolean
}

export default function MeetingDetailsCard({
  meetingId,
  initialDate,
  initialTheme,
  initialAgendaNotes = '',
  hasAgendaNotes,
  initialMeetingType = '',
  hasMeetingType,
}: MeetingDetailsCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [baseline, setBaseline] = useState({
    date: initialDate,
    theme: initialTheme,
    agendaNotes: initialAgendaNotes,
    meetingType: initialMeetingType,
  })

  const [meetingDate, setMeetingDate] = useState(initialDate)
  const [theme, setTheme] = useState(initialTheme)
  const [agendaNotes, setAgendaNotes] = useState(initialAgendaNotes)
  const [meetingType, setMeetingType] = useState(initialMeetingType)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isDirty =
    meetingDate !== baseline.date ||
    theme !== baseline.theme ||
    (hasAgendaNotes && agendaNotes !== baseline.agendaNotes) ||
    (hasMeetingType && meetingType !== baseline.meetingType)

  function handleReset() {
    setMeetingDate(baseline.date)
    setTheme(baseline.theme)
    setAgendaNotes(baseline.agendaNotes)
    setMeetingType(baseline.meetingType)
    setError(null)
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const formData = new FormData()
    formData.set('meeting_id', meetingId)
    formData.set('meeting_date', meetingDate)
    formData.set('theme', theme)
    if (hasAgendaNotes) {
      formData.set('agenda_notes', agendaNotes)
    }
    if (hasMeetingType) {
      formData.set('meeting_type', meetingType)
    }

    startTransition(async () => {
      try {
        const result = await updateMeetingDetails(formData)
        if (result?.error) {
          setError(result.error)
          return
        }
        setBaseline({
          date: meetingDate.trim(),
          theme: theme.trim(),
          agendaNotes: agendaNotes.trim(),
          meetingType: meetingType.trim(),
        })
        setSaved(true)
        router.refresh()
      } catch {
        setError('Could not update meeting details. Please try again.')
      }
    })
  }

  return (
    <div className="wsc-card meeting-manage__card">
      <div className="meeting-manage__card-header" style={{ marginBottom: '1.25rem' }}>
        <h2 className="meeting-manage__card-title">Meeting Details</h2>
      </div>

      <form onSubmit={handleSubmit} className="meeting-manage__form">
        <div className="meeting-manage__field">
          <label htmlFor="edit-meeting-date" className="wsc-label">
            Meeting Date
          </label>
          <input
            id="edit-meeting-date"
            name="meeting_date"
            type="date"
            required
            className="wsc-input"
            value={meetingDate}
            onChange={(e) => {
              setMeetingDate(e.target.value)
              setSaved(false)
              setError(null)
            }}
          />
        </div>

        <div className="meeting-manage__field">
          <label htmlFor="edit-meeting-theme" className="wsc-label">
            Theme (Optional)
          </label>
          <input
            id="edit-meeting-theme"
            name="theme"
            type="text"
            maxLength={200}
            placeholder="e.g. Overcoming Fear"
            className="wsc-input"
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value)
              setSaved(false)
              setError(null)
            }}
          />
        </div>

        {hasMeetingType && (
          <div className="meeting-manage__field">
            <label htmlFor="edit-meeting-type" className="wsc-label">
              Meeting Type (Optional)
            </label>
            <input
              id="edit-meeting-type"
              name="meeting_type"
              type="text"
              maxLength={100}
              placeholder="e.g. Regular meeting"
              className="wsc-input"
              value={meetingType}
              onChange={(e) => {
                setMeetingType(e.target.value)
                setSaved(false)
                setError(null)
              }}
            />
          </div>
        )}

        {hasAgendaNotes && (
          <div className="meeting-manage__field">
            <label htmlFor="edit-agenda-notes" className="wsc-label">
              Agenda Notes (Optional)
            </label>
            <textarea
              id="edit-agenda-notes"
              name="agenda_notes"
              rows={3}
              maxLength={2000}
              placeholder="Room changes, special guests, or notices for the session..."
              className="wsc-textarea"
              value={agendaNotes}
              onChange={(e) => {
                setAgendaNotes(e.target.value)
                setSaved(false)
                setError(null)
              }}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="meeting-manage__alert">
            {error}
          </p>
        )}

        {saved && !error && (
          <p role="status" className="meeting-manage__status">
            Meeting details saved.
          </p>
        )}

        <div className="meeting-manage__actions">
          <button
            type="submit"
            disabled={isPending || !isDirty}
            className="wsc-btn wsc-btn-primary wsc-btn-sm"
          >
            {isPending ? 'Saving...' : 'Save Details'}
          </button>
          {isDirty && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleReset}
              className="wsc-btn wsc-btn-ghost wsc-btn-sm"
            >
              Reset
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
