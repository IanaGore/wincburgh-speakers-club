import { createClient } from '@/utils/supabase/server'
import Wordmark from '@/components/Wordmark'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import JoinForm from './JoinForm'
import './join.css'

function ExpiredPage() {
  return (
    <div className="join-page">
      <div className="join-topbar">
        <Wordmark />
      </div>
      <main className="join-main">
        <EyebrowLabel tone="clay">Invite link expired</EyebrowLabel>
        <h1>This link is no longer valid.</h1>
        <p className="join-main__intro">
          Invite links expire after 7 days, or stop working once you&apos;ve already used them to create an account.
        </p>
        <p className="join-main__intro">
          If you still need access, email us at{' '}
          <a href="mailto:hello@winchburghspeakersclub.uk" style={{ color: 'var(--clay)' }}>
            hello@winchburghspeakersclub.uk
          </a>{' '}
          and we&apos;ll send you a fresh link.
        </p>
      </main>
    </div>
  )
}

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token) return <ExpiredPage />

  const supabase = await createClient()
  const { data: signup } = await supabase
    .from('signups')
    .select('first_name, last_name, email, conversion_token_expires_at, conversion_token_used_at')
    .eq('conversion_token', token)
    .single()

  if (!signup || signup.conversion_token_used_at) return <ExpiredPage />
  if (signup.conversion_token_expires_at && new Date(signup.conversion_token_expires_at) < new Date()) return <ExpiredPage />

  return (
    <div className="join-page">
      <div className="join-topbar">
        <Wordmark />
      </div>
      <main className="join-main">
        <EyebrowLabel tone="clay">Welcome to the club</EyebrowLabel>
        <h1>Set up your account, <em className="join-main__name-em">{signup.first_name}</em>.</h1>
        <p className="join-main__intro">
          Your details are already filled in from when you signed up. Just choose a password and you&apos;re in.
        </p>
        <JoinForm
          token={token}
          firstName={signup.first_name}
          lastName={signup.last_name ?? ''}
          email={signup.email}
        />
      </main>
    </div>
  )
}
