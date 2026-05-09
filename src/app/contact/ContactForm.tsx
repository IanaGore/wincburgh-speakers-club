'use client'

import { useRef } from 'react'
import { submitContactForm } from './actions'

export default function ContactForm({ success }: { success: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <>
      {success && (
        <div className="contact-form__success" role="alert">
          Thanks for reaching out! We&apos;ll get back to you soon.
        </div>
      )}
      <form
        ref={formRef}
        action={submitContactForm}
        className="contact-form"
      >
        <div className="contact-form__row">
          <div className="contact-form__field">
            <label htmlFor="name" className="wsc-label">Your name</label>
            <input id="name" name="name" type="text" required className="wsc-input" placeholder="Margaret Smith" />
          </div>
          <div className="contact-form__field">
            <label htmlFor="email" className="wsc-label">Email address</label>
            <input id="email" name="email" type="email" required className="wsc-input" placeholder="margaret@example.com" />
          </div>
        </div>

        <div className="contact-form__field">
          <label htmlFor="topic" className="wsc-label">What&apos;s it about?</label>
          <select id="topic" name="topic" className="contact-form__select">
            <option value="">Choose a topic…</option>
            <option value="visiting">I&apos;d like to visit a meeting</option>
            <option value="joining">Joining as a member</option>
            <option value="speaking">Speaking or event enquiry</option>
            <option value="other">Something else</option>
          </select>
        </div>

        <div className="contact-form__field">
          <label htmlFor="message" className="wsc-label">Your message</label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="wsc-textarea"
            placeholder="Ask us anything. We don't bite."
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="allow_text"
            style={{ accentColor: 'var(--gold)', width: 18, height: 18 }}
          />
          <span className="wsc-label" style={{ margin: 0 }}>
            It&apos;s ok to text me back if you need a quick answer
          </span>
        </label>

        <button type="submit" className="contact-form__submit">
          Send message
        </button>
      </form>
    </>
  )
}
