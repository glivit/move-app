import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Main auth callback — handles code exchange and smart redirect.
 *
 * Supabase redirects here after email verification with ?code=xxx
 * The ?type= param we set in redirectTo often gets lost, so we also
 * auto-detect invites via app_metadata.invited_at
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error('[Auth Callback] error:', error, errorDescription)
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('error', errorDescription || 'Er ging iets mis met de verificatie.')
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Auth Callback] exchange error:', exchangeError)
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('error', 'Link is verlopen. Vraag een nieuwe aan.')
      return NextResponse.redirect(loginUrl)
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Explicit type param (if Supabase preserved it)
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }
    if (type === 'invite') {
      return NextResponse.redirect(new URL('/auth/set-password', request.url))
    }

    // Auto-detect: invited user or user who needs to set a password
    if (user) {
      const invitedAt = user.app_metadata?.invited_at
      const providers = user.app_metadata?.providers || []
      // Check if user has never set a password (no 'email' provider)
      const hasNoPassword = !providers.includes('email')

      // Fetch profile once for all checks
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Redirect to set-password if user has no password yet:
      // - Either they have invited_at (original invite flow)
      // - Or they're a client without a password (magiclink resend flow)
      if (hasNoPassword && (invitedAt || profile?.role === 'client')) {
        return NextResponse.redirect(new URL('/auth/set-password', request.url))
      }

      // Normal login — redirect based on role
      if (profile?.role === 'coach') {
        return NextResponse.redirect(new URL('/coach', request.url))
      }
      return NextResponse.redirect(new URL('/client', request.url))
    }
  }

  // No code — maybe Supabase used implicit flow (hash fragment)
  // In that case, the client-side needs to handle it
  // Redirect to a client-side handler page
  return NextResponse.redirect(new URL('/auth/verify', request.url))
}
