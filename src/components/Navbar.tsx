import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="nav">
      <div className="nav-logo">
        <Link href="/">🎙️ Speakers<span>Club</span></Link>
      </div>
      <div className="nav-links">
        <Link href="/#about">About Us</Link>
        <Link href="/#events">Events</Link>
        <Link href="/news">News</Link>
        <Link href="/contact">Contact</Link>
        {user ? (
          <Link href="/member/dashboard" className="btn-primary">Dashboard</Link>
        ) : (
          <>
            <Link href="/login" className="btn-secondary" style={{ border: "none", padding: "0.6rem 1rem" }}>Login</Link>
            <Link href="/login" className="btn-primary">JOIN US</Link>
          </>
        )}
      </div>
    </nav>
  )
}
