import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import Wordmark from './Wordmark'
import './Navbar.css'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header>
      <div className="site-ribbon">
        <span>Tuesday meetings · 7pm · Community Centre, Main Street</span>
        <span>First three visits free</span>
      </div>
      <nav className="site-nav">
        <Wordmark />
        <ul className="site-nav__links">
          <li><Link href="/#about" className="site-nav__link">About</Link></li>
          <li><Link href="/#meetings" className="site-nav__link">Meetings</Link></li>
          <li><Link href="/news" className="site-nav__link">News</Link></li>
          <li><Link href="/contact" className="site-nav__link">Contact</Link></li>
        </ul>
        <div className="site-nav__actions">
          {user ? (
            <Link href="/member/dashboard" className="wsc-btn wsc-btn-ghost wsc-btn-sm">
              My dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="wsc-btn wsc-btn-ghost wsc-btn-sm">
                Member login
              </Link>
              <Link href="/contact" className="wsc-btn wsc-btn-primary wsc-btn-sm">
                Visit a meeting
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
