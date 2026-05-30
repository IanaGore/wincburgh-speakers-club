import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default async function NewsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('news_posts')
    .select('id, title, content, published_at, profiles(full_name)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  // Batch-fetch media rows — one query, no N+1
  const mediaKeys = (posts ?? []).map(p => `news_post_${p.id}`)
  const { data: mediaRows } = mediaKeys.length > 0
    ? await supabase.from('media').select('key, storage_path, alt_text').in('key', mediaKeys)
    : { data: [] }

  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`
  const mediaByKey: Record<string, { key: string; storage_path: string; alt_text: string | null }> = Object.fromEntries(
    (mediaRows ?? []).map(r => [r.key, r])
  )

  return (
    <div>
      <Navbar />

      <main style={{ padding: "4rem 5%", maxWidth: "800px", margin: "0 auto", flex: 1 }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "3rem", textAlign: "center" }}>Club News</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {posts?.map((post: any) => {
            const row = mediaByKey[`news_post_${post.id}`]
            const imageUrl = row ? `${bucketUrl}/${row.storage_path}` : null

            return (
              <article key={post.id} style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)", overflow: "hidden" }}>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={row?.alt_text ?? post.title}
                    style={{ width: "100%", height: "220px", objectFit: "cover", display: "block" }}
                  />
                )}
                <div style={{ padding: "2.5rem" }}>
                  <div style={{ color: "var(--primary)", fontSize: "0.9rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                    {new Date(post.published_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                    <Link href={`/news/${post.id}`}>{post.title}</Link>
                  </h2>
                  <p style={{ color: "#94a3b8", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                    {post.content.substring(0, 200)}...
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.9rem", color: "#64748b" }}>By {post.profiles?.full_name || 'Club Committee'}</span>
                    <Link href={`/news/${post.id}`} style={{ color: "var(--primary)", fontWeight: "600" }}>Read More →</Link>
                  </div>
                </div>
              </article>
            )
          })}

          {(!posts || posts.length === 0) && (
            <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed var(--card-border)", borderRadius: "16px" }}>
              <p style={{ color: "#94a3b8" }}>No news posts available yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
