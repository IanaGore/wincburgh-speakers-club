'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkTreasurerOrAdmin } from '@/utils/supabase/auth-helpers'

const MEMBER_ROLES = [
  "Member",
  "Social Secretary",
  "Development Manager",
  "Club Secretary",
  "Vice President",
  "President",
  "Education Director",
  "Treasurer"
]

export async function createPaymentPeriod(formData: FormData) {
  const user = await checkTreasurerOrAdmin()
  const supabase = await createClient()

  const label = formData.get('label') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string

  if (!label || !start_date || !end_date) {
    throw new Error('All fields are required')
  }

  const { data: period, error: periodError } = await supabase
    .from('payment_periods')
    .insert({ label, start_date, end_date, created_by: user.id })
    .select('id')
    .single()

  if (periodError || !period) {
    console.error("Failed to create payment period:", periodError)
    throw new Error("Failed to create payment period")
  }

  // Auto-populate member_payments for all active members (non-guest roles)
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, club_roles')
    .eq('is_active', true)
    .overlaps('club_roles', MEMBER_ROLES)

  if (membersError) {
    console.error("Failed to fetch members for payment period:", membersError)
    throw new Error("Failed to populate payment records")
  }

  if (members && members.length > 0) {
    const { error: insertError } = await supabase
      .from('member_payments')
      .insert(members.map(m => ({ period_id: period.id, member_id: m.id })))

    if (insertError) {
      console.error("Failed to create member payment records:", insertError)
      throw new Error("Failed to create payment records")
    }
  }

  revalidatePath('/admin/payments')
}

export async function toggleMemberPayment(formData: FormData) {
  await checkTreasurerOrAdmin()
  const supabase = await createClient()

  const periodId = formData.get('period_id') as string
  const memberId = formData.get('member_id') as string
  const current = formData.get('has_paid') === 'true'
  const newPaid = !current

  const { error } = await supabase
    .from('member_payments')
    .update({
      has_paid: newPaid,
      paid_at: newPaid ? new Date().toISOString() : null
    })
    .eq('period_id', periodId)
    .eq('member_id', memberId)

  if (error) {
    console.error("Failed to update payment status:", error)
    throw new Error("Failed to update payment status")
  }

  revalidatePath(`/admin/payments/${periodId}`)
}
