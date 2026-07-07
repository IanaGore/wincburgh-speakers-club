import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import PrintButton from './PrintButton'
import '../resources.css'

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
    .select('id, title, body, role_resource_files (id, file_name, storage_path, mime_type, size, sort_order)')
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
                <div className="resources-attachments no-print">
                  <h3>Attachments</h3>
                  <ul className="resources-files">
                    {(resource.role_resource_files ?? [])
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((f) => (
                        <li key={f.id}>
                          <a
                            href={supabase.storage.from('site-media').getPublicUrl(f.storage_path).data.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📎 {f.file_name}
                          </a>
                          {f.size ? <span>{Math.max(1, Math.round(f.size / 1024))} KB</span> : null}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </main>
  )
}
