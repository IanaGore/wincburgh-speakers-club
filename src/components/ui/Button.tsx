import { ReactNode } from 'react'
import Link from 'next/link'

type ButtonVariant = 'primary' | 'ghost' | 'ghost-light' | 'text'
type ButtonSize = 'default' | 'sm'

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
}

export default function Button({
  children, variant = 'primary', size = 'default',
  href, onClick, type = 'button', disabled, className = ''
}: ButtonProps) {
  const classes = [
    'wsc-btn',
    variant === 'primary' ? 'wsc-btn-primary' : '',
    variant === 'ghost' ? 'wsc-btn-ghost' : '',
    variant === 'ghost-light' ? 'wsc-btn-ghost-light' : '',
    variant === 'text' ? 'wsc-btn-text' : '',
    size === 'sm' ? 'wsc-btn-sm' : '',
    className,
  ].filter(Boolean).join(' ')

  if (href) return <Link href={href} className={classes}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} className={classes}>{children}</button>
}
