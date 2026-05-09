import Link from 'next/link'
import './Wordmark.css'

interface WordmarkProps {
  tone?: 'light' | 'dark'
  href?: string
}

function WSCLogo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  const stroke = light ? 'oklch(0.97 0.01 80)' : 'var(--clay)'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="19" fill="none" stroke={stroke} strokeWidth="1.5" />
      <path d="M14 26 Q14 18 20 18 Q26 18 26 26" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="18" x2="20" y2="13" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="11" r="1.6" fill={stroke} />
      <line x1="14" y1="29" x2="26" y2="29" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function Wordmark({ tone = 'dark', href = '/' }: WordmarkProps) {
  const toneClass = tone === 'light' ? 'wordmark--light' : 'wordmark--dark'

  return (
    <Link href={href} className={`wordmark ${toneClass}`}>
      <WSCLogo light={tone === 'light'} />
      <div className="wordmark__text">
        <div className="wordmark__name">Winchburgh</div>
        <div className="wordmark__sub">Speakers Club · est. 2018</div>
      </div>
    </Link>
  )
}
