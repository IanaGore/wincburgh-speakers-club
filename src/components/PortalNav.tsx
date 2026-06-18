'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'

function activeStyle(pathname: string, href: string) {
  return pathname.startsWith(href)
    ? { color: 'var(--ink)', borderBottom: '2px solid var(--clay)', paddingBottom: '2px' }
    : {}
}

export default function PortalNav({ isAdminView = false }: { isAdminView?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="portal-nav" style={{ background: "var(--paper)", position: "sticky", top: 0, zIndex: 50, borderBottom: '1px solid var(--rule)' }}>
      <div className="portal-nav__logo" style={{ fontSize: "1.2rem" }}>
        <Link href="/">🎙️ Winchburgh <span>Speakers Club</span></Link>
        <span style={{ color: "var(--ink-3)", marginLeft: "0.5rem", fontWeight: "400", fontSize: "1rem" }}>| {isAdminView ? 'Admin' : 'Member'}</span>
      </div>
      <div className="portal-nav__links">
        {isAdminView ? (
          <>
            <Link href="/admin/meetings" style={activeStyle(pathname, '/admin/meetings')}>Sessions</Link>
            <Link href="/admin/members" style={activeStyle(pathname, '/admin/members')}>Members</Link>
            <Link href="/admin/payments" style={activeStyle(pathname, '/admin/payments')}>Payments</Link>
            <Link href="/admin/news" style={activeStyle(pathname, '/admin/news')}>News</Link>
            <Link href="/admin/enquiries" style={activeStyle(pathname, '/admin/enquiries')}>Enquiries</Link>
            <Link href="/admin/communications" style={activeStyle(pathname, '/admin/communications')}>Communications</Link>
            <Link href="/admin/correspondence" style={activeStyle(pathname, '/admin/correspondence')}>Correspondence</Link>
            <Link href="/admin/media" style={activeStyle(pathname, '/admin/media')}>Media</Link>
            <Link href="/admin/resources" style={activeStyle(pathname, '/admin/resources')}>Resources</Link>
            <Link href="/admin/settings" style={activeStyle(pathname, '/admin/settings')}>Settings</Link>
            <Link href="/member/dashboard" style={{ color: "var(--clay)", marginLeft: "1rem", fontWeight: "bold" }}>Member View →</Link>
          </>
        ) : (
          <>
            <Link href="/member/dashboard" style={activeStyle(pathname, '/member/dashboard')}>Dashboard</Link>
            <Link href="/member/profile" style={activeStyle(pathname, '/member/profile')}>Profile</Link>
            <Link href="/member/speeches" style={activeStyle(pathname, '/member/speeches')}>Speeches</Link>
            <Link href="/member/resources" style={activeStyle(pathname, '/member/resources')}>Resources</Link>
            <Link href="/admin/meetings" style={{ color: "var(--clay)", marginLeft: "1rem", fontWeight: "bold" }}>Admin Tools →</Link>
          </>
        )}
        <form action={logout}>
          <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", marginLeft: "1rem" }}>Log out</button>
        </form>
      </div>
    </nav>
  )
}
