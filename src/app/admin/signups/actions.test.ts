import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  sendInviteEmail: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/email', () => ({ sendInviteEmail: mocks.sendInviteEmail }))

import { sendConversionInvite } from './actions'

function createSupabaseMock(signup: { id: string; email: string; first_name: string; invite_count: number; invite_sent_at: string }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
            })),
          })),
        }
      }

      if (table === 'signups') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: signup, error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('sendConversionInvite', () => {
  it('blocks resends inside the 24-hour cooldown', async () => {
    mocks.createClient.mockResolvedValueOnce(
      createSupabaseMock({
        id: 'signup-id',
        email: 'member@example.com',
        first_name: 'Member',
        invite_count: 1,
        invite_sent_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }),
    )

    await expect(sendConversionInvite('signup-id')).rejects.toThrow('Please wait')
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
  })
})
