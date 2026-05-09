import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { createPaymentPeriod } from './actions'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()

  const { data: periods } = await supabase
    .from('payment_periods')
    .select('id, label, start_date, end_date, created_at')
    .order('start_date', { ascending: false })

  // Fetch payment summary counts per period
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
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Payment Tracking</h1>
        <p style={{ color: "#94a3b8" }}>Define payment periods and track which members have paid.</p>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* Create Period Form */}
        <div style={{ flex: "0 0 320px", background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "1.5rem", color: "var(--primary)" }}>Create New Period</h2>
          <form action={createPaymentPeriod} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="label" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Period Label</label>
              <input
                id="label"
                name="label"
                required
                placeholder="e.g. Semester 1 2026"
                style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="start_date" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Start Date</label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none", colorScheme: "dark" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="end_date" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>End Date</label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                required
                style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none", colorScheme: "dark" }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>
              Create Period
            </button>
          </form>
          <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
            Creating a period will automatically add all active members to it with an unpaid status.
          </p>
        </div>

        {/* Periods List */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          {!periods || periods.length === 0 ? (
            <div style={{ background: "var(--card-bg)", padding: "3rem", borderRadius: "16px", border: "1px dashed var(--card-border)", textAlign: "center", color: "#94a3b8" }}>
              No payment periods yet. Create one to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {periods.map(period => {
                const summary = summaryByPeriod[period.id] ?? { total: 0, paid: 0 }
                const unpaid = summary.total - summary.paid
                return (
                  <div key={period.id} style={{ background: "var(--card-bg)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--primary)" }}>{period.label}</h3>
                        <p style={{ margin: "0.3rem 0 0.8rem", color: "#94a3b8", fontSize: "0.9rem" }}>
                          {formatDate(period.start_date)} → {formatDate(period.end_date)}
                        </p>
                        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                            <span style={{ fontWeight: "bold", color: "white" }}>{summary.total}</span> total
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "#10b981" }}>
                            <span style={{ fontWeight: "bold" }}>{summary.paid}</span> paid
                          </span>
                          {unpaid > 0 && (
                            <span style={{ fontSize: "0.85rem", color: "#f87171" }}>
                              <span style={{ fontWeight: "bold" }}>{unpaid}</span> outstanding
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/admin/payments/${period.id}`}
                        className="btn-secondary"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.9rem", textDecoration: "none" }}
                      >
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
