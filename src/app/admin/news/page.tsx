import { createClient } from '@/utils/supabase/server'
import { createPost, deletePost } from './actions'

export default async function AdminNewsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('news_posts')
    .select('*')
    .order('published_at', { ascending: false })

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px', color: 'var(--ink)' }}>News &amp; Blog</h1>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Create Post Form */}
        <div className="wsc-card" style={{ flex: '1', minWidth: '300px', padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Write an Update</h2>
          <form action={createPost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="title" className="wsc-label">Title</label>
              <input type="text" id="title" name="title" required className="wsc-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="content" className="wsc-label">Content</label>
              <textarea id="content" name="content" required rows={8} className="wsc-input" style={{ resize: 'vertical' }} />
            </div>

            <button type="submit" className="wsc-btn wsc-btn-primary" style={{ marginTop: '0.5rem' }}>Publish Post</button>
          </form>
        </div>

        {/* List of Posts */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Published Posts</h2>

          {posts?.length === 0 ? (
            <div className="wsc-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
              No news posts published yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posts?.map(post => (
                <div key={post.id} className="wsc-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--serif)', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>
                      {post.title}
                    </h3>
                    <p style={{ color: 'var(--ink-4)', fontSize: '0.85rem', fontFamily: 'var(--mono)', margin: 0 }}>{new Date(post.published_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <form action={async () => {
                      'use server'
                      await deletePost(post.id)
                    }}>
                      <button className="wsc-btn wsc-btn-sm wsc-btn-ghost">
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
