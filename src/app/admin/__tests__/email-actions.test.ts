import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkAdmin: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  sendCommunicationEmail: vi.fn(),
  sendCorrespondenceReply: vi.fn(),
  correspondenceInsert: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/utils/supabase/auth-helpers', () => ({ checkAdmin: mocks.checkAdmin }))
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/email', () => ({
  sendCommunicationEmail: mocks.sendCommunicationEmail,
  sendCorrespondenceReply: mocks.sendCorrespondenceReply,
}))

import { sendCommunicationAction } from '@/app/admin/communications/actions'
import { sendCorrespondenceReplyAction } from '@/app/admin/correspondence/actions'

function communicationFormData(): FormData {
  const formData = new FormData()
  formData.set('subject', 'Club update')
  formData.set('body', 'Hello members')
  formData.set('sender_title', 'President')
  formData.set('attachment_urls', '[]')
  formData.set('recipients', JSON.stringify([
    { email: 'one@example.com', name: 'One', recipient_type: 'member' },
    { email: 'two@example.com', name: 'Two', recipient_type: 'member' },
  ]))
  return formData
}

function replyFormData(): FormData {
  const formData = new FormData()
  formData.set('correspondence_id', '550e8400-e29b-41d4-a716-446655440000')
  formData.set('body', 'Thanks for getting in touch.')
  return formData
}

function createSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'communications') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'communication-id' }, error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }
      }

      if (table === 'communication_recipients') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }

      if (table === 'external_correspondence') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  from_email: 'sender@example.com',
                  from_name: 'Sender',
                  subject: 'Question',
                },
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'correspondence_messages') {
        return { insert: mocks.correspondenceInsert }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('admin email actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkAdmin.mockResolvedValue({ id: 'admin-id' })
    mocks.createClient.mockResolvedValue(createSupabaseMock())
    mocks.correspondenceInsert.mockResolvedValue({ error: null })
  })

  it('sends communications sequentially', async () => {
    let resolveFirst!: () => void
    const firstSend = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    mocks.sendCommunicationEmail
      .mockImplementationOnce(() => firstSend)
      .mockResolvedValueOnce(undefined)

    const pending = sendCommunicationAction(
      { error: null, success: false },
      communicationFormData(),
    )

    await vi.waitFor(() => expect(mocks.sendCommunicationEmail).toHaveBeenCalled())
    expect(mocks.sendCommunicationEmail).toHaveBeenCalledTimes(1)

    resolveFirst()
    await pending
    expect(mocks.sendCommunicationEmail).toHaveBeenCalledTimes(2)
  })

  it('does not add a thread entry when correspondence email delivery fails', async () => {
    mocks.sendCorrespondenceReply.mockRejectedValueOnce(new Error('provider unavailable'))

    const result = await sendCorrespondenceReplyAction(
      { error: null, success: false, successCount: 0 },
      replyFormData(),
    )

    expect(result.success).toBe(false)
    expect(mocks.correspondenceInsert).not.toHaveBeenCalled()
  })
})
