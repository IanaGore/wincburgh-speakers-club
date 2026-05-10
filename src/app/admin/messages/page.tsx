import { createClient } from '@/utils/supabase/server'
import { markAsRead } from './actions'
import DeleteMessageButton from './DeleteMessageButton'

export default async function AdminMessagesPage() {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px', color: 'var(--ink)' }}>Contact Messages</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages?.length === 0 ? (
          <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
            No messages yet.
          </div>
        ) : (
          messages?.map(msg => (
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
    </div>
  )
}
