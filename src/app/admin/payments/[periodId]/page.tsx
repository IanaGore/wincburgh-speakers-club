import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { toggleMemberPayment } from '../actions'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function PaymentPeriodPage({ params }: { params: Promise<{ periodId: string }> }) {
  const { periodId } = await params
  const supabase = await createClient()

  const { data: period } = await supabase
    .from('payment_periods')
    .select('id, label, start_date, end_date')
    .eq('id', periodId)
    .single()

  if (!period) notFound()

  const { data: memberPayments } = await supabase
    .from('member_payments')
    .select(`
      id, has_paid, paid_at,
      profiles!inner ( id, full_name, club_roles, is_active )
    `)
    .eq('period_id', periodId)
    .order('profiles(full_name)')

  const paid = memberPayments?.filter(mp => mp.has_paid).length ?? 0
  const total = memberPayments?.length ?? 0
  const unpaid = total - paid

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/admin/payments" style={{ color: "#94a3b8", fontSize: "0.9rem", textDecoration: "none" }}>
          ← Back to Payments
        </Link>
        <h1 style={{ fontSize: "2.2rem", margin: "0.75rem 0 0.25rem" }}>{period.label}</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>
          {formatDate(period.start_date)} → {formatDate(period.end_date)}
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <div style={{ background: "var(--card-bg)", padding: "1rem 1.5rem", borderRadius: "12px", border: "1px solid var(--card-border)", textAlign: "center", minWidth: "100px" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>{total}</div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Total</div>
        </div>
        <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "1rem 1.5rem", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.3)", textAlign: "center", minWidth: "100px" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#10b981" }}>{paid}</div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Paid</div>
        </div>
        <div style={{ background: unpaid > 0 ? "rgba(248, 113, 113, 0.1)" : "rgba(16, 185, 129, 0.05)", padding: "1rem 1.5rem", borderRadius: "12px", border: `1px solid ${unpaid > 0 ? "rgba(248, 113, 113, 0.3)" : "rgba(16, 185, 129, 0.2)"}`, textAlign: "center", minWidth: "100px" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: unpaid > 0 ? "#f87171" : "#10b981" }}>{unpaid}</div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Outstanding</div>
        </div>
      </div>

      {/* Member payment rows */}
      <div style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
        {!memberPayments || memberPayments.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
            No members found for this period.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {memberPayments.map((mp: any) => {
              const profile = mp.profiles
              const hasPaid = mp.has_paid

              return (
                <div key={mp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--card-border)", flexWrap: "wrap", gap: "0.8rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: "600" }}>{profile.full_name || 'Unnamed'}</span>
                      {profile.is_active === false && (
                        <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "0.1rem 0.4rem", borderRadius: "8px", fontSize: "0.72rem" }}>Inactive</span>
                      )}
                    </div>
                    {profile.club_roles?.length > 0 && (
                      <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {profile.club_roles.map((role: string) => (
                          <span key={role} style={{ background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.1rem 0.4rem", borderRadius: "6px", fontSize: "0.75rem", border: "1px solid rgba(14, 165, 233, 0.2)" }}>
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                    {hasPaid && mp.paid_at && (
                      <div style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "#64748b" }}>
                        Paid {formatDate(mp.paid_at)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <span style={{
                      background: hasPaid ? "rgba(16, 185, 129, 0.1)" : "rgba(248, 113, 113, 0.1)",
                      color: hasPaid ? "#10b981" : "#f87171",
                      padding: "0.3rem 0.7rem",
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      border: `1px solid ${hasPaid ? "rgba(16, 185, 129, 0.3)" : "rgba(248, 113, 113, 0.3)"}`
                    }}>
                      {hasPaid ? "Paid" : "Unpaid"}
                    </span>
                    <form action={toggleMemberPayment}>
                      <input type="hidden" name="period_id" value={period.id} />
                      <input type="hidden" name="member_id" value={profile.id} />
                      <input type="hidden" name="has_paid" value={hasPaid ? 'true' : 'false'} />
                      <button type="submit" className="btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                        {hasPaid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
