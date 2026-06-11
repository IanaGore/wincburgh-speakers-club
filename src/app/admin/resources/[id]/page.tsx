import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ResourceManager from './ResourceManager'

export default async function AdminRoleResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: role } = await supabase
    .from('roles')
    .select('id, name, slug')
    .eq('id', id)
    .single()
  if (!role) notFound()

  const { data: resources } = await supabase
    .from('role_resources')
    .select('id, title, body, is_published, sort_order, role_resource_files (id, file_name, storage_path, size, sort_order)')
    .eq('role_id', id)
    .order('sort_order')

  const initialResources = (resources ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    is_published: r.is_published,
    files: (r.role_resource_files ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => ({ id: f.id, file_name: f.file_name, storage_path: f.storage_path, size: f.size })),
  }))

  return (
    <div style={{ maxWidth: 760 }}>
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/admin/resources" style={{ color: 'var(--clay)', fontWeight: 600, fontSize: 14 }}>
          ← All roles
        </Link>
      </p>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 28, color: 'var(--ink)', marginBottom: '0.5rem' }}>
        {role.name} — Resources
      </h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: '2rem' }}>
        Only published resources are visible to members. Attachments: PDF, Word or images, up to 5&nbsp;MB.
      </p>
      <ResourceManager roleId={role.id} initialResources={initialResources} />
    </div>
  )
}
