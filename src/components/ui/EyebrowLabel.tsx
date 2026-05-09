interface EyebrowLabelProps {
  children: React.ReactNode
  className?: string
  color?: 'default' | 'clay' | 'gold'
}

export default function EyebrowLabel({
  children,
  className = '',
  color = 'default',
}: EyebrowLabelProps) {
  const colorStyle =
    color === 'clay'
      ? { color: 'var(--clay-deep)' }
      : color === 'gold'
        ? { color: 'oklch(0.55 0.155 60)' }
        : undefined

  return (
    <span className={`wsc-eyebrow ${className}`} style={colorStyle}>
      {children}
    </span>
  )
}
