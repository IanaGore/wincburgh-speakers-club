import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Wordmark from '@/components/Wordmark'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import AvatarUploadForm from './AvatarUploadForm'
import '../onboarding.css'

export default async function OnboardingPhotoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) redirect('/onboarding')

  return (
    <div className="join-page">
      <div className="join-topbar">
        <Wordmark />
      </div>
      <main className="join-main">
        <EyebrowLabel tone="clay">Almost there</EyebrowLabel>
        <h1>Add a profile photo.</h1>
        <p className="join-main__intro">
          Help your fellow members put a face to the name. You can always update this later from your profile.
        </p>
        <AvatarUploadForm />
        <Link href="/member/dashboard" className="onboarding-skip">
          I&apos;ll do this later →
        </Link>
      </main>
    </div>
  )
}
