'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

const BUCKET = 'site-media'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function createPost(formData: FormData) {
  const user = await checkAdmin()
  const supabase = await createClient()

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const file = formData.get('image') as File | null

  const { data: post, error } = await supabase
    .from('news_posts')
    .insert([{ title, content, author_id: user.id }])
    .select('id')
    .single()

  if (error || !post) {
    console.error("News Error:", error)
    throw new Error("Failed to create post")
  }

  if (file && file.size > 0) {
    if (ALLOWED_TYPES.includes(file.type) && file.size <= MAX_BYTES) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mediaKey = `news_post_${post.id}`
      const storagePath = `${mediaKey}.${ext}`
      const altText = (formData.get('image_alt') as string | null) ?? ''
      const buffer = Buffer.from(await file.arrayBuffer())
      const admin = getAdminClient()
      await admin.storage.from(BUCKET).upload(storagePath, buffer, { contentType: file.type, upsert: true })
      await admin.from('media').upsert({ key: mediaKey, storage_path: storagePath, alt_text: altText, updated_at: new Date().toISOString() })
    }
  }

  revalidatePath('/admin/news')
  revalidatePath('/news')
}

export async function deletePost(postId: string) {
  await checkAdmin()
  const supabase = await createClient()
  
  const { error } = await supabase.from('news_posts').delete().eq('id', postId)
  
  if (error) throw new Error("Failed to delete post")
  
  revalidatePath('/admin/news')
  revalidatePath('/news')
}
