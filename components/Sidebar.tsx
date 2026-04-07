'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rosenello-production-production.up.railway.app'

const navItems = [
  { label: 'Production Board', href: '/' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'KPI Dashboard', href: '/kpi' },
  { label: 'Reports', href: '/reports' },
  { label: 'Installers', href: '/installers' },
  { label: 'Admin', href: '/admin' },
]

function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/jobs/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setOpen(true)
      setHighlighted(0)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (job: any) => {
    router.push(`/jobs/${job.lp_job_id}`)
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); handleSelect(results[highlighted]) }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  const statusColors: Record<string, string> = {
    NS: '#854F0B', '2': '#0F6E56', S: '#185FA5', '5': '#185FA5',
    T: '#A32D2D', SN: '#534AB7', MR: '#534AB7', PU: '#534AB7', SS: '#534AB7',
  }

  return (
    <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Search jobs..."
          style={{
            width: '100%',
            fontSize: 12,
            padding: '7px 8px 7px 26px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div ref={dropdownRef} style={{
          position: 'absolute',
          top: '100%',
          left: 10,
          right: 10,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 999,
          maxHeight: 340,
          overflowY: 'auto',
          marginTop: 4,
        }}>
          {results.map((job, i) => (
            <div
              key={job.lp_job_id}
              onMouseDown={() => handleSelect(job)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '9px 12px',
                cursor: 'pointer',
                background: i === highlighted ? '#f0faf5' : '#fff',
                borderBottom: i < results.length - 1 ? '1px solid #f0f0ee' : 'none',
                borderRadius: i === 0 ? '8px 8px 0 0' : i === results.length - 1 ? '0 0 8px 8px' : 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                  {job.customer_last}, {job.customer_first}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  background: statusColors[job.lp_status] ? `${statusColors[job.lp_status]}18` : '#f0f0ee',
                  color: statusColors[job.lp_status] || '#888',
                }}>
                  {job.lp_status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {job.address} · {job.city}
                {job.total_units > 0 && <span style={{ marginLeft: 6, color: '#036A43' }}>{job.total_units} units</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && !loading && (
        <div ref={dropdownRef} style={{
          position: 'absolute', top: '100%', left: 10, right: 10,
          background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 999, marginTop: 4, padding: '12px', fontSize: 12, color: '#aaa', textAlign: 'center',
        }}>
          No jobs found
        </div>
      )}
    </div>
  )
}

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

      <GlobalSearch />

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
