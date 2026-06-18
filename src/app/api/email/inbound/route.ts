import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const RECEIVING_DOMAIN = 'winchburghspeakersclub.uk'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function stripQuotedReply(text: string): string {
  const markers = [
    /\r?\n[-]{2,}\r?\nOn .+ wrote:/m,
    /\r?\n>[ ]?.+/m,
    /\r?\nFrom:[ ].+/m,
  ]
  for (const marker of markers) {
    const idx = text.search(marker)
    if (idx !== -1) {
      const stripped = text.slice(0, idx).trim()
      return stripped.length > 0 ? stripped : text.trim()
    }
  }
  return text.trim()
}

function extractEnquiryId(toAddresses: string[]): string | null {
  for (const addr of toAddresses) {
    const match = addr.match(/reply\+([^@]+)@(.+)/)
    if (!match) continue
    const [, id, domain] = match
    if (domain !== RECEIVING_DOMAIN) continue
    if (!UUID_RE.test(id)) continue
    return id
  }
  return null
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type InboundPayload = {
  type: string
  data?: {
    email_id?: string
    to?: string[]
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[inbound] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  }

  const rawBody = await req.text()
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  try {
    const wh = new Webhook(secret)
    wh.verify(rawBody, svixHeaders)
  } catch {
    console.warn('[inbound] signature verification failed')
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(rawBody) as InboundPayload

  if (payload.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const toAddresses = payload.data?.to ?? []
  const enquiryId = extractEnquiryId(toAddresses)

  if (!enquiryId) {
    console.info('[inbound] no matching plus-address found in:', toAddresses)
    return NextResponse.json({ ok: true })
  }

  const emailId = payload.data?.email_id
  if (!emailId) {
    console.error('[inbound] no email_id in payload')
    return NextResponse.json({ ok: true })
  }

  // Fetch full email content (webhook payload contains metadata only)
  const resend = new Resend(process.env.RESEND_API_KEY)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: email, error: fetchError } = await (resend.emails.receiving as any).get(emailId)
  if (fetchError || !email) {
    console.error('[inbound] failed to fetch email body:', fetchError)
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }

  const rawText: string | null = email.text ?? null
  const rawHtml: string | null = email.html ?? null
  const source = rawText ?? (rawHtml ? htmlToText(rawHtml) : null)
  const body = source ? stripQuotedReply(source) : '[No message body]'

  const supabase = getServiceClient()

  const { data: enquiry, error: enquiryError } = await supabase
    .from('contact_messages')
    .select('id')
    .eq('id', enquiryId)
    .single()

  if (enquiryError || !enquiry) {
    console.info('[inbound] enquiry not found:', enquiryId)
    return NextResponse.json({ ok: true })
  }

  const { error: insertError } = await supabase
    .from('enquiry_messages')
    .insert({
      enquiry_id: enquiryId,
      direction: 'inbound',
      body,
      sent_by: null,
    })

  if (insertError) {
    console.error('[inbound] insert failed:', insertError)
    return NextResponse.json({ error: 'insert failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
