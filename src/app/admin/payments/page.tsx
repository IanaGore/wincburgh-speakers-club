import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { createPaymentPeriod } from './actions'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()

  const { data: periods } = await supabase
    .from('payment_periods')
    .select('id, label, start_date, end_date, created_at')
    .order('start_date', { ascending: false })

  const { data: payments } = await supabase
    .from('member_payments')
    .select('period_id, has_paid')

  const summaryByPeriod: Record<string, { total: number; paid: number }> = {}
  for (const p of payments ?? []) {
    if (!summaryByPeriod[p.period_id]) summaryByPeriod[p.period_id] = { total: 0, paid: 0 }
    summaryByPeriod[p.period_id].total++
    if (p.has_paid) summaryByPeriod[p.period_id].paid++
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 8px', color: 'var(--ink)' }}>Payment Tracking</h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: '2rem' }}>Define payment periods and track which members have paid.</p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Create Period Form */}
        <div className="wsc-card" style={{ flex: '0 0 320px', padding: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 18, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Create New Period</h2>
          <form action={createPaymentPeriod} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="label" className="wsc-label">Period Label</label>
              <input id="label" name="label" required placeholder="e.g. Semester 1 2026" className="wsc-input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="start_date" className="wsc-label">Start Date</label>
              <input id="start_date" name="start_date" type="date" required className="wsc-input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="end_date" className="wsc-label">End Date</label>
              <input id="end_date" name="end_date" type="date" required className="wsc-input" />
            </div>
            <button type="submit" className="wsc-btn wsc-btn-primary">Create Period</button>
          </form>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--ink-4)' }}>
            Creating a period will automatically add all active members to it with an unpaid status.
          </p>
        </div>

        {/* Periods List */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          {!periods || periods.length === 0 ? (
            <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
              No payment periods yet. Create one to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {periods.map(period => {
                const summary = summaryByPeriod[period.id] ?? { total: 0, paid: 0 }
                const unpaid = summary.total - summary.paid
                return (
                  <div key={period.id} className="wsc-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--serif)', fontWeight: 500, color: 'var(--ink)' }}>{period.label}</h3>
                        <p style={{ margin: '0.3rem 0 0.8rem', color: 'var(--ink-3)', fontSize: '0.9rem' }}>
                          {formatDate(period.start_date)} → {formatDate(period.end_date)}
                        </p>
                        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--ink-3)' }}>
                            <strong style={{ color: 'var(--ink)' }}>{summary.total}</strong> total
                          </span>
                          <span className="wsc-tag wsc-tag-sage">{summary.paid} paid</span>
                          {unpaid > 0 && (
                            <span className="wsc-tag wsc-tag-gold">{unpaid} outstanding</span>
                          )}
                        </div>
                      </div>
                      <Link href={`/admin/payments/${period.id}`} className="wsc-btn wsc-btn-sm wsc-btn-ghost">
                        Manage →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
