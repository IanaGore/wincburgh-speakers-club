import { createClient } from '@/utils/supabase/server'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import { MarkAttendedButton, InviteButton } from './RSVPActions'

export default async function SignupsAdminPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'pending' } = await searchParams
  const supabase = await createClient()

  const { data: signups } = await supabase
    .from('signups')
    .select('*, meetings(meeting_date, theme)')
    .eq('status', status)
    .order('created_at', { ascending: false })

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px' }}>RSVPs</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['pending', 'attended', 'converted'].map(s => (
          <a key={s} href={`?status=${s}`}
            className={`wsc-btn wsc-btn-sm${status === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)' }}>
              {['Name', 'Email', 'Meeting', 'Heard from', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signups?.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '12px', color: 'var(--ink)', fontWeight: 500 }}>{s.first_name} {s.last_name}</td>
                <td style={{ padding: '12px', color: 'var(--ink-2)' }}>{s.email}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                  {s.meetings ? new Date(s.meetings.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                </td>
                <td style={{ padding: '12px', color: 'var(--ink-3)', fontSize: 13 }}>{s.heard_from || '—'}</td>
                <td style={{ padding: '12px' }}>
                  <span className={`wsc-tag${s.status === 'attended' ? ' wsc-tag-sage' : s.status === 'converted' ? ' wsc-tag-clay' : ' wsc-tag-gold'}`}>
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {s.status === 'pending' && <MarkAttendedButton signupId={s.id} />}
                    {s.status === 'attended' && <InviteButton signupId={s.id} />}
                  </div>
                </td>
              </tr>
            ))}
            {(!signups || signups.length === 0) && (
              <tr><td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 13 }}>No {status} RSVPs</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
