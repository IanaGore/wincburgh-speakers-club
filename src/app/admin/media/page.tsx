import { createClient as createAdminClient } from '@supabase/supabase-js'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import MediaUploader from './MediaUploader'
import './media.css'

export const metadata = { title: 'Media | Admin' }

export default async function AdminMediaPage() {
  // Service role bypasses RLS — safe because media table contains only public image metadata
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: existing } = await admin.from('media').select('key, storage_path, alt_text')

  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 8px' }}>
        Media
      </h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: 0 }}>
        Upload photos for public-facing pages. Changes take effect immediately.
      </p>
      <MediaUploader existing={existing ?? []} bucketUrl={bucketUrl} />
    </div>
  )
}
