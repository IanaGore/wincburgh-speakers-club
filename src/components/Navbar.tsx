'use client'
import { useState } from 'react'
import Link from 'next/link'
import Wordmark from './Wordmark'
import { Menu, X } from 'lucide-react'
import './Navbar.css'

export default function Navbar({ portalHref, meetingShort, freeVisitsLabel }: { portalHref?: string; meetingShort?: string; freeVisitsLabel?: string }) {
  const [open, setOpen] = useState(false)
  const loginHref = portalHref ?? '/login'
  const loginLabel = portalHref ? 'Go to portal' : 'Member login'

  return (
    <header className="navbar-wrap">
      <div className="nav-ribbon">
        <span>{meetingShort ?? 'Tuesday meetings · 7:00pm · Winchburgh Community Centre'}</span>
        <span>{freeVisitsLabel ?? 'First visit free'}</span>
      </div>
      <nav className="navbar">
        <Wordmark />
        <button
          className="navbar__hamburger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <ul className={`navbar__links${open ? ' navbar__links--open' : ''}`}>
          {[['/', 'Home'], ['/about', 'About'], ['/meetings', 'Meetings'], ['/news', 'News'], ['/get-started', 'Get started']].map(([href, label]) => (
            <li key={href}><Link href={href} onClick={() => setOpen(false)}>{label}</Link></li>
          ))}
          <li className="navbar__links-login"><Link href={loginHref} onClick={() => setOpen(false)}>{loginLabel}</Link></li>
        </ul>
        <Link href={loginHref} className="navbar__login wsc-btn wsc-btn-sm">{loginLabel}</Link>
      </nav>
    </header>
  )
}
