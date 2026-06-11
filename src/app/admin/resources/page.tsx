import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import RolesManager from './RolesManager'

export default async function AdminResourcesPage() {
  const supabase = await createClient()

  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, slug, description, role_resources (id)')
    .order('sort_order')

  const rolesWithCounts = (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    resourceCount: (r.role_resources ?? []).length,
  }))

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 28, color: 'var(--ink)', marginBottom: '0.5rem' }}>
        Role Resources
      </h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: '2rem' }}>
        Maintain the roles catalog. Open a role to manage its resources and attachments —
        members see them at <Link href="/member/resources" style={{ textDecoration: 'underline' }}>/member/resources</Link>.
      </p>
      <RolesManager initialRoles={rolesWithCounts} />
    </div>
  )
}
