'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/home', label: 'Home', icon: '◐' },
  { href: '/history', label: 'History', icon: '≡' },
  { href: '/settings', label: 'Settings', icon: '⊙' },
]

export default function BottomTabs() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 640,
      height: 64,
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      paddingTop: 8,
      zIndex: 50,
    }}>
      {TABS.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: active ? 'var(--amber)' : 'var(--cream-faint)',
              textDecoration: 'none',
              flex: 1,
              padding: '4px 0',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
