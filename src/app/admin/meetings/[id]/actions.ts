'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { VALID_PATHWAY_CODES } from '@/lib/pathways'

export type ActionResult = {
  ok?: boolean
  error?: string
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

function isSpeechRole(roleName: string): boolean {
  return roleName.startsWith('Speech') || roleName.startsWith('Speaker')
}

function revalidateMeetingPaths(meetingId: string) {
  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath(`/admin/meetings/${meetingId}/summary`)
  revalidatePath('/member/dashboard')
  revalidatePath('/member/speeches')
}

export async function updateMeetingDetails(formData: FormData): Promise<ActionResult> {
  await checkAdmin()
  const supabase = await createClient()

  const meetingId = String(formData.get('meeting_id') ?? '').trim()
  const meetingDate = String(formData.get('meeting_date') ?? '').trim()
  const theme = String(formData.get('theme') ?? '').trim()
  const agendaNotes = formData.has('agenda_notes')
    ? String(formData.get('agenda_notes') ?? '').trim()
    : undefined
  const meetingType = formData.has('meeting_type')
    ? String(formData.get('meeting_type') ?? '').trim()
    : undefined

  if (!meetingId) {
    return { error: 'Missing meeting identifier.' }
  }
  if (!isValidIsoDate(meetingDate)) {
    return { error: 'Please enter a valid meeting date.' }
  }
  if (theme.length > 200) {
    return { error: 'Theme must be 200 characters or fewer.' }
  }
  if (agendaNotes !== undefined && agendaNotes.length > 2000) {
    return { error: 'Notes must be 2000 characters or fewer.' }
  }
  if (meetingType !== undefined && meetingType.length > 100) {
    return { error: 'Meeting type must be 100 characters or fewer.' }
  }

  const { data: conflict, error: conflictError } = await supabase
    .from('meetings')
    .select('id')
    .eq('meeting_date', meetingDate)
    .neq('id', meetingId)
    .limit(1)

  if (conflictError) {
    console.error('Meeting date conflict check error:', conflictError)
    return { error: 'Could not verify meeting date. Please try again.' }
  }
  if (conflict && conflict.length > 0) {
    return { error: 'Another meeting is already scheduled on this date.' }
  }

  const updates: Record<string, string | null> = {
    meeting_date: meetingDate,
    theme: theme || null,
  }
  if (agendaNotes !== undefined) {
    updates.agenda_notes = agendaNotes || null
  }
  if (meetingType !== undefined) {
    updates.meeting_type = meetingType || null
  }

  const { error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', meetingId)

  if (error) {
    console.error('Update meeting error:', error)
    return { error: 'Failed to update meeting details.' }
  }

  revalidatePath('/admin/meetings')
  revalidateMeetingPaths(meetingId)
  revalidatePath('/meetings')
  revalidatePath('/')
  revalidatePath('/get-started')
  revalidatePath('/login')

  return { ok: true }
}

export async function updateAssignment(formData: FormData): Promise<ActionResult> {
  await checkAdmin()
  const supabase = await createClient()

  const assignmentId = String(formData.get('assignment_id') ?? '').trim()
  const meetingId = String(formData.get('meeting_id') ?? '').trim()
  const roleName = String(formData.get('role_name') ?? '').trim()
  const rawMemberId = String(formData.get('member_id') ?? '').trim()
  const memberId = rawMemberId || null
  const speechLevel = String(formData.get('speech_level') ?? '').trim()
  const speechTitle = String(formData.get('speech_title') ?? '').trim()
  const speechLength = String(formData.get('speech_length') ?? '').trim()

  if (!assignmentId || !meetingId) {
    return { error: 'Missing role or meeting identifier.' }
  }
  if (!roleName) {
    return { error: 'Role name cannot be empty.' }
  }
  if (roleName.length > 100) {
    return { error: 'Role name must be 100 characters or fewer.' }
  }
  if (speechTitle.length > 200) {
    return { error: 'Speech title must be 200 characters or fewer.' }
  }
  if (speechLength.length > 50) {
    return { error: 'Estimated length must be 50 characters or fewer.' }
  }

  const normalizedLevel = speechLevel.toUpperCase()
  if (
    normalizedLevel &&
    !(VALID_PATHWAY_CODES as readonly string[]).includes(normalizedLevel)
  ) {
    return { error: 'Invalid speech level.' }
  }

  const { data: duplicate, error: dupError } = await supabase
    .from('meeting_assignments')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('role_name', roleName)
    .neq('id', assignmentId)
    .limit(1)

  if (dupError) {
    console.error('Role duplicate check error:', dupError)
    return { error: 'Could not verify role name. Please try again.' }
  }
  if (duplicate && duplicate.length > 0) {
    return { error: `A role named "${roleName}" already exists in this meeting.` }
  }

  const keepSpeechDetails = memberId !== null && isSpeechRole(roleName)
  const updates = {
    role_name: roleName,
    member_id: memberId,
    speech_level: keepSpeechDetails ? normalizedLevel || null : null,
    speech_title: keepSpeechDetails ? speechTitle || null : null,
    speech_length: keepSpeechDetails ? speechLength || null : null,
  }

  const { error } = await supabase
    .from('meeting_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .eq('meeting_id', meetingId)

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { error: `A role named "${roleName}" already exists in this meeting.` }
    }
    console.error('Update assignment error:', error)
    return { error: 'Failed to update role.' }
  }

  revalidateMeetingPaths(meetingId)
  return { ok: true }
}

export async function quickAssignMember(
  assignmentId: string,
  meetingId: string,
  memberId: string | null,
): Promise<ActionResult> {
  await checkAdmin()
  const supabase = await createClient()

  const cleanAssignmentId = assignmentId.trim()
  const cleanMeetingId = meetingId.trim()
  const normalizedMemberId = memberId?.trim() || null

  if (!cleanAssignmentId || !cleanMeetingId) {
    return { error: 'Missing role or meeting identifier.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('meeting_assignments')
    .select('member_id')
    .eq('id', cleanAssignmentId)
    .eq('meeting_id', cleanMeetingId)
    .single()

  if (fetchError || !existing) {
    return { error: 'Role not found.' }
  }

  if (existing.member_id === normalizedMemberId) {
    return { ok: true }
  }

  const { error } = await supabase
    .from('meeting_assignments')
    .update({
      member_id: normalizedMemberId,
      speech_title: null,
      speech_level: null,
      speech_length: null,
    })
    .eq('id', cleanAssignmentId)
    .eq('meeting_id', cleanMeetingId)

  if (error) {
    console.error('Quick assign error:', error)
    return { error: 'Failed to update assigned member.' }
  }

  revalidateMeetingPaths(cleanMeetingId)
  return { ok: true }
}

export async function addCustomRole(formData: FormData): Promise<ActionResult> {
  await checkAdmin()
  const supabase = await createClient()

  const meetingId = String(formData.get('meeting_id') ?? '').trim()
  const roleName = String(formData.get('role_name') ?? '').trim()
  const rawMemberId = String(formData.get('member_id') ?? '').trim()
  const memberId = rawMemberId || null

  if (!meetingId) {
    return { error: 'Missing meeting identifier.' }
  }
  if (!roleName) {
    return { error: 'Role name cannot be empty.' }
  }
  if (roleName.length > 100) {
    return { error: 'Role name must be 100 characters or fewer.' }
  }

  const { data: duplicate, error: dupError } = await supabase
    .from('meeting_assignments')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('role_name', roleName)
    .limit(1)

  if (dupError) {
    console.error('Add role duplicate check error:', dupError)
    return { error: 'Could not verify role name. Please try again.' }
  }
  if (duplicate && duplicate.length > 0) {
    return { error: `A role named "${roleName}" already exists in this meeting.` }
  }

  const { error } = await supabase
    .from('meeting_assignments')
    .insert({ meeting_id: meetingId, role_name: roleName, member_id: memberId })

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { error: `A role named "${roleName}" already exists in this meeting.` }
    }
    console.error('Add role error:', error)
    return { error: 'Failed to add role.' }
  }

  revalidateMeetingPaths(meetingId)
  return { ok: true }
}

export async function deleteRole(assignmentId: string, meetingId: string) {
  await checkAdmin()
  const supabase = await createClient()
  await supabase
    .from('meeting_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('meeting_id', meetingId)
  revalidateMeetingPaths(meetingId)
}

export async function deleteRoleFromForm(formData: FormData) {
  const assignmentId = String(formData.get('assignmentId') ?? '')
  const meetingId = String(formData.get('meetingId') ?? '')
  await deleteRole(assignmentId, meetingId)
}
