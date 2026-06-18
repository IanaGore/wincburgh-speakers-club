import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'

export const metadata = { title: 'Communications | Admin' }

export default async function CommunicationsPage() {
  const supabase = await createClient()

  const { data: comms } = await supabase
    .from('communications')
    .select(`
      id, subject, sender_title, sent_at,
      communication_recipients(id),
      communication_replies(id)
    `)
    .order('sent_at', { ascending: false, nullsFirst: false })

  const rows = (comms ?? []).map(c => ({
    id: c.id as string,
    subject: c.subject as string,
    senderTitle: c.sender_title as string,
    sentAt: c.sent_at as string | null,
    recipientCount: (c.communication_recipients as { id: string }[]).length,
    replyCount: (c.communication_replies as { id: string }[]).length,
  }))

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: 0 }}>
          Communications
        </h1>
        <Link href="/admin/communications/compose" className="wsc-btn wsc-btn-primary wsc-btn-sm">
          Compose
        </Link>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--ink-3)' }}>No communications sent yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Subject</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>From</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Recipients</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Sent</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Replies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <Link href={`/admin/communications/${row.id}`} style={{ color: 'var(--clay)', fontWeight: 500 }}>
                    {row.subject}
                  </Link>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{row.senderTitle}</td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{row.recipientCount}</td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                  {row.sentAt
                    ? new Date(row.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>Draft</span>}
                </td>
                <td style={{ padding: '10px 12px', color: row.replyCount > 0 ? 'var(--clay)' : 'var(--ink-4)' }}>
                  {row.replyCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
