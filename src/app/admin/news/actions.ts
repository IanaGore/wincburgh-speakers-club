'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createPost(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const title = formData.get('title') as string
  const content = formData.get('content') as string

  const { error } = await supabase
    .from('news_posts')
    .insert([{ title, content, author_id: user.id }])

  if (error) {
    console.error("News Error:", error)
    throw new Error("Failed to create post")
  }

  revalidatePath('/admin/news')
  revalidatePath('/news')
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('news_posts').delete().eq('id', postId)
  
  if (error) throw new Error("Failed to delete post")
  
  revalidatePath('/admin/news')
  revalidatePath('/news')
}
