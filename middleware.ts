import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

const PUBLIC_PATHS = ['/login', '/api/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return new NextResponse('AUTH_SECRET is not configured on this deployment.', { status: 500 })
  }

  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, secret)
  if (authed) return NextResponse.next()

  // API calls get a 401 instead of an HTML redirect
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = req.nextUrl.clone()
  const next = pathname + req.nextUrl.search
  url.pathname = '/login'
  url.search = ''
  if (next && next !== '/') url.searchParams.set('next', next)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)'],
}
