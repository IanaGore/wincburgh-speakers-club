interface TagProps {
  children: React.ReactNode
  variant?: 'default' | 'clay' | 'sage' | 'gold'
}

export default function Tag({ children, variant = 'default' }: TagProps) {
  const variantClass =
    variant === 'clay'
      ? 'wsc-tag-clay'
      : variant === 'sage'
        ? 'wsc-tag-sage'
        : variant === 'gold'
          ? 'wsc-tag-gold'
          : ''

  return <span className={`wsc-tag ${variantClass}`}>{children}</span>
}
