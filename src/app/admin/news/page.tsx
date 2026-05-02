import { createClient } from '@/utils/supabase/server'
import { createPost, deletePost } from './actions'
import Link from 'next/link'

export default async function AdminNewsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('news_posts')
    .select('*')
    .order('published_at', { ascending: false })

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Admin: News & Blog</h1>
      </div>
      
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        {/* Create Post Form */}
        <div style={{ flex: "1", minWidth: "300px", background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)", height: "fit-content" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Write an Update</h2>
          <form action={createPost} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="title" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Title</label>
              <input type="text" id="title" name="title" required style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="content" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Content</label>
              <textarea id="content" name="content" required rows={8} style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", resize: "vertical" }} />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>Publish Post</button>
          </form>
        </div>

        {/* List of Posts */}
        <div style={{ flex: "2", minWidth: "400px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Published Posts</h2>
          
          {posts?.length === 0 ? (
            <div style={{ padding: "2rem", border: "1px dashed var(--card-border)", borderRadius: "12px", textAlign: "center", color: "#94a3b8" }}>
              No news posts published yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {posts?.map(post => (
                <div key={post.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)", padding: "1.5rem", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "white", marginBottom: "0.25rem" }}>
                      {post.title}
                    </h3>
                    <p style={{ color: "#64748b", fontSize: "0.85rem" }}>{new Date(post.published_at).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <form action={async () => {
                      'use server'
                      await deletePost(post.id)
                    }}>
                      <button className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#f87171" }}>
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
