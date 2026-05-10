import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Wordmark from '@/components/Wordmark'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import JoinForm from './JoinForm'
import './join.css'

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token) notFound()

  const supabase = await createClient()
  const { data: signup } = await supabase
    .from('signups')
    .select('first_name, last_name, email, conversion_token_expires_at, conversion_token_used_at')
    .eq('conversion_token', token)
    .single()

  if (!signup || signup.conversion_token_used_at) notFound()
  if (signup.conversion_token_expires_at && new Date(signup.conversion_token_expires_at) < new Date()) notFound()

  return (
    <div className="join-page">
      <div className="join-topbar">
        <Wordmark />
      </div>
      <main className="join-main">
        <EyebrowLabel tone="clay">Welcome to the club</EyebrowLabel>
        <h1>Set up your account, <em style={{fontStyle:'italic',color:'oklch(0.55 0.155 60)'}}>{signup.first_name}</em>.</h1>
        <p style={{color:'var(--ink-2)',marginBottom:32}}>
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
