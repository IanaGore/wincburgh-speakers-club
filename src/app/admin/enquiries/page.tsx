import { createClient } from '@/utils/supabase/server'
import { markAsRead } from '../messages/actions'
import DeleteMessageButton from '../messages/DeleteMessageButton'
import { MarkAttendedButton, InviteButton } from '../signups/RSVPActions'

export const metadata = { title: 'Enquiries | Admin' }

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>
}) {
  const { tab = 'messages', status = 'pending' } = await searchParams
  const supabase = await createClient()

  const [{ data: messages }, { data: signups }] = await Promise.all([
    supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('signups')
      .select('*, meetings(meeting_date, theme)')
      .eq('status', status)
      .order('created_at', { ascending: false }),
  ])

  const unreadCount = messages?.filter(m => !m.is_read).length ?? 0

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px', color: 'var(--ink)' }}>
        Enquiries
      </h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, borderBottom: '1px solid var(--rule)', paddingBottom: 0 }}>
        <a
          href="?tab=messages"
          className={`wsc-btn wsc-btn-sm${tab === 'messages' ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}
        >
          Messages{unreadCount > 0 && (
            <span className="wsc-tag wsc-tag-clay" style={{ marginLeft: 8 }}>{unreadCount}</span>
          )}
        </a>
        <a
          href="?tab=rsvps"
          className={`wsc-btn wsc-btn-sm${tab === 'rsvps' ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}
        >
          RSVPs
        </a>
      </div>

      {/* Messages tab */}
      {tab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!messages?.length ? (
            <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
              No messages yet.
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="wsc-card" style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderColor: msg.is_read ? 'var(--rule)' : 'var(--clay)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--serif)', fontWeight: 500, margin: '0 0 0.2rem', color: 'var(--ink)' }}>{msg.name}</h3>
                    <a href={`mailto:${msg.email}`} style={{ color: 'var(--clay)', fontSize: '0.9rem' }}>{msg.email}</a>
                  </div>
                  <div style={{ color: 'var(--ink-4)', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {new Date(msg.created_at).toLocaleString()}
                    {!msg.is_read && <span className="wsc-tag wsc-tag-clay">New</span>}
                  </div>
                </div>
                <div style={{ background: 'var(--paper-2)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', color: 'var(--ink-2)', lineHeight: '1.5', border: '1px solid var(--rule-soft)' }}>
                  {msg.message}
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  {!msg.is_read && (
                    <form action={markAsRead}>
                      <input type="hidden" name="message_id" value={msg.id} />
                      <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Mark as Read</button>
                    </form>
                  )}
                  <DeleteMessageButton messageId={msg.id} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RSVPs tab */}
      {tab === 'rsvps' && (
        <div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['pending', 'attended', 'converted'].map(s => (
              <a key={s} href={`?tab=rsvps&status=${s}`}
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
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                      No {status} RSVPs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
