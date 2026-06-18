import { createClient } from '@/utils/supabase/server'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import Link from 'next/link'
import ComposeForm from './ComposeForm'

export const metadata = { title: 'Compose Communication | Admin' }

export default async function ComposePage() {
  const supabase = await createClient()
  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`

  const [{ data: profiles }, { data: signups }, { data: enquiries }, { data: media }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, contact_email')
      .eq('is_active', true)
      .not('contact_email', 'is', null)
      .order('full_name'),
    supabase
      .from('signups')
      .select('id, first_name, last_name, email')
      .not('email', 'is', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_messages')
      .select('id, name, email')
      .not('email', 'is', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('media')
      .select('key, storage_path, alt_text'),
  ])

  const members = (profiles ?? []).map(p => ({
    id: p.id as string,
    name: p.full_name as string,
    email: p.contact_email as string,
  }))

  const signupList = (signups ?? []).map(s => ({
    id: s.id as string,
    name: `${s.first_name as string} ${(s.last_name as string | null) ?? ''}`.trim(),
    email: s.email as string,
  }))

  const enquirerList = (enquiries ?? []).map(e => ({
    id: e.id as string,
    name: e.name as string,
    email: e.email as string,
  }))

  const mediaOptions = (media ?? []).map(m => ({
    key: m.key as string,
    url: `${bucketUrl}/${m.storage_path as string}`,
    label: (m.alt_text as string | null) || (m.key as string),
  }))

  return (
    <div>
      <EyebrowLabel>Admin · <Link href="/admin/communications">Communications</Link></EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px' }}>
        New Communication
      </h1>
      <ComposeForm
        members={members}
        signups={signupList}
        enquirers={enquirerList}
        mediaOptions={mediaOptions}
      />
    </div>
  )
}
