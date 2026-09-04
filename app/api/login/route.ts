import { NextResponse } from 'next/server'
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, secretsMatch } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD
  const secret = process.env.AUTH_SECRET

  if (!expected || !secret) {
    return NextResponse.json({ error: 'Server is not configured for login.' }, { status: 500 })
  }

  let supplied = ''
  try {
    const body = await req.json()
    if (typeof body?.password === 'string') supplied = body.password
  } catch {
    /* empty / malformed body -> treated as wrong password */
  }

  // Small fixed delay to blunt brute-forcing
  await new Promise(r => setTimeout(r, 400))

  if (!(await secretsMatch(supplied, expected, secret))) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
