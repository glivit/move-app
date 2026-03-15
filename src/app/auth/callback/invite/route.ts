import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Invite-specific callback — always redirects to set-password
 * Used as redirectTo for generateLink({ type: 'invite' })
 */
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('error', 'Uitnodigingslink is verlopen. Vraag je coach om een nieuwe.')
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.redirect(new URL('/auth/set-password', request.url))
  }

  return NextResponse.redirect(new URL('/', request.url))
}
