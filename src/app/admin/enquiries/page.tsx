import { createClient } from '@/utils/supabase/server'
import DeleteMessageButton from '../messages/DeleteMessageButton'
import { MarkAttendedButton, InviteButton } from '../signups/RSVPActions'
import { updateMessageStatus, updateMessageNotes, updateSignupStatus, updateSignupNotes } from './actions'
import EnquiryMessageForm from './EnquiryMessageForm'

export const metadata = { title: 'Enquiries | Admin' }

type EnquiryMessage = {
  id: string
  direction: string
  body: string
  sent_at: string
}

const MESSAGE_STATUSES = ['new', 'replied', 'closed', 'spam'] as const
const SIGNUP_STATUSES = ['pending', 'contacted', 'attended', 'no_show', 'joined', 'converted'] as const

function statusTag(status: string) {
  const colours: Record<string, string> = {
    new: 'wsc-tag-clay',
    replied: 'wsc-tag-gold',
    closed: 'wsc-tag-sage',
    spam: '',
    pending: 'wsc-tag-gold',
    contacted: 'wsc-tag-gold',
    attended: 'wsc-tag-sage',
    no_show: '',
    joined: 'wsc-tag-sage',
    converted: 'wsc-tag-clay',
  }
  return `wsc-tag ${colours[status] ?? ''}`
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; mstatus?: string }>
}) {
  const { tab = 'messages', status = 'pending', mstatus = 'new' } = await searchParams
  const supabase = await createClient()

  const [{ data: messages }, { data: signups }, { data: allMessages }] = await Promise.all([
    supabase
      .from('contact_messages')
      .select('*, enquiry_messages(id, direction, body, sent_at)')
      .eq('status', mstatus)
      .order('created_at', { ascending: false }),
    supabase
      .from('signups')
      .select('*, source, meetings(meeting_date, theme)')
      .eq('status', status)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_messages')
      .select('status'),
  ])

  const newCount = allMessages?.filter((m: { status: string }) => m.status === 'new').length ?? 0

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
          Messages{newCount > 0 && (
            <span className="wsc-tag wsc-tag-clay" style={{ marginLeft: 8 }}>{newCount}</span>
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
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {MESSAGE_STATUSES.map(s => (
              <a key={s} href={`?tab=messages&mstatus=${s}`}
                className={`wsc-btn wsc-btn-sm${mstatus === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!messages?.length ? (
              <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
                No {mstatus} messages.
              </div>
            ) : (
              messages.map((msg: Record<string, string>) => (
                <div key={msg.id} className="wsc-card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderColor: msg.status === 'new' ? 'var(--clay)' : 'var(--rule)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--serif)', fontWeight: 500, margin: '0 0 0.2rem', color: 'var(--ink)' }}>{msg.name}</h3>
                      <a href={`mailto:${msg.email}`} style={{ color: 'var(--clay)', fontSize: '0.9rem' }}>{msg.email}</a>
                      {msg.phone && <span style={{ marginLeft: 12, color: 'var(--ink-3)', fontSize: '0.85rem' }}>{msg.phone}</span>}
                      {msg.topic && <span style={{ marginLeft: 12, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>Topic: {msg.topic}</span>}
                    </div>
                    <div style={{ color: 'var(--ink-4)', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {new Date(msg.created_at).toLocaleString()}
                      <span className={statusTag(msg.status)}>{msg.status}</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--paper-2)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', color: 'var(--ink-2)', lineHeight: '1.5', border: '1px solid var(--rule-soft)' }}>
                    {msg.message}
                  </div>

                  <form action={updateMessageStatus} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="hidden" name="message_id" value={msg.id} />
                    <label className="wsc-label" style={{ margin: 0 }}>Status:</label>
                    <select name="status" defaultValue={msg.status} className="wsc-input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: 13 }}>
                      {MESSAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Update</button>
                    <DeleteMessageButton messageId={msg.id} />
                  </form>

                  <form action={updateMessageNotes} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input type="hidden" name="message_id" value={msg.id} />
                    <label className="wsc-label" htmlFor={`notes-${msg.id}`}>Admin notes</label>
                    <textarea id={`notes-${msg.id}`} name="notes" className="wsc-input" rows={2} defaultValue={msg.admin_notes ?? ''} placeholder="Internal notes…" />
                    <div><button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Save notes</button></div>
                  </form>
                  <EnquiryMessageForm
                    enquiryId={msg.id}
                    messages={(
                      ((msg.enquiry_messages as unknown as EnquiryMessage[]) ?? [])
                        .slice()
                        .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
                    )}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RSVPs tab */}
      {tab === 'rsvps' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {SIGNUP_STATUSES.map(s => (
              <a key={s} href={`?tab=rsvps&status=${s}`}
                className={`wsc-btn wsc-btn-sm${status === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}>
                {s.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {signups?.map((s: Record<string, string | Record<string, string> | null>) => (
              <div key={s.id as string} className="wsc-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{s.first_name as string} {s.last_name as string}</strong>
                    <span style={{ marginLeft: 12, color: 'var(--ink-2)', fontSize: 14 }}>{s.email as string}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: 13 }}>
                    {s.meetings && (
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 12 }}>
                        {new Date((s.meetings as Record<string, string>).meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {s.heard_from && <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>via {s.heard_from as string}</span>}
                    {(s.source as string) === 'existing_member' && (
                      <span className="wsc-tag wsc-tag-sage">Existing member</span>
                    )}
                    {(s.source as string) === 'admin_invite' && (
                      <span className="wsc-tag wsc-tag-sage">Admin invite</span>
                    )}
                    <span className={statusTag(s.status as string)}>{(s.status as string).replace('_', ' ')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <form action={updateSignupStatus} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="hidden" name="signup_id" value={s.id as string} />
                    <label className="wsc-label" style={{ margin: 0, fontSize: 13 }}>Status:</label>
                    <select name="status" defaultValue={s.status as string} className="wsc-input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: 13 }}>
                      {SIGNUP_STATUSES.map(st => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                    </select>
                    <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Update</button>
                  </form>
                  {(s.status as string) === 'pending' && (s.source as string) !== 'admin_invite' && (
                    <MarkAttendedButton signupId={s.id as string} />
                  )}
                  {((s.status as string) === 'attended' ||
                    ((s.status as string) === 'pending' && (s.source as string) === 'admin_invite')) && (
                    <InviteButton signupId={s.id as string} />
                  )}
                </div>

                <form action={updateSignupNotes} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input type="hidden" name="signup_id" value={s.id as string} />
                  <label className="wsc-label" htmlFor={`signup-notes-${s.id as string}`} style={{ fontSize: 13 }}>Admin notes</label>
                  <textarea id={`signup-notes-${s.id as string}`} name="notes" className="wsc-input" rows={2} defaultValue={(s.admin_notes as string) ?? ''} placeholder="Internal notes…" />
                  <div><button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Save notes</button></div>
                </form>
              </div>
            ))}
            {(!signups || signups.length === 0) && (
              <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-4)', borderStyle: 'dashed' }}>
                No {status.replace('_', ' ')} RSVPs
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
