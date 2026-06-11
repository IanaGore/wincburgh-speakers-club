'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

const BUCKET = 'site-media'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]

// Service role client bypasses Storage RLS — only used after checkAdmin()
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function revalidateResources() {
  // 'layout' covers the dynamic /member/resources/[slug] and /admin/resources/[id] children
  revalidatePath('/member/resources', 'layout')
  revalidatePath('/admin/resources', 'layout')
}

// --- Roles catalog -----------------------------------------------------------

export async function addRole() {
  await checkAdmin()
  const supabase = await createClient()
  const { data: maxRow } = await supabase
    .from('roles')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (maxRow?.sort_order ?? 0) + 1
  const { data, error } = await supabase
    .from('roles')
    .insert({ name: 'New role', slug: `new-role-${nextOrder}`, description: '', sort_order: nextOrder })
    .select('id, name, slug, description')
    .single()
  if (error || !data) throw new Error('Failed to add role')
  revalidateResources()
  return data
}

export async function updateRole(id: string, name: string, slug: string, description: string) {
  await checkAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('roles')
    .update({ name, slug, description, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error('Failed to update role')
  revalidateResources()
}

export async function deleteRole(id: string) {
  await checkAdmin()
  const supabase = await createClient()

  // Remove the role's attachment files from Storage before the cascade deletes the rows
  const { data: files } = await supabase
    .from('role_resource_files')
    .select('storage_path, role_resources!inner(role_id)')
    .eq('role_resources.role_id', id)
  if (files && files.length > 0) {
    await getAdminClient().storage.from(BUCKET).remove(files.map((f) => f.storage_path))
  }

  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw new Error('Failed to delete role')
  revalidateResources()
}

export async function reorderRoles(orderedIds: string[]) {
  await checkAdmin()
  const supabase = await createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('roles')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])
    if (error) throw new Error('Failed to reorder roles')
  }
  revalidateResources()
}

// --- Resources ---------------------------------------------------------------

export async function addResource(roleId: string) {
  await checkAdmin()
  const supabase = await createClient()
  const { data: maxRow } = await supabase
    .from('role_resources')
    .select('sort_order')
    .eq('role_id', roleId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (maxRow?.sort_order ?? 0) + 1
  const { data, error } = await supabase
    .from('role_resources')
    .insert({ role_id: roleId, title: 'New resource', body: '', is_published: false, sort_order: nextOrder })
    .select('id, title, body, is_published')
    .single()
  if (error || !data) throw new Error('Failed to add resource')
  revalidateResources()
  return data
}

export async function updateResource(id: string, title: string, body: string) {
  await checkAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('role_resources')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error('Failed to update resource')
  revalidateResources()
}

export async function togglePublished(id: string, isPublished: boolean) {
  await checkAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('role_resources')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error('Failed to update resource')
  revalidateResources()
}

export async function deleteResource(id: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { data: files } = await supabase
    .from('role_resource_files')
    .select('storage_path')
    .eq('resource_id', id)
  if (files && files.length > 0) {
    await getAdminClient().storage.from(BUCKET).remove(files.map((f) => f.storage_path))
  }

  const { error } = await supabase.from('role_resources').delete().eq('id', id)
  if (error) throw new Error('Failed to delete resource')
  revalidateResources()
}

export async function reorderResources(orderedIds: string[]) {
  await checkAdmin()
  const supabase = await createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('role_resources')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])
    if (error) throw new Error('Failed to reorder resources')
  }
  revalidateResources()
}

// --- Attachments ---------------------------------------------------------------

export async function uploadResourceFile(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const resourceId = formData.get('resource_id') as string
  const file = formData.get('file') as File | null

  if (!resourceId) throw new Error('Missing resource id')
  if (!file || file.size === 0) throw new Error('No file provided')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only PDF, Word and image files are accepted')
  if (file.size > MAX_BYTES) throw new Error('File must be under 5 MB')

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `role-resources/${resourceId}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = getAdminClient()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('[resources] Storage upload failed:', uploadError.message)
    throw new Error(`Storage: ${uploadError.message}`)
  }

  const { data: maxRow } = await supabase
    .from('role_resource_files')
    .select('sort_order')
    .eq('resource_id', resourceId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error: dbError } = await supabase
    .from('role_resource_files')
    .insert({
      resource_id: resourceId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size: file.size,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
    })
    .select('id, file_name, storage_path, size')
    .single()
  if (dbError || !data) {
    // Don't leave an orphan object behind if the row insert failed
    await admin.storage.from(BUCKET).remove([storagePath])
    console.error('[resources] DB insert failed:', dbError?.message)
    throw new Error('Failed to save the attachment')
  }

  revalidateResources()
  return data
}

export async function deleteResourceFile(id: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('role_resource_files')
    .select('storage_path')
    .eq('id', id)
    .single()
  if (row) {
    await getAdminClient().storage.from(BUCKET).remove([row.storage_path])
  }

  const { error } = await supabase.from('role_resource_files').delete().eq('id', id)
  if (error) throw new Error('Failed to delete attachment')
  revalidateResources()
}
