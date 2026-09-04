'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Sign in failed')
      }
      // only allow same-origin relative paths (blocks //evil.com open redirects)
      const dest = next.startsWith('/') && !next.startsWith('//') ? next : '/'
      router.replace(dest)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        width: '100%',
        maxWidth: 340,
        background: '#fff',
        borderRadius: 12,
        padding: '28px 26px 24px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Image src="/logo.svg" alt="Rosenello" width={46} height={31} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#036A43' }}>Rosenello</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>Production</div>
        </div>
      </div>

      <label
        htmlFor="password"
        style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6 }}
      >
        Password
      </label>
      <input
        id="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 14,
          border: `1px solid ${error ? '#C0392B' : '#ddd'}`,
          borderRadius: 6,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {error && (
        <div style={{ fontSize: 12, color: '#C0392B', marginTop: 8 }}>{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        style={{
          width: '100%',
          marginTop: 16,
          padding: '10px 12px',
          fontSize: 14,
          fontWeight: 600,
          color: loading || !password ? 'rgba(255,255,255,0.6)' : '#fff',
          background: loading || !password ? '#6a9c86' : '#036A43',
          border: 'none',
          borderRadius: 6,
          cursor: loading || !password ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div style={{ height: 3, background: '#F4C828', borderRadius: 2, marginTop: 20 }} />
    </form>
  )
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: '#036A43',
      }}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
