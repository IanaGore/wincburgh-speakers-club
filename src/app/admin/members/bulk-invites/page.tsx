import { createClient } from '@/utils/supabase/server'
import { previewBulkInvites, sendBulkInvites } from '../actions'
import Link from 'next/link'

export const metadata = { title: 'Bulk Invites | Admin' }

export default async function BulkInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; bulk_error?: string }>
}) {
  const { batch: batchId, bulk_error: bulkError } = await searchParams
  const supabase = await createClient()

  const { data: batch } = batchId
    ? await supabase.from('bulk_invite_batches').select('*').eq('id', batchId).maybeSingle()
    : { data: null }

  const { data: rows } = batchId
    ? await supabase.from('bulk_invite_batch_rows').select('*').eq('batch_id', batchId).order('row_number')
    : { data: [] }

  return (
    <div>
      <p style={{ marginBottom: 12 }}><Link href="/admin/members" style={{ color: 'var(--clay)' }}>Back to members</Link></p>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px' }}>
        Bulk Member Invites
      </h1>

      {bulkError && (
        <div style={{ padding: '12px 16px', background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25)', borderRadius: 8, color: 'oklch(0.40 0.15 25)', fontSize: 14, marginBottom: 16 }}>
          {bulkError === 'locked' ? 'Another bulk invite run is already processing.' : 'Something went wrong while handling the upload.'}
        </div>
      )}

      <div className="wsc-card" style={{ padding: 20, marginBottom: 24 }}>
        <form action={previewBulkInvites} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="wsc-label" htmlFor="file">Spreadsheet</label>
            <input id="file" name="file" type="file" accept=".csv,.xlsx" className="wsc-input" required />
          </div>
          <button type="submit" className="wsc-btn wsc-btn-primary" style={{ alignSelf: 'flex-start' }}>
            Upload and validate
          </button>
        </form>
      </div>

      {batch && (
        <div className="wsc-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 500 }}>Preview</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--ink-3)' }}>{batch.file_name as string}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="wsc-tag">{batch.row_count as number} rows</span>
              <span className="wsc-tag wsc-tag-sage">{batch.valid_count as number} ready</span>
              <span className="wsc-tag wsc-tag-gold">{batch.invalid_count as number} invalid</span>
              <span className="wsc-tag wsc-tag-clay">{batch.skipped_count as number} skipped</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Row</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Email</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Name</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map(row => (
                <tr key={row.id as string} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{row.row_number as number}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{row.email as string}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{[row.first_name, row.last_name].filter(Boolean).join(' ')}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="wsc-tag">{row.status as string}{row.error ? ` · ${row.error as string}` : ''}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form action={sendBulkInvites}>
            <input type="hidden" name="batch_id" value={batch.id as string} />
            <button type="submit" className="wsc-btn wsc-btn-primary">Confirm and send invites</button>
          </form>
        </div>
      )}
    </div>
  )
}
