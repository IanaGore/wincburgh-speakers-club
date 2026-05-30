# News Article Images — Design Spec

**Issue:** #22 — Add images to news articles

## Goal

Allow admins to attach an image to a news post. Images appear as a banner on the public news list and as a hero on the detail page. Posts without images render normally with no placeholder.

## Approach

Reuse the existing `mediaKey` pattern. Each news post gets a mediaKey of `news_post_{id}`. No schema changes required — the existing `media` table, `site-media` Storage bucket, `uploadMediaPhoto` server action, and `PhotoSlot` component handle everything.

---

## Data & Storage

- MediaKey format: `news_post_{uuid}` (e.g. `news_post_abc123`)
- Stored in the `media` table under the `key` column, exactly like `homepage_hero` etc.
- `uploadMediaPhoto` upsert behaviour means replacing an image overwrites the same Storage path — no orphaned files
- File constraints (already enforced by `uploadMediaPhoto`): JPEG/PNG/WebP, max 5 MB

---

## Admin UI — `/admin/news`

Each published post card gains an inline image upload section below the title/date row:

- If no image exists: shows a compact upload form (file input + alt text input + "Upload Image" button)
- If an image exists: shows a thumbnail of the current image + "Replace Image" upload form
- The `key` field is pre-set to `news_post_{post.id}` and hidden from the user
- Reuses the `uploadMediaPhoto` server action — no new upload logic
- After upload, `revalidatePath('/admin/news')` and `revalidatePath('/news')` refresh both views

---

## Public News List — `/news`

Each post card conditionally renders a full-width image banner at the top of the card:

- Queries `media` table for `news_post_{post.id}` alongside each post (batch fetch — one query for all keys, not N+1)
- If an image exists: renders above the date/title/excerpt, full card width, fixed height (e.g. 220px), `object-fit: cover`
- If no image: card renders as today — no image area, no placeholder

---

## Public News Detail — `/news/[id]`

Below the article title and above the body content:

- If an image exists: full-width hero image, fixed height (e.g. 360px), `object-fit: cover`
- If no image: no image area rendered

Both list and detail pages use `PhotoSlot` with the post's mediaKey, or render nothing if no media row exists.

---

## Out of Scope

- Image cropping or resizing (admins are responsible for providing appropriately sized images)
- Per-post image editing beyond replace/upsert
- Avatar or per-person images (different problem, different approach)

---

## Acceptance Criteria

- [ ] Admin can upload an image to a news post from `/admin/news`
- [ ] Admin can replace an existing image for a news post
- [ ] Public news list shows uploaded images as card banners; posts without images show no image area
- [ ] Public news detail shows uploaded image as a hero; posts without images show no image area
- [ ] Upload validates file type (JPEG/PNG/WebP) and size (max 5 MB)
- [ ] No N+1 queries on the news list page
