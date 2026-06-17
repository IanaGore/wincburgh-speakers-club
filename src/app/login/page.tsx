import { createClient } from '@/utils/supabase/server'
import Wordmark from '@/components/Wordmark'
import LoginForm from './LoginForm'
import { presidentQuote, getPresidentName, PRESIDENT_COLUMNS } from '@/lib/president'
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
  searchParams: Promise<{ error?: string }>
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
        </div>
      </div>
    </div>
  )
}
