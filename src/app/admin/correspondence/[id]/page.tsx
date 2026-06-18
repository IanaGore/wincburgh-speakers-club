import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import StatusButtons from './StatusButtons'
import ReplyForm from './ReplyForm'

export const metadata = { title: 'Correspondence | Admin' }

function statusClass(status: string) {
  const map: Record<string, string> = {
    open: 'wsc-tag-clay',
    in_progress: 'wsc-tag-gold',
    closed: 'wsc-tag-sage',
  }
  return `wsc-tag ${map[status] ?? ''}`
}

function statusLabel(status: string) {
  if (status === 'in_progress') return 'In Progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function CorrespondenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: corr, error: corrError }, { data: messages }] = await Promise.all([
    supabase
      .from('external_correspondence')
      .select('id, subject, from_email, from_name, status, received_at')
      .eq('id', id)
      .single(),
    supabase
      .from('correspondence_messages')
      .select('id, direction, body, from_email, from_name, sent_at')
      .eq('correspondence_id', id)
      .order('sent_at', { ascending: true }),
  ])

  if (corrError || !corr) notFound()

  const messageList = messages ?? []

  return (
    <div style={{ maxWidth: 760 }}>
      <EyebrowLabel>
        Admin · <Link href="/admin/correspondence">Correspondence</Link>
      </EyebrowLabel>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, margin: '8px 0 4px' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 28, margin: 0 }}>
          {corr.subject as string}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={statusClass(corr.status as string)}>
            {statusLabel(corr.status as string)}
          </span>
          <StatusButtons id={id} status={corr.status as string} />
        </div>
      </div>

      <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 24px' }}>
        From: <strong>{(corr.from_name as string) || (corr.from_email as string)}</strong>
        {(corr.from_name as string) && (
          <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>&lt;{corr.from_email as string}&gt;</span>
        )}
        {' · '}
        {new Date(corr.received_at as string).toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--rule-soft)', marginBottom: 24 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {messageList.map(msg => {
          const outbound = (msg.direction as string) === 'outbound'
          return (
            <div
              key={msg.id as string}
              style={{
                alignSelf: outbound ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: outbound ? 'right' : 'left' }}>
                {outbound ? 'You (President)' : ((msg.from_name as string) || (msg.from_email as string))}
                {' · '}
                {new Date(msg.sent_at as string).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </div>
              <div
                style={{
                  background: outbound ? 'color-mix(in srgb, var(--clay) 15%, var(--paper-2))' : 'var(--paper-2)',
                  border: outbound
                    ? '1px solid color-mix(in srgb, var(--clay) 30%, transparent)'
                    : '1px solid var(--rule-soft)',
                  borderRadius: outbound ? '8px 0 8px 8px' : '0 8px 8px 8px',
                  padding: '10px 14px',
                }}
              >
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--ink-2)' }}>
                  {msg.body as string}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--rule-soft)', marginBottom: 24 }} />

      <ReplyForm correspondenceId={id} />
    </div>
  )
}
