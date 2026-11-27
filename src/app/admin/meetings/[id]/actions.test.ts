import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  checkAdmin: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/utils/supabase/auth-helpers', () => ({ checkAdmin: mocks.checkAdmin }))

import {
  addCustomRole,
  quickAssignMember,
  updateAssignment,
  updateMeetingDetails,
} from './actions'

function makeFormData(entries: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v)
  }
  return fd
}

describe('meeting management actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkAdmin.mockResolvedValue({ id: 'admin-1' })
  })

  describe('updateMeetingDetails', () => {
    it('rejects impossible calendar dates', async () => {
      mocks.createClient.mockResolvedValueOnce({ from: vi.fn() })

      const res = await updateMeetingDetails(
        makeFormData({
          meeting_id: 'm1',
          meeting_date: '2026-02-31',
          theme: 'Test',
        }),
      )

      expect(res).toEqual({ error: 'Please enter a valid meeting date.' })
    })

    it('rejects duplicate meeting dates on another meeting', async () => {
      const updateSpy = vi.fn()
      mocks.createClient.mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [{ id: 'm2' }], error: null }),
              })),
            })),
          })),
          update: updateSpy,
        })),
      })

      const res = await updateMeetingDetails(
        makeFormData({
          meeting_id: 'm1',
          meeting_date: '2026-07-07',
          theme: 'Confidence',
        }),
      )

      expect(res).toEqual({ error: 'Another meeting is already scheduled on this date.' })
      expect(updateSpy).not.toHaveBeenCalled()
    })

    it('updates date, theme, and agenda_notes and revalidates paths', async () => {
      const updateEqSpy = vi.fn().mockResolvedValue({ error: null })
      const updateSpy = vi.fn(() => ({ eq: updateEqSpy }))

      mocks.createClient.mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
          update: updateSpy,
        })),
      })

      const res = await updateMeetingDetails(
        makeFormData({
          meeting_id: 'm1',
          meeting_date: '2026-07-07',
          theme: 'Storytelling',
          agenda_notes: 'Arrive at 6:30pm',
        }),
      )

      expect(res).toEqual({ ok: true })
      expect(updateSpy).toHaveBeenCalledWith({
        meeting_date: '2026-07-07',
        theme: 'Storytelling',
        agenda_notes: 'Arrive at 6:30pm',
      })
      expect(updateEqSpy).toHaveBeenCalledWith('id', 'm1')
      expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/meetings/m1')
      expect(mocks.revalidatePath).toHaveBeenCalledWith('/member/dashboard')
      expect(mocks.revalidatePath).toHaveBeenCalledWith('/meetings')
    })

    it('propagates checkAdmin rejection for non-admins', async () => {
      mocks.checkAdmin.mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(
        updateMeetingDetails(
          makeFormData({
            meeting_id: 'm1',
            meeting_date: '2026-07-07',
            theme: 'Test',
          }),
        ),
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('updateAssignment', () => {
    it('rejects empty role names', async () => {
      mocks.createClient.mockResolvedValueOnce({ from: vi.fn() })

      const res = await updateAssignment(
        makeFormData({
          assignment_id: 'a1',
          meeting_id: 'm1',
          role_name: '   ',
          member_id: '',
        }),
      )

      expect(res).toEqual({ error: 'Role name cannot be empty.' })
    })

    it('rejects duplicate role names within the same meeting', async () => {
      mocks.createClient.mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [{ id: 'a2' }], error: null }),
                })),
              })),
            })),
          })),
        })),
      })

      const res = await updateAssignment(
        makeFormData({
          assignment_id: 'a1',
          meeting_id: 'm1',
          role_name: 'Timekeeper',
          member_id: '',
        }),
      )

      expect(res).toEqual({
        error: 'A role named "Timekeeper" already exists in this meeting.',
      })
    })

    it('rejects invalid speech levels', async () => {
      mocks.createClient.mockResolvedValueOnce({ from: vi.fn() })

      const res = await updateAssignment(
        makeFormData({
          assignment_id: 'a1',
          meeting_id: 'm1',
          role_name: 'Speech 1',
          member_id: 'u1',
          speech_level: 'Z9',
        }),
      )

      expect(res).toEqual({ error: 'Invalid speech level.' })
    })

    it('clears speech details when unassigned or renamed to a non-speech role', async () => {
      const updateFinalEq = vi.fn().mockResolvedValue({ error: null })
      const updateFirstEq = vi.fn(() => ({ eq: updateFinalEq }))
      const updateSpy = vi.fn(() => ({ eq: updateFirstEq }))

      mocks.createClient.mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
          update: updateSpy,
        })),
      })

      await updateAssignment(
        makeFormData({
          assignment_id: 'a1',
          meeting_id: 'm1',
          role_name: 'Speech 1',
          member_id: '',
          speech_level: 'F1',
          speech_title: 'Old Title',
          speech_length: '6 - 8 minutes',
        }),
      )

      expect(updateSpy).toHaveBeenLastCalledWith({
        role_name: 'Speech 1',
        member_id: null,
        speech_level: null,
        speech_title: null,
        speech_length: null,
      })

      await updateAssignment(
        makeFormData({
          assignment_id: 'a1',
          meeting_id: 'm1',
          role_name: 'Topics Chair',
          member_id: 'u1',
          speech_level: 'F1',
          speech_title: 'Old Title',
          speech_length: '6 - 8 minutes',
        }),
      )

      expect(updateSpy).toHaveBeenLastCalledWith({
        role_name: 'Topics Chair',
        member_id: 'u1',
        speech_level: null,
        speech_title: null,
        speech_length: null,
      })
    })

    it('persists speech details when updating a speech role with an assigned member', async () => {
      const updateFinalEq = vi.fn().mockResolvedValue({ error: null })
      const updateFirstEq = vi.fn(() => ({ eq: updateFinalEq }))
      const updateSpy = vi.fn(() => ({ eq: updateFirstEq }))

      mocks.createClient.mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
          update: updateSpy,
        })),
      })

      const res = await updateAssignment(
        makeFormData({
          assignment_id: 'a1',
          meeting_id: 'm1',
          role_name: 'Speech 1',
          member_id: 'u1',
          speech_level: 'f2',
          speech_title: 'My Speech',
          speech_length: '5 - 7 minutes',
        }),
      )

      expect(res).toEqual({ ok: true })
      expect(updateSpy).toHaveBeenCalledWith({
        role_name: 'Speech 1',
        member_id: 'u1',
        speech_level: 'F2',
        speech_title: 'My Speech',
        speech_length: '5 - 7 minutes',
      })
    })
  })

  describe('quickAssignMember', () => {
    it('assigns an open role, reassigns, and unassigns while clearing stale speech details', async () => {
      const updateFinalEq = vi.fn().mockResolvedValue({ error: null })
      const updateFirstEq = vi.fn(() => ({ eq: updateFinalEq }))
      const updateSpy = vi.fn(() => ({ eq: updateFirstEq }))

      mocks.createClient
        .mockResolvedValueOnce({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { member_id: null },
                    error: null,
                  }),
                })),
              })),
            })),
            update: updateSpy,
          })),
        })
        .mockResolvedValueOnce({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { member_id: 'u1' },
                    error: null,
                  }),
                })),
              })),
            })),
            update: updateSpy,
          })),
        })
        .mockResolvedValueOnce({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { member_id: 'u2' },
                    error: null,
                  }),
                })),
              })),
            })),
            update: updateSpy,
          })),
        })

      expect(await quickAssignMember('a1', 'm1', 'u1')).toEqual({ ok: true })
      expect(updateSpy).toHaveBeenNthCalledWith(1, {
        member_id: 'u1',
        speech_title: null,
        speech_level: null,
        speech_length: null,
      })

      expect(await quickAssignMember('a1', 'm1', 'u2')).toEqual({ ok: true })
      expect(updateSpy).toHaveBeenNthCalledWith(2, {
        member_id: 'u2',
        speech_title: null,
        speech_level: null,
        speech_length: null,
      })

      expect(await quickAssignMember('a1', 'm1', null)).toEqual({ ok: true })
      expect(updateSpy).toHaveBeenNthCalledWith(3, {
        member_id: null,
        speech_title: null,
        speech_level: null,
        speech_length: null,
      })
    })
  })

  describe('addCustomRole', () => {
    it('rejects empty role names', async () => {
      mocks.createClient.mockResolvedValueOnce({ from: vi.fn() })

      const res = await addCustomRole(
        makeFormData({
          meeting_id: 'm1',
          role_name: ' ',
        }),
      )

      expect(res).toEqual({ error: 'Role name cannot be empty.' })
    })

    it('rejects duplicate role names', async () => {
      mocks.createClient.mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [{ id: 'a9' }], error: null }),
              })),
            })),
          })),
        })),
      })

      const res = await addCustomRole(
        makeFormData({
          meeting_id: 'm1',
          role_name: 'Timekeeper',
        }),
      )

      expect(res).toEqual({
        error: 'A role named "Timekeeper" already exists in this meeting.',
      })
    })

    it('inserts role with optional member_id', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null })

      mocks.createClient.mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
          insert: insertSpy,
        })),
      })

      const res = await addCustomRole(
        makeFormData({
          meeting_id: 'm1',
          role_name: 'Guest Speaker',
          member_id: 'u3',
        }),
      )

      expect(res).toEqual({ ok: true })
      expect(insertSpy).toHaveBeenCalledWith({
        meeting_id: 'm1',
        role_name: 'Guest Speaker',
        member_id: 'u3',
      })
    })
  })
})
