import { createClient } from '@/utils/supabase/server'
import { createPost, deletePost } from './actions'
import NewsImageUploader from './NewsImageUploader'

export default async function AdminNewsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('news_posts')
    .select('id, title, published_at')
    .order('published_at', { ascending: false })

  // Batch-fetch media rows for all post images
  const mediaKeys = (posts ?? []).map(p => `news_post_${p.id}`)
  const { data: mediaRows } = mediaKeys.length > 0
    ? await supabase.from('media').select('key, storage_path, alt_text').in('key', mediaKeys)
    : { data: [] }

  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`
  const mediaByKey: Record<string, { key: string; storage_path: string; alt_text: string | null }> = Object.fromEntries((mediaRows ?? []).map(r => [r.key, r]))

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="image" className="wsc-label">Image (optional)</label>
              <input type="file" id="image" name="image" accept="image/jpeg,image/png,image/webp" className="wsc-input" />
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-4)', margin: 0 }}>
                JPEG, PNG or WebP · max 5 MB · recommended size 1200 × 480 px (landscape 2.5:1)
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="image_alt" className="wsc-label">Image alt text</label>
              <input type="text" id="image_alt" name="image_alt" className="wsc-input" placeholder="Describe the image" />
            </div>

            <button type="submit" className="wsc-btn wsc-btn-primary" style={{ marginTop: '0.5rem' }}>Publish Post</button>
          </form>
        </div>

        {/* List of Posts */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Published Posts</h2>

          {(!posts || posts.length === 0) ? (
            <div className="wsc-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
              No news posts published yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posts?.map(post => {
                const mediaKey = `news_post_${post.id}`
                const row = mediaByKey[mediaKey]
                const existingImageUrl = row ? `${bucketUrl}/${row.storage_path}` : null

                return (
                  <div key={post.id} className="wsc-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--serif)', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>
                          {post.title}
                        </h3>
                        <p style={{ color: 'var(--ink-4)', fontSize: '0.85rem', fontFamily: 'var(--mono)', margin: 0 }}>
                          {new Date(post.published_at).toLocaleDateString()}
                        </p>
                      </div>
                      <form action={deletePost.bind(null, post.id)}>
                        <button className="wsc-btn wsc-btn-sm wsc-btn-ghost">Delete</button>
                      </form>
                    </div>
                    <NewsImageUploader
                      postId={post.id}
                      existingImageUrl={existingImageUrl}
                      existingAltText={row?.alt_text ?? null}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
