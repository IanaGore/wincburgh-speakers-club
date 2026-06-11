import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import './resources.css'

export default async function MemberResourcesPage() {
  const supabase = await createClient()

  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, slug, description')
    .order('sort_order')

  return (
    <main className="resources-main">
      <h1>Role resources</h1>
      <p className="resources-intro">
        Taking on a meeting role? Pick it below for guidance and templates to help you prepare.
      </p>

      {(roles ?? []).length === 0 ? (
        <p className="resources-empty">No roles have been set up yet — check back soon.</p>
      ) : (
        <div className="resources-grid">
          {(roles ?? []).map((role) => (
            <Link key={role.id} href={`/member/resources/${role.slug}`} className="resources-card">
              <h2>{role.name}</h2>
              <p>{role.description}</p>
              <span className="resources-card__cta">View resources →</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
