// Edge-compatible signed session cookie.
// Payload is just an expiry timestamp, HMAC-SHA256 signed with AUTH_SECRET.

export const SESSION_COOKIE = 'rp_session'
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days, in seconds

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

export async function sign(payload: string, secret: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload))
  return b64url(new Uint8Array(sig))
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Compare two secrets without leaking length or content via timing. */
export async function secretsMatch(supplied: string, expected: string, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([sign(supplied, secret), sign(expected, secret)])
  return constantTimeEqual(a, b)
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000)
  return `${exp}.${await sign(exp, secret)}`
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot < 1) return false
  const exp = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!constantTimeEqual(sig, await sign(exp, secret))) return false
  const ts = Number(exp)
  return Number.isFinite(ts) && ts > Date.now()
}
