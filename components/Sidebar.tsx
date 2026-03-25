'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Production Board', href: '/' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'KPI Dashboard', href: '/kpi' },
  { label: 'Installers', href: '/installers' },
  { label: 'Admin', href: '/admin' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div style={{
      width: 200,
      background: '#036A43',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Image src="/logo.svg" alt="Rosenello" width={42} height={28} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#036A43' }}>Rosenello</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Production</div>
        </div>
      </div>

      <nav style={{ padding: '10px 8px', flex: 1 }}>
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '7px 10px',
              borderRadius: 6,
              fontSize: 13,
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              marginBottom: 1,
              textDecoration: 'none',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: active ? '#F4C828' : 'rgba(255,255,255,0.2)',
                flexShrink: 0,
              }} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
      }}>
        John Skibinski
      </div>
    </div>
  )
}
