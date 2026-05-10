'use client'
import { useActionState } from 'react'
import { sendContactMessage } from './actions'
import Button from '@/components/ui/Button'

const initialState = { success: false, error: null }

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState)

  if (state.success) {
    return (
      <div className="contact-success">
        <p style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>Message sent. We&apos;ll be in touch shortly.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="contact-form">
      <div className="contact-form__row">
        <div className="input-field">
          <label className="wsc-label" htmlFor="name">Your name</label>
          <input id="name" name="name" type="text" className="wsc-input" required placeholder="First name is fine" />
        </div>
        <div className="input-field">
          <label className="wsc-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" className="wsc-input" required placeholder="you@example.com" />
        </div>
      </div>
      <div className="input-field">
        <label className="wsc-label" htmlFor="phone">Phone <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></label>
        <input id="phone" name="phone" type="tel" className="wsc-input" placeholder="07700 000000" />
      </div>
      <div className="input-field">
        <label className="wsc-label" htmlFor="topic">What&apos;s it about?</label>
        <select id="topic" name="topic" className="wsc-input">
          <option value="">Choose a topic</option>
          <option value="visit">I&apos;d like to visit</option>
          <option value="membership">Membership question</option>
          <option value="venue">Venue / accessibility</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div className="input-field">
        <label className="wsc-label" htmlFor="message">Your message</label>
        <textarea id="message" name="message" className="wsc-input wsc-textarea" required rows={5} placeholder="What would you like to know?" />
      </div>
      <label className="contact-form__checkbox">
        <input type="checkbox" name="sms_ok" />
        <span>It&apos;s OK to text me back on the number above</span>
      </label>
      {state.error && <p className="input-field__error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  )
}
