import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default async function NewsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('news_posts')
    .select('*, profiles(full_name)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  return (
    <div>
      <Navbar />

      <main style={{ padding: "4rem 5%", maxWidth: "800px", margin: "0 auto", flex: 1 }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "3rem", textAlign: "center" }}>Club News</h1>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {posts?.map((post: any) => (
            <article key={post.id} style={{ background: "var(--card-bg)", padding: "2.5rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
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
            </article>
          ))}

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
