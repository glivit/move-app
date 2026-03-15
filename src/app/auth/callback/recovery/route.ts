import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Recovery-specific callback — always redirects to reset-password
 * Used as redirectTo for generateLink({ type: 'recovery' })
 */
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('error', 'Reset-link is verlopen. Vraag een nieuwe aan.')
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.redirect(new URL('/auth/reset-password', request.url))
  }

  return NextResponse.redirect(new URL('/', request.url))
}
