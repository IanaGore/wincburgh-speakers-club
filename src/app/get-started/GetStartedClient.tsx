'use client'

import { useState } from 'react'
import SignupFlow from '@/app/signup/SignupFlow'
import ContactForm from '@/app/contact/ContactForm'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import { mapsUrl, venueName, venueAddress } from '@/lib/venue'

type Meeting = { id: string; meeting_date: string; theme: string | null; meeting_type: string | null }
type VenueSettings = Parameters<typeof venueName>[0]
type Facility = { id: string; icon: string; label: string }

interface Props {
  initialIntent: 'attend' | 'ask' | null
  meetings: Meeting[]
  venue: VenueSettings | null
  facilities: Facility[]
}

export default function GetStartedClient({ initialIntent, meetings, venue, facilities }: Props) {
  const [intent, setIntent] = useState<'attend' | 'ask' | null>(initialIntent)

  if (!intent) {
    return (
      <div className="gs-chooser">
        <EyebrowLabel tone="clay">Get started</EyebrowLabel>
        <h1>How can we help?</h1>
        <p className="gs-chooser__intro">Choose what best fits what you&apos;re looking for.</p>
        <div className="gs-chooser__cards">
          <button className="gs-chooser__card" onClick={() => setIntent('attend')}>
            <span className="gs-chooser__icon" aria-hidden>🎙️</span>
            <strong>Come to a meeting</strong>
            <span>Reserve your spot for an upcoming session — your first three visits are free.</span>
          </button>
          <button className="gs-chooser__card" onClick={() => setIntent('ask')}>
            <span className="gs-chooser__icon" aria-hidden>✉️</span>
            <strong>Ask a question</strong>
            <span>Send us a message and we&apos;ll get back to you soon.</span>
          </button>
        </div>
      </div>
    )
  }

  if (intent === 'attend') {
    return (
      <div className="gs-attend">
        <button className="gs-back" onClick={() => setIntent(null)}>← Back</button>
        <SignupFlow meetings={meetings} venue={venue ?? null} />
      </div>
    )
  }

  return (
    <div className="gs-ask">
      <button className="gs-back" onClick={() => setIntent(null)}>← Back</button>
      <div className="gs-ask__inner">
        <div className="gs-ask__left">
          <EyebrowLabel tone="clay">Get in touch</EyebrowLabel>
          <h1>We&apos;d love to hear from you</h1>
          <p className="gs-ask__intro">Whether you&apos;re curious about visiting, have a question, or just want to say hello — drop us a message and we&apos;ll get back to you soon.</p>
          <ContactForm />
        </div>
        <aside className="gs-ask__right">
          <div className="gs-find-us wsc-card" id="find-us">
            <EyebrowLabel>Find us</EyebrowLabel>
            <h2>{venueName(venue ?? {})}</h2>
            <address>
              <p>{venueAddress(venue ?? {})}</p>
            </address>
            {facilities.length > 0 && (
              <p className="gs-find-us__access">
                {facilities.map((f) => (
                  <span key={f.id} style={{ display: 'block' }}>{f.icon} {f.label}</span>
                ))}
              </p>
            )}
            <a href={mapsUrl(venue ?? {})} target="_blank" rel="noopener noreferrer" className="wsc-btn wsc-btn-ghost wsc-btn-sm gs-find-us__link">
              Get directions
            </a>
          </div>
          <div className="gs-faqs">
            <EyebrowLabel>Common questions</EyebrowLabel>
            <details className="gs-faq">
              <summary>Do I need to book?</summary>
              <p>No booking needed for your first three visits. Just turn up. If you&apos;d like to let us know you&apos;re coming, you can use the form above — but it&apos;s not required.</p>
            </details>
            <details className="gs-faq">
              <summary>Will I have to speak?</summary>
              <p>Not on your first visit — or your second, or your third. You&apos;re welcome to just watch until you feel ready. Nobody will put you on the spot.</p>
            </details>
            <details className="gs-faq">
              <summary>What does it cost?</summary>
              <p>Your first three visits are completely free. After that, membership is £3 per meeting. No hidden costs, no annual fee.</p>
            </details>
          </div>
        </aside>
      </div>
    </div>
  )
}
