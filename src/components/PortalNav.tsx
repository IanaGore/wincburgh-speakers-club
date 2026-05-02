import Link from 'next/link'
import { logout } from '@/app/login/actions'

export default function PortalNav({ isAdminView = false }: { isAdminView?: boolean }) {
  return (
    <nav className="nav" style={{ background: "rgba(15, 23, 42, 0.95)", position: "sticky", top: 0, zIndex: 50 }}>
      <div className="nav-logo" style={{ fontSize: "1.2rem" }}>
        <Link href="/">🎙️ Winchburgh <span>Speakers Club</span></Link>
        <span style={{ color: "#64748b", marginLeft: "0.5rem", fontWeight: "400", fontSize: "1rem" }}>| {isAdminView ? 'Admin' : 'Member'}</span>
      </div>
      <div className="nav-links">
        {isAdminView ? (
          <>
            <Link href="/admin/meetings">Sessions</Link>
            <Link href="/admin/news">News</Link>
            <Link href="/admin/members">Members</Link>
            <Link href="/admin/messages">Messages</Link>
            <Link href="/admin/settings">Settings</Link>
            <Link href="/member/dashboard" style={{ color: "var(--primary)", marginLeft: "1rem", fontWeight: "bold" }}>Member View →</Link>
          </>
        ) : (
          <>
            <Link href="/member/dashboard">Dashboard</Link>
            <Link href="/member/speeches">Speeches</Link>
            <Link href="/admin/meetings" style={{ color: "var(--primary)", marginLeft: "1rem", fontWeight: "bold" }}>Admin Tools →</Link>
          </>
        )}
        <form action={logout}>
          <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", marginLeft: "1rem" }}>Log out</button>
        </form>
      </div>
    </nav>
  )
}
