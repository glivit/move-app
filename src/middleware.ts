import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes — no auth check at all
  // Static paths return immediately (no Supabase client needed)
  if (
    pathname === '/' ||
    pathname === '/offline' ||
    pathname === '/onboarding' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // API routes handle their own auth — skip middleware entirely
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

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

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Fast path: check cached role cookie to avoid DB query on every request
  const cachedRole = request.cookies.get('move_role')?.value

  if (cachedRole) {
    // Validate route access using cached role
    if (pathname.startsWith('/coach') && cachedRole !== 'coach') {
      return NextResponse.redirect(new URL('/client', request.url))
    }
    if (pathname.startsWith('/client') && cachedRole !== 'client') {
      return NextResponse.redirect(new URL('/coach', request.url))
    }

    // Client onboarding gate: redirect to /onboarding if intake not completed
    if (
      cachedRole === 'client' &&
      pathname.startsWith('/client') &&
      request.cookies.get('move_intake')?.value !== '1'
    ) {
      // Check DB for intake_completed (only if no cookie yet)
      const { data: intakeCheck } = await supabase
        .from('profiles')
        .select('intake_completed')
        .eq('id', user.id)
        .single()

      if (intakeCheck?.intake_completed) {
        // Set cookie so we don't check again
        supabaseResponse.cookies.set('move_intake', '1', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 86400, // 24 hours
          path: '/',
        })
      } else {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }

    return supabaseResponse
  }

  // No cached role — fetch from DB (only happens once per session)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, intake_completed')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return supabaseResponse
  }

  // Cache role in cookie for subsequent requests (30 min TTL)
  supabaseResponse.cookies.set('move_role', profile.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1800, // 30 minutes
    path: '/',
  })

  if (pathname.startsWith('/coach') && profile.role !== 'coach') {
    return NextResponse.redirect(new URL('/client', request.url))
  }

  if (pathname.startsWith('/client') && profile.role !== 'client') {
    return NextResponse.redirect(new URL('/coach', request.url))
  }

  // Client onboarding gate: redirect to /onboarding if intake not completed
  if (
    profile.role === 'client' &&
    pathname.startsWith('/client') &&
    !profile.intake_completed
  ) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Cache intake_completed for clients
  if (profile.role === 'client' && profile.intake_completed) {
    supabaseResponse.cookies.set('move_intake', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|service-worker\\.js|sw\\.js|icon-.*\\.png|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
