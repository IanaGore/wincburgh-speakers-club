import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import PrintButton from './PrintButton'
import '../resources.css'

const BUCKET_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`

export default async function RoleResourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: role } = await supabase
    .from('roles')
    .select('id, name, description')
    .eq('slug', slug)
    .single()
  if (!role) notFound()

  const { data: resources } = await supabase
    .from('role_resources')
    .select('id, title, body, role_resource_files (id, file_name, storage_path, mime_type, sort_order)')
    .eq('role_id', role.id)
    .eq('is_published', true)
    .order('sort_order')

  return (
    <main className="resources-main">
      <div className="resources-role-header no-print">
        <Link href="/member/resources" className="resources-back">← All roles</Link>
        <PrintButton />
      </div>

      <div id="resource-sheet" className="resources-sheet">
        <h1>{role.name}</h1>
        <p className="resources-intro">{role.description}</p>

        {(resources ?? []).length === 0 ? (
          <p className="resources-empty">No resources for this role yet — check back soon.</p>
        ) : (
          (resources ?? []).map((resource) => (
            <article key={resource.id} className="resources-resource">
              <h2>{resource.title}</h2>
              <div className="resources-body">{resource.body}</div>
              {(resource.role_resource_files ?? []).length > 0 && (
                <ul className="resources-files no-print">
                  {(resource.role_resource_files ?? [])
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((f) => (
                      <li key={f.id}>
                        <a href={`${BUCKET_URL}/${f.storage_path}`} target="_blank" rel="noopener noreferrer">
                          📎 {f.file_name}
                        </a>
                      </li>
                    ))}
                </ul>
              )}
            </article>
          ))
        )}
      </div>
    </main>
  )
}
