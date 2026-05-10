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
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/admin/payments" style={{ color: 'var(--ink-3)', fontSize: '0.9rem', textDecoration: 'none', fontFamily: 'var(--mono)' }}>
          ← Back to Payments
        </Link>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 4px', color: 'var(--ink)' }}>{period.label}</h1>
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          {formatDate(period.start_date)} → {formatDate(period.end_date)}
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="wsc-card" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '100px' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{total}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-3)' }}>Total</div>
        </div>
        <div className="wsc-card" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '100px' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{paid}</div>
          <div style={{ fontSize: '0.85rem' }}><span className="wsc-tag wsc-tag-sage">Paid</span></div>
        </div>
        <div className="wsc-card" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '100px' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{unpaid}</div>
          <div style={{ fontSize: '0.85rem' }}><span className={unpaid > 0 ? 'wsc-tag wsc-tag-gold' : 'wsc-tag wsc-tag-sage'}>Outstanding</span></div>
        </div>
      </div>

      {/* Member payment rows */}
      <div className="wsc-card" style={{ overflow: 'hidden' }}>
        {!memberPayments || memberPayments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-3)' }}>
            No members found for this period.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {memberPayments.map((mp: any) => {
              const profile = mp.profiles
              const hasPaid = mp.has_paid

              return (
                <div key={mp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--rule-soft)', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{profile.full_name || 'Unnamed'}</span>
                      {profile.is_active === false && (
                        <span className="wsc-tag wsc-tag-gold">Inactive</span>
                      )}
                    </div>
                    {profile.club_roles?.length > 0 && (
                      <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {profile.club_roles.map((role: string) => (
                          <span key={role} className="wsc-tag wsc-tag-clay">{role}</span>
                        ))}
                      </div>
                    )}
                    {hasPaid && mp.paid_at && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                        Paid {formatDate(mp.paid_at)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className={hasPaid ? 'wsc-tag wsc-tag-sage' : 'wsc-tag wsc-tag-gold'}>
                      {hasPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    <form action={toggleMemberPayment}>
                      <input type="hidden" name="period_id" value={period.id} />
                      <input type="hidden" name="member_id" value={profile.id} />
                      <input type="hidden" name="has_paid" value={hasPaid ? 'true' : 'false'} />
                      <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">
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
