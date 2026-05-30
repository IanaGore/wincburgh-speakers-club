# News Article Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to attach images to news posts; display them as banners on the news list and as heroes on the detail page.

**Architecture:** Each news post gets a mediaKey `news_post_{id}`. The existing `uploadMediaPhoto` server action, `media` table, and `site-media` Storage bucket handle upload/storage — no schema changes. A new `NewsImageUploader` client component handles the per-post upload widget on the admin page. Public pages batch-fetch media rows to avoid N+1 queries, then render images conditionally — no image area at all when absent.

**Tech Stack:** Next.js 16 App Router, Supabase, existing `uploadMediaPhoto` server action, existing `PhotoSlot` component pattern

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/app/admin/news/NewsImageUploader.tsx` |
| Modify | `src/app/admin/news/page.tsx` |
| Modify | `src/app/news/page.tsx` |
| Modify | `src/app/news/[id]/page.tsx` |

---

### Task 1: NewsImageUploader client component

**Files:**
- Create: `src/app/admin/news/NewsImageUploader.tsx`

This is a self-contained client component that handles uploading/replacing an image for a single news post. It follows the same pattern as `src/app/admin/media/MediaUploader.tsx` but for one slot only.

- [ ] **Step 1: Create `src/app/admin/news/NewsImageUploader.tsx`**

```tsx
'use client'
import { useRef, useState } from 'react'
import { uploadMediaPhoto } from '../media/actions'

interface Props {
  postId: string
  existingImageUrl: string | null
  existingAltText: string | null
}

export default function NewsImageUploader({ postId, existingImageUrl, existingAltText }: Props) {
  const mediaKey = `news_post_${postId}`
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    setUploading(true)
    setError('')
    setSuccess(false)
    try {
      const fd = new FormData(formRef.current)
      await uploadMediaPhoto(fd)
      setSuccess(true)
      const file = fd.get('file') as File | null
      if (file && file.size > 0) setPreviewUrl(URL.createObjectURL(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      {previewUrl && (
        <img
          src={previewUrl}
          alt={existingAltText ?? 'News image'}
          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.75rem' }}
        />
      )}
      <form ref={formRef} onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input type="hidden" name="key" value={mediaKey} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label className="wsc-label" htmlFor={`alt-${postId}`}>Alt text</label>
          <input
            id={`alt-${postId}`}
            name="alt_text"
            type="text"
            defaultValue={existingAltText ?? ''}
            className="wsc-input"
            placeholder="Describe the image"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label className="wsc-label" htmlFor={`file-${postId}`}>
            {previewUrl ? 'Replace image' : 'Add image'} (JPEG / PNG / WebP, max 5 MB)
          </label>
          <input
            id={`file-${postId}`}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="wsc-input"
            required
          />
        </div>
        <button
          type="submit"
          className="wsc-btn wsc-btn-sm wsc-btn-primary"
          disabled={uploading}
          style={{ alignSelf: 'flex-start' }}
        >
          {uploading ? 'Uploading…' : previewUrl ? 'Replace Image' : 'Upload Image'}
        </button>
        {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        {success && <p style={{ color: 'var(--success, green)', fontSize: '0.85rem', margin: 0 }}>Uploaded ✓</p>}
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/news/NewsImageUploader.tsx
git commit -m "feat: add NewsImageUploader client component for per-post image uploads"
```

---

### Task 2: Wire upload widget into admin news page

**Files:**
- Modify: `src/app/admin/news/page.tsx`

The admin news page needs to:
1. Batch-fetch existing `media` rows for all post IDs after loading posts
2. Pass each post's existing image data to `NewsImageUploader`

- [ ] **Step 1: Replace `src/app/admin/news/page.tsx` with the updated version**

```tsx
import { createClient } from '@/utils/supabase/server'
import { createPost, deletePost } from './actions'
import NewsImageUploader from './NewsImageUploader'

export default async function AdminNewsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('news_posts')
    .select('*')
    .order('published_at', { ascending: false })

  // Batch-fetch media rows for all post images
  const mediaKeys = (posts ?? []).map(p => `news_post_${p.id}`)
  const { data: mediaRows } = mediaKeys.length > 0
    ? await supabase.from('media').select('key, storage_path, alt_text').in('key', mediaKeys)
    : { data: [] }

  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`
  const mediaByKey = Object.fromEntries((mediaRows ?? []).map(r => [r.key, r]))

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
                      <form action={async () => {
                        'use server'
                        await deletePost(post.id)
                      }}>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Start dev server and manually verify admin news page**

```bash
npm run dev
```

Open http://localhost:3000/admin/news. Verify:
- Each post card shows a "Add image" upload widget below its title/date
- Uploading a JPEG/PNG/WebP shows the thumbnail and changes button to "Replace Image"
- Uploading an invalid file type shows an error message
- Uploading a file > 5 MB shows an error message

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/news/page.tsx
git commit -m "feat: wire NewsImageUploader into admin news page"
```

---

### Task 3: Public news list — conditional image banners

**Files:**
- Modify: `src/app/news/page.tsx`

Batch-fetch media for all post IDs, render a full-width banner image at the top of each card if present — nothing if absent.

- [ ] **Step 1: Replace `src/app/news/page.tsx` with the updated version**

```tsx
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

  // Batch-fetch media rows — one query, no N+1
  const mediaKeys = (posts ?? []).map(p => `news_post_${p.id}`)
  const { data: mediaRows } = mediaKeys.length > 0
    ? await supabase.from('media').select('key, storage_path, alt_text').in('key', mediaKeys)
    : { data: [] }

  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`
  const mediaByKey = Object.fromEntries((mediaRows ?? []).map(r => [r.key, r]))

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Manually verify news list page**

Open http://localhost:3000/news. Verify:
- Posts with an uploaded image show a full-width banner at the top of the card
- Posts without an image show the card with no image area (date/title/excerpt start at the top)
- Card content (padding, text) is unaffected for imageless posts

- [ ] **Step 4: Commit**

```bash
git add src/app/news/page.tsx
git commit -m "feat: show image banners on news list cards"
```

---

### Task 4: Public news detail — conditional hero image

**Files:**
- Modify: `src/app/news/[id]/page.tsx`

Fetch the media row for this specific post. Render a full-width hero image between the title and body content if present — nothing if absent.

- [ ] **Step 1: Replace `src/app/news/[id]/page.tsx` with the updated version**

```tsx
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
      .select('*, profiles(full_name)')
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
            <div style={{ fontSize: "1rem", color: "#64748b", marginBottom: "3rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              By {post.profiles?.full_name || 'Club Committee'}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Manually verify news detail page**

Open a news post that has an image (uploaded in Task 2). Verify:
- Hero image renders full-width at 360px height above the date/title
- Open a news post without an image. Verify the article starts with the date/title — no image area

- [ ] **Step 4: Commit**

```bash
git add "src/app/news/[id]/page.tsx"
git commit -m "feat: show hero image on news detail page"
```

---

### Task 5: Update GitHub issue and push PR

**Files:** GitHub (no code changes)

- [ ] **Step 1: Push branch and open PR**

```bash
git push origin main
```

- [ ] **Step 2: Update GitHub issue #22**

```bash
gh issue comment 22 --repo IanaGore/wincburgh-speakers-club --body "Implementation complete. All four tasks shipped:
- \`NewsImageUploader\` client component for per-post uploads
- Admin news page wired with inline upload/replace widget per post
- Public news list shows full-width image banners (220px) where images exist
- Public news detail shows full-width hero image (360px) where images exists

Closes #22"

gh issue edit 22 --repo IanaGore/wincburgh-speakers-club --add-label "ready"
```
