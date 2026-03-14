import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('error', errorDescription || 'Er ging iets mis met de verificatie.')
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('error', 'Link is verlopen. Vraag een nieuwe aan.')
      return NextResponse.redirect(loginUrl)
    }

    // Password recovery — redirect to set new password
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }

    // Invite — new client needs to set their first password
    if (type === 'invite') {
      return NextResponse.redirect(new URL('/auth/set-password', request.url))
    }

    // Check if user has a role, redirect accordingly
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'coach') {
        return NextResponse.redirect(new URL('/coach', request.url))
      } else {
        return NextResponse.redirect(new URL('/client', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/', request.url))
}
