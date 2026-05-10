'use client'
import { useState } from 'react'
import Link from 'next/link'
import Wordmark from './Wordmark'
import { Menu, X } from 'lucide-react'
import './Navbar.css'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="navbar-wrap">
      <div className="nav-ribbon">
        <span>Tuesday meetings · 7pm · Community Centre, Main Street</span>
        <span>First three visits free</span>
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
          {[['/', 'Home'], ['/news', 'News'], ['/signup', 'Attend'], ['/contact', 'Contact']].map(([href, label]) => (
            <li key={href}><Link href={href} onClick={() => setOpen(false)}>{label}</Link></li>
          ))}
        </ul>
        <Link href="/login" className="navbar__login wsc-btn wsc-btn-sm">Member login</Link>
      </nav>
    </header>
  )
}
