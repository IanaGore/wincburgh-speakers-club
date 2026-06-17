import { completeOnboarding } from './actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Wordmark from '@/components/Wordmark'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import '../join/join.css'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="join-page">
      <div className="join-topbar">
        <Wordmark />
      </div>
      <main className="join-main">
        <EyebrowLabel tone="clay">One last step</EyebrowLabel>
        <h1>Tell us your name.</h1>
        <p className="join-main__intro">
          We need your name to set up your member profile. This is how you&apos;ll appear to other members.
        </p>
        <form action={completeOnboarding} className="join-form">
          <div className="join-form__prefilled">
            <label className="wsc-label" htmlFor="full_name">Full name</label>
          </div>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="wsc-input"
            placeholder="Your full name"
            autoComplete="name"
          />
          <button type="submit" className="wsc-btn wsc-btn-primary" style={{ width: '100%', marginTop: 8 }}>
            Save and continue
          </button>
        </form>
      </main>
    </div>
  )
}
