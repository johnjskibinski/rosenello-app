import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BACKEND = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://rosenello-production-production.up.railway.app'
).replace(/\/+$/, '')

const PASS_THROUGH_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'cache-control']

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  // Middleware already gates this, but re-check so the backend key can never
  // be borrowed by an unauthenticated request.
  const secret = process.env.AUTH_SECRET
  if (!secret || !(await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { path } = await ctx.params
  const target = `${BACKEND}/${(path || []).join('/')}${req.nextUrl.search}`

  const headers = new Headers()
  for (const h of ['content-type', 'accept']) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }
  const apiKey = process.env.BACKEND_API_KEY
  if (apiKey) headers.set('x-api-key', apiKey)

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const body = hasBody ? await req.arrayBuffer() : undefined

  let upstream: Response
  try {
    upstream = await fetch(target, { method: req.method, headers, body, cache: 'no-store' })
  } catch (err) {
    return NextResponse.json(
      { error: `Backend unreachable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }

  const resHeaders = new Headers()
  for (const h of PASS_THROUGH_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h)
    if (v) resHeaders.set(h, v)
  }
  resHeaders.set('cache-control', 'no-store')

  return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
