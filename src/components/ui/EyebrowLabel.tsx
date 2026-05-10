type EyebrowTone = 'muted' | 'clay' | 'gold'

export default function EyebrowLabel({ children, tone = 'muted' }: { children: React.ReactNode; tone?: EyebrowTone }) {
  const colors: Record<EyebrowTone, string> = {
    muted: 'var(--ink-3)',
    clay: 'var(--clay)',
    gold: 'oklch(0.55 0.155 60)',
  }
  return (
    <span className="wsc-eyebrow" style={{ color: colors[tone] }}>
      {children}
    </span>
  )
}
