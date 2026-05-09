import Link from 'next/link'

type ButtonVariant = 'primary' | 'ghost' | 'ghost-light' | 'sm'

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant | ButtonVariant[]
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  formAction?: (formData: FormData) => void | Promise<void>
}

export default function Button({
  children,
  variant = 'primary',
  href,
  onClick,
  type = 'button',
  disabled,
  className = '',
  style,
  formAction,
}: ButtonProps) {
  const variants = Array.isArray(variant) ? variant : [variant]
  const classes = [
    'wsc-btn',
    ...variants.map((v) =>
      v === 'primary'
        ? 'wsc-btn-primary'
        : v === 'ghost'
          ? 'wsc-btn-ghost'
          : v === 'ghost-light'
            ? 'wsc-btn-ghost-light'
            : v === 'sm'
              ? 'wsc-btn-sm'
              : ''
    ),
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      style={style}
      formAction={formAction}
    >
      {children}
    </button>
  )
}
