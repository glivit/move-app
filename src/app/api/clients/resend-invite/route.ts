import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendInviteEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

const PACKAGE_LABELS: Record<string, string> = {
  essential: 'Essential',
  performance: 'Performance',
  elite: 'Elite',
}

export async function POST(request: NextRequest) {
  // Verify the requesting user is a coach
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (coachProfile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { clientId } = await request.json()

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID is verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://movestudio.be'

  // Get client profile
  const { data: clientProfile } = await admin
    .from('profiles')
    .select('full_name, email, package')
    .eq('id', clientId)
    .single()

  if (!clientProfile?.email) {
    return NextResponse.json({ error: 'Client niet gevonden' }, { status: 404 })
  }

  // Use magiclink for resends (invite type can fail for existing users).
  // magiclink always generates a fresh token that works for existing accounts.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: clientProfile.email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (linkError) {
    console.error('Resend invite link error:', linkError)
    return NextResponse.json(
      { error: `Kon geen nieuwe uitnodiging genereren: ${linkError.message}` },
      { status: 500 }
    )
  }

  // Use action_link (goes through Supabase's server-side verification).
  // This is more reliable than client-side verifyOtp with token_hash because:
  // 1. Token is verified server-side by Supabase (no React double-render issues)
  // 2. Session is established via PKCE code exchange in our auth callback
  // 3. No URL encoding or timing issues
  let inviteLink = linkData.properties?.action_link || ''
  if (inviteLink) {
    const actionUrl = new URL(inviteLink)
    actionUrl.searchParams.set('redirect_to', `${appUrl}/auth/callback`)
    inviteLink = actionUrl.toString()
  } else {
    // Fallback: use hashed_token directly (legacy approach)
    const tokenHash = linkData.properties?.hashed_token || ''
    if (!tokenHash) {
      console.error('No token found in link data:', JSON.stringify(linkData.properties))
      return NextResponse.json(
        { error: 'Kon geen geldige token genereren. Probeer later opnieuw.' },
        { status: 500 }
      )
    }
    inviteLink = `${appUrl}/auth/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`
  }

  try {
    await sendInviteEmail({
      to: clientProfile.email,
      clientName: clientProfile.full_name,
      inviteLink,
      packageName: PACKAGE_LABELS[clientProfile.package] || clientProfile.package || 'MŌVE',
    })
  } catch (emailError) {
    console.error('Resend invite email error:', emailError)
    return NextResponse.json(
      { error: 'Email kon niet verstuurd worden. Controleer de email instellingen.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
