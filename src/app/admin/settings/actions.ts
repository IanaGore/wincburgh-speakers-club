'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function updateSettings(formData: FormData) {
  const supabase = await createClient()

  const hero_title = formData.get('hero_title') as string
  const hero_subtitle = formData.get('hero_subtitle') as string
  const about_text = formData.get('about_text') as string

  const { error } = await supabase
    .from('site_settings')
    .update({ hero_title, hero_subtitle, about_text })
    .eq('id', 1)

  if (error) {
    console.error(error)
    throw new Error("Failed to update settings")
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}
