import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'

export const metadata = { title: 'Communication | Admin' }

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: comm, error: commError }, { data: recipients }, { data: replies }] = await Promise.all([
    supabase
      .from('communications')
      .select('id, subject, body, sender_title, sent_at, status, attachment_urls')
      .eq('id', id)
      .single(),
    supabase
      .from('communication_recipients')
      .select('id, name, email, recipient_type')
      .eq('communication_id', id)
      .order('name'),
    supabase
      .from('communication_replies')
      .select('id, from_name, from_email, body, received_at')
      .eq('communication_id', id)
      .order('received_at', { ascending: true }),
  ])

  if (commError || !comm) notFound()

  const attachmentUrls: string[] = (comm.attachment_urls as string[]) ?? []
  const recipientList = recipients ?? []
  const replyList = replies ?? []

  return (
    <div style={{ maxWidth: 760 }}>
      <EyebrowLabel>Admin · <Link href="/admin/communications">Communications</Link></EyebrowLabel>

      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 28, margin: '8px 0 4px' }}>
        {comm.subject as string}
      </h1>

      <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 24px' }}>
        From: <strong>{comm.sender_title as string} · Winchburgh Speakers Club</strong>
        {comm.sent_at && (
          <> · {new Date(comm.sent_at as string).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
        )}
      </p>

      {/* Body */}
      <div style={{ background: 'var(--paper-2)', border: '1px solid var(--rule-soft)', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>
          {comm.body as string}
        </p>
      </div>

      {/* Attachments */}
      {attachmentUrls.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>Attachments</h2>
          <ul style={{ fontSize: 13, paddingLeft: 16, color: 'var(--clay)' }}>
            {attachmentUrls.map(url => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url.split('/').pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recipients */}
      <details style={{ marginBottom: 24 }}>
        <summary style={{ cursor: 'pointer', fontSize: 14, color: 'var(--ink-3)', marginBottom: 8 }}>
          {recipientList.length} recipient{recipientList.length !== 1 ? 's' : ''}
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {recipientList.map(r => (
            <div key={r.id as string} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              <strong>{r.name as string}</strong> · {r.email as string}
              <span
                className={`wsc-tag ${(r.recipient_type as string) === 'member' ? 'wsc-tag-sage' : (r.recipient_type as string) === 'signup' ? 'wsc-tag-gold' : ''}`}
                style={{ marginLeft: 6 }}
              >
                {r.recipient_type as string}
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* Reply thread */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
        Replies {replyList.length > 0 && <span style={{ color: 'var(--clay)' }}>({replyList.length})</span>}
      </h2>

      {replyList.length === 0 ? (
        <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No replies yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {replyList.map(r => (
            <div
              key={r.id as string}
              style={{
                alignSelf: 'flex-start',
                maxWidth: '80%',
                background: 'var(--paper-2)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-4)', marginBottom: 4, flexWrap: 'wrap' }}>
                <span><strong>{r.from_name as string || r.from_email as string}</strong></span>
                <span>·</span>
                <span>{r.from_email as string}</span>
                <span>·</span>
                <span>
                  {new Date(r.received_at as string).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--ink-2)' }}>
                {r.body as string}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
