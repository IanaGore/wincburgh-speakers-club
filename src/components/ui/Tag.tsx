type TagVariant = 'default' | 'clay' | 'sage' | 'gold'

export default function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: TagVariant }) {
  return (
    <span className={`wsc-tag${variant !== 'default' ? ` wsc-tag-${variant}` : ''}`}>
      {children}
    </span>
  )
}
