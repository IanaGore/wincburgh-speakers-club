'use client'
import { useState } from 'react'
import { submitSignup, type SignupData } from './actions'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import Button from '@/components/ui/Button'
import { mapsUrl, type VenueSettings } from '@/lib/venue'
import './signup.css'

type Meeting = { id: string; meeting_date: string; theme: string | null; meeting_type: string | null }

const HEARD_OPTIONS = ['A friend or family member', 'Social media', 'Local noticeboard', 'Search engine', 'Walked past', 'Other']

function hopeOptions(day: string) {
  return ['Build my confidence', 'Get better at work presentations', 'Meet new people in Winchburgh', 'Practice for a wedding / event', 'Have a go at competitions', `Just have a fun ${day} night`]
}

function formatDay(d: string) {
  const [,, day] = d.split('-')
  return String(parseInt(day, 10))
}
function formatMonth(d: string) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return months[parseInt(d.split('-')[1], 10) - 1]
}
function formatFullDate(d: string) {
  const [year, month, day] = d.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function calendarUrl(meeting: Meeting, venue: VenueSettings | null) {
  const date = meeting.meeting_date.replace(/-/g, '')
  const start = `${date}T190000`
  const end = `${date}T210000`
  const title = encodeURIComponent(`Winchburgh Speakers Club — ${meeting.theme || 'Open session'}`)
  const venueName = venue?.venue_name ?? 'Winchburgh Community Centre'
  const venueAddress = venue?.venue_address ?? 'Main Street, Winchburgh, EH52 6QF'
  const location = encodeURIComponent(`${venueName}, ${venueAddress}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}`
}

type Step = 1 | 2 | 3 | 4

export default function SignupFlow({ meetings, venue }: { meetings: Meeting[]; venue: VenueSettings | null }) {
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState<Omit<SignupData, 'experience'> & { experience: '' | 'none' | 'some' | 'lots' }>({
    firstName: '', lastName: '', email: '', phone: '', heard: '',
    experience: '', hopes: [], meetingId: '', notes: '',
  })

  const set = (k: keyof typeof form, v: string | string[]) => setForm(f => ({ ...f, [k]: v }))

  const validEmail = /\S+@\S+\.\S+/.test(form.email)
  const step1Valid = form.firstName.trim().length > 0 && validEmail
  const step2Valid = form.experience !== '' && form.hopes.length > 0
  const step3Valid = form.meetingId !== ''

  const selectedMeeting = meetings.find(m => m.id === form.meetingId)

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitSignup({ ...form, experience: form.experience as 'none' | 'some' | 'lots' })
      setStep(4)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="signup-flow">
      {/* Step indicator */}
      <div className="signup-steps">
        {([1,2,3,4] as Step[]).map((n, i) => (
          <div key={n} className="signup-steps__item">
            <div className={`signup-steps__dot${step === n ? ' signup-steps__dot--active' : step > n ? ' signup-steps__dot--done' : ''}`}>
              {step > n ? '✓' : n}
            </div>
            {i < 3 && <div className={`signup-steps__line${step > n ? ' signup-steps__line--done' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="signup-step" key="step1">
          <EyebrowLabel tone="clay">Step 1 of 4</EyebrowLabel>
          <h2>The basics</h2>
          <div className="signup-form">
            <div className="signup-form__row">
              <div className="input-field">
                <label className="wsc-label" htmlFor="firstName">First name <span style={{color:'var(--clay)'}}>*</span></label>
                <input id="firstName" className="wsc-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Your first name" autoComplete="given-name" required />
              </div>
              <div className="input-field">
                <label className="wsc-label" htmlFor="lastName">Last name <span style={{color:'var(--ink-4)'}}>(optional)</span></label>
                <input id="lastName" className="wsc-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Your last name" autoComplete="family-name" />
              </div>
            </div>
            <div className="input-field">
              <label className="wsc-label" htmlFor="email">Email address <span style={{color:'var(--clay)'}}>*</span></label>
              <input id="email" type="email" className="wsc-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div className="input-field">
              <label className="wsc-label" htmlFor="phone">Phone <span style={{color:'var(--ink-4)'}}>(optional)</span></label>
              <input id="phone" type="tel" className="wsc-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07700 000000" autoComplete="tel" />
            </div>
            <div>
              <p className="wsc-label" style={{marginBottom:12}}>How did you hear about us?</p>
              <div className="signup-chips">
                {HEARD_OPTIONS.map(o => (
                  <button key={o} type="button" className={`signup-chip${form.heard === o ? ' signup-chip--active' : ''}`} onClick={() => set('heard', form.heard === o ? '' : o)}>{o}</button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(2)} disabled={!step1Valid}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="signup-step" key="step2">
          <EyebrowLabel tone="clay">Step 2 of 4</EyebrowLabel>
          <h2>About you</h2>
          <div className="signup-form">
            <p className="wsc-label" style={{marginBottom:12}}>How much speaking experience do you have?</p>
            <div className="signup-experience">
              {([['none', 'Total newcomer', "I've never spoken in front of a group before. Or if I have, it was a disaster."],
                ['some', 'A bit, here and there', "I've done the odd presentation or toast, but nothing regular."],
                ['lots', "I've spoken plenty", "Presentations, debates, maybe even some Toastmasters. I want to keep improving."]] as const).map(([val, title, body]) => (
                <button key={val} type="button" className={`signup-exp-card${form.experience === val ? ' signup-exp-card--active' : ''}`} onClick={() => set('experience', val)}>
                  {form.experience === val && <span className="signup-exp-card__check">&#10003;</span>}
                  <h3>{title}</h3>
                  <p>{body}</p>
                </button>
              ))}
            </div>
            <div>
              <p className="wsc-label" style={{marginBottom:12}}>What are you hoping for? <span style={{color:'var(--ink-4)'}}>(pick all that apply)</span></p>
              <div className="signup-chips">
                {hopeOptions(venue?.meeting_day ?? 'Tuesday').map(o => {
                  const active = form.hopes.includes(o)
                  return (
                    <button key={o} type="button"
                      className={`signup-chip signup-chip--multi${active ? ' signup-chip--multi-active' : ''}`}
                      onClick={() => set('hopes', active ? form.hopes.filter(h => h !== o) : [...form.hopes, o])}
                    >
                      {active && '✓ '}{o}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{display:'flex',gap:12}}>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>Next</Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="signup-step" key="step3">
          <EyebrowLabel tone="clay">Step 3 of 4</EyebrowLabel>
          <h2>Your first visit</h2>
          <p style={{color:'var(--ink-2)',marginBottom:24}}>Pick a {venue?.meeting_day ?? 'Tuesday'} that works for you. No pressure — you can always come along without booking.</p>
          <div className="signup-meetings">
            {meetings.length === 0 && <p style={{color:'var(--ink-3)'}}>No upcoming meetings scheduled yet. Check back soon.</p>}
            {meetings.map(m => (
              <button key={m.id} type="button"
                className={`signup-meeting${form.meetingId === m.id ? ' signup-meeting--active' : ''}`}
                onClick={() => set('meetingId', m.id)}
              >
                <div className={`signup-meeting__badge${form.meetingId === m.id ? ' signup-meeting__badge--active' : ''}`}>
                  <span>{formatDay(m.meeting_date)}</span>
                  <span>{formatMonth(m.meeting_date)}</span>
                </div>
                <div className="signup-meeting__info">
                  <span className="wsc-eyebrow">{m.meeting_type || 'Regular meeting'}</span>
                  <strong style={{fontFamily:'var(--serif)',fontSize:18}}>{m.theme || 'Open session'}</strong>
                  <span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--ink-4)'}}>{venue?.meeting_time ?? '7:00pm'} · {venue?.venue_name ?? 'Winchburgh Community Centre'}</span>
                </div>
                <div className={`signup-meeting__radio${form.meetingId === m.id ? ' signup-meeting__radio--active' : ''}`}>
                  {form.meetingId === m.id && '✓'}
                </div>
              </button>
            ))}
          </div>
          <details className="signup-notes">
            <summary>Anything we should know? <span style={{color:'var(--ink-4)',fontWeight:400}}>(optional)</span></summary>
            <textarea
              className="wsc-input wsc-textarea"
              style={{marginTop:12}}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Mobility needs, hearing loop, dietary requirements... or just: please don't put me on the spot."
              rows={4}
            />
          </details>
          {submitError && <p className="input-field__error">{submitError}</p>}
          <div style={{display:'flex',gap:12,marginTop:8}}>
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleSubmit} disabled={!step3Valid || submitting}>
              {submitting ? 'Reserving…' : 'Reserve my spot'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="signup-step signup-step--done" key="step4">
          <div className="signup-done__mark">&#10003;</div>
          <EyebrowLabel tone="gold">You&apos;re booked in</EyebrowLabel>
          <h2>Brilliant, <em style={{fontStyle:'italic',color:'oklch(0.55 0.155 60)'}}>{form.firstName}</em>. We&apos;ll see you then.</h2>
          <p style={{color:'var(--ink-2)',maxWidth:480}}>
            We&apos;ve sent a confirmation to <strong>{form.email}</strong>. Come along and enjoy your first visit — after that, we&apos;ll email you an invite link to set up your member account.
          </p>
          {selectedMeeting && (
            <div className="signup-confirmation">
              <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:16}}>
                <div className="signup-meeting__badge signup-meeting__badge--active" style={{width:56,height:64,fontSize:16}}>
                  <span style={{fontSize:28,fontWeight:600}}>{formatDay(selectedMeeting.meeting_date)}</span>
                  <span>{formatMonth(selectedMeeting.meeting_date)}</span>
                </div>
                <div>
                  <p className="wsc-eyebrow" style={{color:'var(--gold)'}}>Your visit</p>
                  <p style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:500}}>{selectedMeeting.theme || 'Open session'}</p>
                  <p style={{fontFamily:'var(--mono)',fontSize:12,color:'oklch(0.78 0.04 240)'}}>{formatFullDate(selectedMeeting.meeting_date)} · {venue?.meeting_time ?? '7:00pm'}</p>
                </div>
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <Button href={calendarUrl(selectedMeeting, venue)}>Add to calendar</Button>
                <Button variant="ghost-light" href={mapsUrl(venue ?? {})}>Get directions</Button>
              </div>
            </div>
          )}
          <div className="signup-expect wsc-card" style={{marginTop:24}}>
            <p className="wsc-eyebrow" style={{marginBottom:16}}>What to expect</p>
            {['Someone will meet you at the door', `Doors open at ${venue?.meeting_doors_time ?? '6:30pm'}, kettle on, meeting starts at ${venue?.meeting_time ?? '7:00pm'}`, "You don't have to speak — just watch", "Nothing to bring, nothing to pay"].map(item => (
              <div key={item} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--rule-soft)'}}>
                <span style={{width:28,height:28,borderRadius:'50%',background:'var(--clay-soft)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:14}}>&#10003;</span>
                <span style={{color:'var(--ink-2)'}}>{item}</span>
              </div>
            ))}
          </div>
          <p style={{marginTop:24,fontSize:14,color:'var(--ink-4)'}}>Questions? Email us at <a href="mailto:hello@winchburghspeakersclub.uk" style={{color:'var(--clay)'}}>hello@winchburghspeakersclub.uk</a></p>
        </div>
      )}
    </div>
  )
}
