import { createClient } from '@/utils/supabase/server'
import Wordmark from '@/components/Wordmark'
import LoginForm from './LoginForm'
import { presidentQuote, getPresidentName, PRESIDENT_COLUMNS } from '@/lib/president'
import { requestMemberAccess } from './actions'
import './login.css'

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric' })
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(1)

  const nextMeeting = meetings?.[0]

  const { data: settings } = await supabase
    .from('site_settings')
    .select(`meeting_time, ${PRESIDENT_COLUMNS}`)
    .eq('id', 1)
    .single()

  const presidentName = await getPresidentName(supabase, settings ?? {})

  return (
    <div className="login-page">
      {/* Left: welcome panel */}
      <div className="login-left">
        <div className="login-left__content">
          <Wordmark tone="light" />

          <span className="login-left__eyebrow">Welcome back</span>
          <h2>Good to see you <em>again.</em></h2>
          <p className="login-left__sub">
            Sign in to volunteer for roles, track your pathway, and see what&apos;s coming up.
          </p>

          {nextMeeting && (
            <div className="login-meeting-card">
              <div className="login-meeting-card__badge">
                <div className="day">{formatDay(nextMeeting.meeting_date)}</div>
                <div className="month">{formatMonth(nextMeeting.meeting_date)}</div>
              </div>
              <div className="login-meeting-card__info">
                <div className="label">Next meeting</div>
                <div className="title">{nextMeeting.theme || "Members' Meeting"}</div>
                <div className="detail">{formatDate(nextMeeting.meeting_date)} · {settings?.meeting_time ?? '7:00pm'}</div>
              </div>
            </div>
          )}

          <div className="login-left__quote">
            <blockquote>
              {presidentQuote(settings ?? {})}
            </blockquote>
            <cite>— {presidentName}, Club President</cite>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="login-right">
        <p className="login-right__new-here">
          New here?{' '}
          <a href="/get-started?intent=ask">Get in touch</a>
        </p>
        <div className="login-right__body">
          <LoginForm error={params.error} />

          {params.registered === '1' ? (
            <div className="login-member-request login-member-request--confirm">
              <p><strong>Check your inbox — your invite link is on its way.</strong></p>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>We&apos;ve just emailed you a link to set up your account. It&apos;s valid for 7 days. Check your spam folder if you don&apos;t see it, or email <a href="mailto:hello@winchburghspeakersclub.uk">hello@winchburghspeakersclub.uk</a>.</p>
            </div>
          ) : params.registered === 'duplicate' ? (
            <div className="login-member-request login-member-request--confirm">
              <p>Looks like you already have an account — try logging in above or <a href="/forgot-password">reset your password</a>.</p>
            </div>
          ) : (
            <details className="login-member-request">
              <summary>Already a club member but not on the website yet?</summary>
              <form action={requestMemberAccess} className="login-member-request__form">
                <div>
                  <label className="wsc-label" htmlFor="mreg-fname">First name *</label>
                  <input id="mreg-fname" name="first_name" type="text" required className="wsc-input" placeholder="Your first name" />
                </div>
                <div>
                  <label className="wsc-label" htmlFor="mreg-lname">Last name <span style={{ color: 'var(--ink-4)' }}>(optional)</span></label>
                  <input id="mreg-lname" name="last_name" type="text" className="wsc-input" placeholder="Your last name" />
                </div>
                <div>
                  <label className="wsc-label" htmlFor="mreg-email">Email address *</label>
                  <input id="mreg-email" name="email" type="email" required className="wsc-input" placeholder="you@example.com" />
                </div>
                <button type="submit" className="wsc-btn wsc-btn-primary" style={{ width: '100%', marginTop: 4 }}>
                  Request access
                </button>
              </form>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
