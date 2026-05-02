import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function SingleNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: post } = await supabase
    .from('news_posts')
    .select('*, profiles(full_name)')
    .eq('id', id)
    .single()

  if (!post) return notFound()

  return (
    <div>
      <Navbar />

      <main style={{ padding: "4rem 5%", maxWidth: "800px", margin: "0 auto", flex: 1 }}>
        <Link href="/news" style={{ color: "var(--primary)", marginBottom: "2rem", display: "inline-block" }}>← Back to News</Link>
        
        <article style={{ marginTop: "2rem", background: "var(--card-bg)", padding: "3rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          <div style={{ color: "var(--primary)", fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
            {new Date(post.published_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <h1 style={{ fontSize: "3.5rem", marginBottom: "1rem", lineHeight: "1.2" }}>{post.title}</h1>
          <div style={{ fontSize: "1rem", color: "#64748b", marginBottom: "3rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            By {post.profiles?.full_name || 'Club Committee'}
          </div>
          
          <div style={{ fontSize: "1.15rem", lineHeight: "1.8", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
            {post.content}
          </div>
        </article>
      </main>
    </div>
  )
}
