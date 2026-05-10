'use client'

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

export default function DashboardGreeting({ firstName }: { firstName: string }) {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  return (
    <div className="dashboard-greeting">
      <span className="wsc-eyebrow" style={{ color: 'var(--gold)' }}>{dateStr}</span>
      <h1>
        Good {getTimeOfDay()},{' '}
        <em className="dash-greeting-em">{firstName}</em>.
      </h1>
    </div>
  )
}
