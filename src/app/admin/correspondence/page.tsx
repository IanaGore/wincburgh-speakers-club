import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'

export const metadata = { title: 'Correspondence | Admin' }

const STATUSES = ['open', 'in_progress', 'closed', 'all'] as const

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

export default async function CorrespondencePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'open' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('external_correspondence')
    .select('id, subject, from_email, from_name, status, received_at')
    .order('received_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: items } = await query
  const rows = items ?? []

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px' }}>
        External Correspondence
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STATUSES.map(s => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`wsc-btn wsc-btn-sm${status === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}
          >
            {statusLabel(s)}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--ink-3)' }}>No {status === 'all' ? '' : statusLabel(status).toLowerCase()} correspondence.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Subject</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>From</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Received</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id as string} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <Link href={`/admin/correspondence/${row.id}`} style={{ color: 'var(--clay)', fontWeight: 500 }}>
                    {row.subject as string}
                  </Link>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                  {(row.from_name as string) || (row.from_email as string)}
                  {(row.from_name as string) && (
                    <span style={{ color: 'var(--ink-4)', marginLeft: 6, fontSize: 12 }}>
                      {row.from_email as string}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                  {new Date(row.received_at as string).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={statusClass(row.status as string)}>
                    {statusLabel(row.status as string)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
