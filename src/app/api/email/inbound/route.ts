import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { Resend } from 'resend'
import { createServiceClient } from '@/utils/supabase/service'
import {
  extractRoutingId,
  htmlToText,
  isDuplicateDeliveryError,
  stripQuotedReply,
} from '@/lib/email-utils'

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
  const routing = extractRoutingId(toAddresses)

  if (!routing) {
    console.info('[inbound] no matching plus-address found in:', toAddresses)
    return NextResponse.json({ ok: true })
  }

  const emailId = payload.data?.email_id
  if (!emailId) {
    console.error('[inbound] no email_id in payload')
    return NextResponse.json({ ok: true })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  // Fetch full email content — webhook payload contains metadata only, not body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchResult = await (resend.emails.receiving as any).get(emailId)
  if (fetchResult.error || !fetchResult.data) {
    console.error('[inbound] fetch failed:', fetchResult.error?.statusCode, fetchResult.error?.message)
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
  const email = fetchResult.data

  const rawText: string | null = email.text ?? null
  const rawHtml: string | null = email.html ?? null
  const source = rawText ?? (rawHtml ? htmlToText(rawHtml) : null)
  const body = source ? stripQuotedReply(source) : '[No message body]'

  const supabase = createServiceClient()

  if (routing.type === 'enquiry') {
    const { data: enquiry, error: enquiryError } = await supabase
      .from('contact_messages')
      .select('id')
      .eq('id', routing.id)
      .single()

    if (enquiryError || !enquiry) {
      console.info('[inbound] enquiry not found:', routing.id)
      return NextResponse.json({ ok: true })
    }

    const { error: insertError } = await supabase
      .from('enquiry_messages')
      .insert({
        enquiry_id: routing.id,
        direction: 'inbound',
        body,
        sent_by: null,
        resend_email_id: emailId,
      })

    if (insertError) {
      if (isDuplicateDeliveryError(insertError)) {
        console.info('[inbound] enquiry email already processed, skipping:', emailId)
        return NextResponse.json({ ok: true })
      }
      console.error('[inbound] enquiry insert failed:', insertError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  } else if (routing.type === 'communication') {
    const { data: comm, error: commError } = await supabase
      .from('communications')
      .select('id')
      .eq('id', routing.id)
      .single()

    if (commError || !comm) {
      console.info('[inbound] communication not found:', routing.id)
      return NextResponse.json({ ok: true })
    }

    // email.from may be "Name <addr>" or just "addr" — parse both
    const rawFrom: string = email.from ?? ''
    const fromMatch = rawFrom.match(/^(.+?)\s*<([^>]+)>$/)
    const fromEmail: string = fromMatch ? fromMatch[2] : rawFrom
    const fromName: string = fromMatch ? fromMatch[1].trim() : ''

    const { error: insertError } = await supabase
      .from('communication_replies')
      .insert({
        communication_id: routing.id,
        from_email: fromEmail,
        from_name: fromName,
        body,
        resend_email_id: emailId,
      })

    if (insertError) {
      if (isDuplicateDeliveryError(insertError)) {
        console.info('[inbound] communication email already processed, skipping:', emailId)
        return NextResponse.json({ ok: true })
      }
      console.error('[inbound] comm reply insert failed:', insertError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  } else if (routing.type === 'correspondence_new') {
    const rawFrom: string = email.from ?? ''
    const fromMatch = rawFrom.match(/^(.+?)\s*<([^>]+)>$/)
    const fromEmail: string = fromMatch ? fromMatch[2] : rawFrom
    const fromName: string = fromMatch ? fromMatch[1].trim() : ''
    const subject: string = (email.subject as string | null) ?? '(No subject)'

    // Insert correspondence row — ignore if this emailId was already processed (retry-safe)
    const { data: corr, error: corrError } = await supabase
      .from('external_correspondence')
      .insert({ subject, from_email: fromEmail, from_name: fromName, resend_email_id: emailId })
      .select('id')
      .single()

    if (corrError) {
      // Duplicate resend_email_id means Resend is retrying a previously-processed email
      if ((corrError as { code?: string }).code === '23505') {
        console.info('[inbound] correspondence already processed, skipping:', emailId)
        return NextResponse.json({ ok: true })
      }
      console.error('[inbound] correspondence insert failed:', corrError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }

    if (!corr) {
      console.error('[inbound] correspondence insert returned no data')
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }

    const { error: msgError } = await supabase
      .from('correspondence_messages')
      .insert({
        correspondence_id: corr.id,
        direction: 'inbound',
        body,
        from_email: fromEmail,
        from_name: fromName,
        resend_email_id: emailId,
      })

    if (msgError) {
      if (isDuplicateDeliveryError(msgError)) {
        console.info('[inbound] correspondence email already processed, skipping:', emailId)
        return NextResponse.json({ ok: true })
      }
      console.error('[inbound] correspondence message insert failed:', fromEmail, msgError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  } else if (routing.type === 'correspondence_reply') {
    const { data: corr, error: corrError } = await supabase
      .from('external_correspondence')
      .select('id')
      .eq('id', routing.id)
      .single()

    if (corrError || !corr) {
      console.info('[inbound] correspondence not found:', routing.id)
      return NextResponse.json({ ok: true })
    }

    const rawFrom: string = email.from ?? ''
    const fromMatch = rawFrom.match(/^(.+?)\s*<([^>]+)>$/)
    const fromEmail: string = fromMatch ? fromMatch[2] : rawFrom
    const fromName: string = fromMatch ? fromMatch[1].trim() : ''

    const { error: msgError } = await supabase
      .from('correspondence_messages')
      .insert({
        correspondence_id: routing.id,
        direction: 'inbound',
        body,
        from_email: fromEmail,
        from_name: fromName,
        resend_email_id: emailId,
      })

    if (msgError) {
      if (isDuplicateDeliveryError(msgError)) {
        console.info('[inbound] correspondence reply already processed, skipping:', emailId)
        return NextResponse.json({ ok: true })
      }
      console.error('[inbound] correspondence reply insert failed:', msgError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
