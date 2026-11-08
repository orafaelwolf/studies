import {NextResponse, type NextRequest} from 'next/server'
import {getToken} from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const {pathname, search} = req.nextUrl
  const token = await getToken({req, secret: process.env.AUTH_SECRET, secureCookie: req.nextUrl.protocol === 'https:'})

  let isAuthed = false
  let isAdmin = false
  let hasDob = false
  let hasAcceptedTerms = false

  if (token) {
    isAuthed = true

    if (token.role === 'admin') isAdmin = true
    if (token.hasDob) hasDob = true
    if (token.hasAcceptedTerms) hasAcceptedTerms = true
  }

  if (pathname.startsWith('/admin')) {
    if (!isAuthed) return NextResponse.redirect(new URL('/signin', req.nextUrl))
    if (!isAdmin) return NextResponse.rewrite(new URL('/not-found', req.nextUrl))

    return NextResponse.next()
  }

  if (!isAuthed) {
    const signin = new URL('/signin', req.nextUrl)
    signin.searchParams.set('next', pathname + search)

    return NextResponse.redirect(signin)
  }

  if (!hasDob && pathname !== '/onboarding/age') {
    return NextResponse.redirect(new URL('/onboarding/age', req.nextUrl))
  }

  if (!hasAcceptedTerms && pathname !== '/onboarding/terms') {
    return NextResponse.redirect(new URL('/onboarding/terms', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/upload/:path*', '/worksheets/:path*', '/topics/:path*',
    '/review/:path*', '/settings/:path*', '/admin/:path*', '/onboarding/:path*',
  ],
}
