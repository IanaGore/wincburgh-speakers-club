import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'West Lothian Speakers Club <noreply@winchburghspeakersclub.uk>'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function sendInviteEmail(
  to: string,
  firstName: string,
  joinUrl: string,
  expiresAt: Date
): Promise<void> {
  const expiry = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your invitation to join West Lothian Speakers Club',
    html: `
      <p>Hi ${esc(firstName)},</p>
      <p>You've been invited to create your member account at West Lothian Speakers Club.</p>
      <p><a href="${esc(joinUrl)}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Set up your account</a></p>
      <p>This link expires on <strong>${esc(expiry)}</strong>.</p>
      <p>If you weren't expecting this, you can ignore it safely.</p>
    `,
  })
}

export interface ContactPayload {
  name: string
  email: string
  phone?: string
  topic?: string
  message: string
}

export async function sendContactNotification(
  adminEmail: string,
  payload: ContactPayload
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New contact message from ${payload.name}`,
    html: `
      <p><strong>From:</strong> ${esc(payload.name)} (${esc(payload.email)})</p>
      ${payload.phone ? `<p><strong>Phone:</strong> ${esc(payload.phone)}</p>` : ''}
      ${payload.topic ? `<p><strong>Topic:</strong> ${esc(payload.topic)}</p>` : ''}
      <hr/>
      <p>${esc(payload.message).replace(/\n/g, '<br/>')}</p>
    `,
  })
}

export async function sendRsvpConfirmation(
  to: string,
  firstName: string,
  meetingDate: string,
  venue: string
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your RSVP is confirmed — West Lothian Speakers Club',
    html: `
      <p>Hi ${firstName},</p>
      <p>You're confirmed for our meeting on <strong>${meetingDate}</strong> at <strong>${venue}</strong>.</p>
      <p>Your first three visits are free — just turn up and introduce yourself.</p>
      <p>We look forward to meeting you!</p>
      <p><a href="${siteUrl}">West Lothian Speakers Club</a></p>
    `,
  })
}
