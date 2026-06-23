import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  getEmail: vi.fn(),
  createServiceClient: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('svix', () => ({
  Webhook: class {
    verify = mocks.verify
  },
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { receiving: { get: mocks.getEmail } }
  },
}))

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: mocks.createServiceClient,
}))

import { POST } from './route'

const UUID = '550e8400-e29b-41d4-a716-446655440000'
const DOMAIN = 'winchburghspeakersclub.uk'

function requestFor(to: string): Request {
  return new Request('http://localhost/api/email/inbound', {
    method: 'POST',
    headers: {
      'svix-id': 'message-id',
      'svix-timestamp': '1234567890',
      'svix-signature': 'signature',
    },
    body: JSON.stringify({
      type: 'email.received',
      data: { email_id: 'resend-email-id', to: [to] },
    }),
  })
}

function lookupResult(table: string) {
  if (table === 'contact_messages' || table === 'communications' || table === 'external_correspondence') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: UUID }, error: null }),
        })),
      })),
    }
  }

  if (table === 'enquiry_messages' || table === 'communication_replies' || table === 'correspondence_messages') {
    return { insert: mocks.insert }
  }

  throw new Error(`Unexpected table: ${table}`)
}

describe('inbound email webhook retries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_WEBHOOK_SECRET = 'test-secret'
    process.env.RESEND_API_KEY = 'test-api-key'
    mocks.getEmail.mockResolvedValue({
      data: {
        from: 'Sender <sender@example.com>',
        subject: 'Hello',
        text: 'Reply body',
      },
      error: null,
    })
    mocks.createServiceClient.mockReturnValue({ from: vi.fn(lookupResult) })
  })

  it.each([
    ['enquiry', `reply+${UUID}@${DOMAIN}`],
    ['communication', `reply+comm-${UUID}@${DOMAIN}`],
    ['correspondence reply', `reply+corr-${UUID}@${DOMAIN}`],
  ])('accepts a duplicate %s delivery as already processed', async (_route, to) => {
    mocks.insert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } })

    const response = await POST(requestFor(to) as never)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      resend_email_id: 'resend-email-id',
    }))
  })

  it('returns 500 for a non-duplicate database error', async () => {
    mocks.insert.mockResolvedValueOnce({ error: { code: '42501', message: 'denied' } })

    const response = await POST(requestFor(`reply+${UUID}@${DOMAIN}`) as never)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'insert failed' })
  })
})
