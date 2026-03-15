import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Let these routes pass through without any auth check
  // All /auth/* routes must be public (callback, set-password, reset-password, verify, etc.)
  if (
    pathname === '/' ||
    pathname === '/offline' ||
    pathname === '/onboarding' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // Skip API routes, static files
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For protected routes (/coach/*, /client/*), validate the session
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Logged in — check role for route access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return supabaseResponse
  }

  if (pathname.startsWith('/coach') && profile.role !== 'coach') {
    return NextResponse.redirect(new URL('/client', request.url))
  }

  if (pathname.startsWith('/client') && profile.role !== 'client') {
    return NextResponse.redirect(new URL('/coach', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|service-worker\\.js|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
