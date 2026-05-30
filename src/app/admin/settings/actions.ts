'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

export async function updateSettings(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const hero_title = formData.get('hero_title') as string
  const hero_subtitle = formData.get('hero_subtitle') as string
  const about_text = formData.get('about_text') as string
  const venue_name = formData.get('venue_name') as string
  const venue_address = formData.get('venue_address') as string
  const how_it_works_eyebrow = formData.get('how_it_works_eyebrow') as string
  const how_it_works_heading = formData.get('how_it_works_heading') as string
  const how_it_works_heading_em = formData.get('how_it_works_heading_em') as string

  const { error } = await supabase
    .from('site_settings')
    .update({
      hero_title, hero_subtitle, about_text, venue_name, venue_address,
      how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em,
    })
    .eq('id', 1)

  if (error) {
    console.error(error)
    throw new Error("Failed to update settings")
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}

export async function addStep() {
  await checkAdmin()
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from('how_it_works_steps')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('how_it_works_steps')
    .insert({ title: 'New step', body: 'Describe this step.', sort_order: nextOrder })
    .select('id, title, body')
    .single()

  if (error || !data) {
    console.error(error)
    throw new Error('Failed to add step')
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
  return data
}

export async function updateStep(id: string, title: string, body: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('how_it_works_steps')
    .update({ title, body })
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Failed to update step')
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}

export async function deleteStep(id: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('how_it_works_steps')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Failed to delete step')
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}

export async function reorderSteps(orderedIds: string[]) {
  await checkAdmin()
  const supabase = await createClient()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('how_it_works_steps')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])

    if (error) {
      console.error(error)
      throw new Error('Failed to reorder steps')
    }
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}
