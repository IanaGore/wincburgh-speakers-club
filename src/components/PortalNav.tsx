'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'

const ADMIN_GROUPS = {
  people: [
    { label: 'Members', href: '/admin/members' },
    { label: 'Payments', href: '/admin/payments' },
  ],
  content: [
    { label: 'News', href: '/admin/news' },
    { label: 'Media', href: '/admin/media' },
    { label: 'Resources', href: '/admin/resources' },
  ],
  comms: [
    { label: 'Enquiries', href: '/admin/enquiries' },
    { label: 'Communications', href: '/admin/communications' },
    { label: 'Correspondence', href: '/admin/correspondence' },
  ],
} as const

type GroupKey = keyof typeof ADMIN_GROUPS

const GROUP_LABELS: Record<GroupKey, string> = {
  people: 'People',
  content: 'Content',
  comms: 'Comms',
}

export default function PortalNav({ isAdminView = false }: { isAdminView?: boolean }) {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  function isGroupActive(key: GroupKey) {
    return ADMIN_GROUPS[key].some(item => pathname.startsWith(item.href))
  }

  function activeStyle(href: string) {
    return pathname.startsWith(href)
      ? { color: 'var(--ink)', borderBottom: '2px solid var(--clay)', paddingBottom: '2px' }
      : {}
  }

  function toggleGroup(key: GroupKey, e: React.MouseEvent<HTMLButtonElement>) {
    if (openGroup === key) {
      setOpenGroup(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setPanelPos({ top: rect.bottom + 4, left: rect.left })
    setOpenGroup(key)
  }

  // Close dropdown on route change (e.g. after clicking a dropdown item)
  useEffect(() => {
    setOpenGroup(null)
  }, [pathname])

  // Close dropdown when clicking outside the nav or panel
  useEffect(() => {
    if (!openGroup) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('.portal-nav')) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openGroup])

  return (
    <nav
      className="portal-nav"
      style={{
        background: 'var(--paper)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div className="portal-nav__logo" style={{ fontSize: '1.2rem' }}>
        <Link href="/">🎙️ Winchburgh <span>Speakers Club</span></Link>
        <span style={{ color: 'var(--ink-3)', marginLeft: '0.5rem', fontWeight: '400', fontSize: '1rem' }}>
          | {isAdminView ? 'Admin' : 'Member'}
        </span>
      </div>

      <div className="portal-nav__links">
        {isAdminView ? (
          <>
            <Link href="/admin/meetings" style={activeStyle('/admin/meetings')}>Sessions</Link>

            {(Object.keys(ADMIN_GROUPS) as GroupKey[]).map(key => (
              <div key={key} className="portal-nav__dropdown-wrapper">
                <button
                  type="button"
                  className={`portal-nav__dropdown-toggle${isGroupActive(key) ? ' is-active' : ''}`}
                  onClick={e => toggleGroup(key, e)}
                >
                  {GROUP_LABELS[key]}
                  <span className={`portal-nav__chevron${openGroup === key ? ' is-open' : ''}`}>▾</span>
                </button>
                {openGroup === key && (
                  <div
                    className="portal-nav__dropdown-panel"
                    style={{ top: panelPos.top, left: panelPos.left }}
                  >
                    {ADMIN_GROUPS[key].map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`portal-nav__dropdown-item${pathname.startsWith(item.href) ? ' is-active' : ''}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link href="/admin/settings" style={activeStyle('/admin/settings')}>Settings</Link>
          </>
        ) : (
          <>
            <Link href="/member/dashboard" style={activeStyle('/member/dashboard')}>Dashboard</Link>
            <Link href="/member/profile" style={activeStyle('/member/profile')}>Profile</Link>
            <Link href="/member/speeches" style={activeStyle('/member/speeches')}>Speeches</Link>
            <Link href="/member/resources" style={activeStyle('/member/resources')}>Resources</Link>
          </>
        )}
      </div>

      <div className="portal-nav__pinned">
        {isAdminView ? (
          <Link href="/member/dashboard" style={{ color: 'var(--clay)', fontWeight: 'bold' }}>
            Member View →
          </Link>
        ) : (
          <Link href="/admin/meetings" style={{ color: 'var(--clay)', fontWeight: 'bold' }}>
            Admin Tools →
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="btn-secondary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            Log out
          </button>
        </form>
      </div>
    </nav>
  )
}
