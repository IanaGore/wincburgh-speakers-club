import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function SingleNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const [{ data: post }, { data: mediaRow }] = await Promise.all([
    supabase
      .from('news_posts')
      .select('id, title, content, published_at, profiles(full_name)')
      .eq('id', id)
      .single(),
    supabase
      .from('media')
      .select('storage_path, alt_text')
      .eq('key', `news_post_${id}`)
      .maybeSingle(),
  ])

  if (!post) return notFound()

  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`
  const imageUrl = mediaRow ? `${bucketUrl}/${mediaRow.storage_path}` : null

  return (
    <div>
      <Navbar />

      <main style={{ padding: "4rem 5%", maxWidth: "800px", margin: "0 auto", flex: 1 }}>
        <Link href="/news" style={{ color: "var(--primary)", marginBottom: "2rem", display: "inline-block" }}>← Back to News</Link>

        <article style={{ marginTop: "2rem", background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)", overflow: "hidden" }}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={mediaRow?.alt_text ?? post.title}
              style={{ width: "100%", height: "360px", objectFit: "cover", display: "block" }}
            />
          )}
          <div style={{ padding: "3rem" }}>
            <div style={{ color: "var(--primary)", fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
              {new Date(post.published_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <h1 style={{ fontSize: "3.5rem", marginBottom: "1rem", lineHeight: "1.2" }}>{post.title}</h1>
            <div style={{ fontSize: "1rem", color: "var(--muted, #64748b)", marginBottom: "3rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              By {(post.profiles as any)?.full_name || 'Club Committee'}
            </div>

            <div style={{ fontSize: "1.15rem", lineHeight: "1.8", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
              {post.content}
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
