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

  // Try magiclink first (works for existing confirmed users),
  // then fall back to invite type (works for new/unconfirmed users)
  let linkData: any = null
  let linkType: 'magiclink' | 'invite' | 'recovery' = 'magiclink'

  // First attempt: magiclink
  const magicResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: clientProfile.email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (magicResult.error) {
    // Fallback: try invite type (creates user if needed)
    console.log('Magiclink failed, trying invite:', magicResult.error.message)
    const inviteResult = await admin.auth.admin.generateLink({
      type: 'invite',
      email: clientProfile.email,
      options: {
        data: {
          full_name: clientProfile.full_name,
          role: 'client',
        },
        redirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (inviteResult.error) {
      // If invite also fails with "already registered", the magiclink issue is real
      if (inviteResult.error.message?.includes('already')) {
        // User exists but magiclink failed — try recovery link as last resort
        const recoveryResult = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: clientProfile.email,
          options: {
            redirectTo: `${appUrl}/auth/callback`,
          },
        })
        if (recoveryResult.error) {
          console.error('All link generation attempts failed:', recoveryResult.error)
          return NextResponse.json(
            { error: `Kon geen nieuwe uitnodiging genereren. Probeer later opnieuw.` },
            { status: 500 }
          )
        }
        linkData = recoveryResult.data
        linkType = 'recovery'
      } else {
        console.error('Invite link error:', inviteResult.error)
        return NextResponse.json(
          { error: `Kon geen nieuwe uitnodiging genereren: ${inviteResult.error.message}` },
          { status: 500 }
        )
      }
    } else {
      linkData = inviteResult.data
      linkType = 'invite'
    }
  } else {
    linkData = magicResult.data
    linkType = 'magiclink'
  }

  // IMPORTANT — we build the email link with token_hash, NOT action_link.
  //
  // action_link sends the user through Supabase's /auth/v1/verify which then
  // redirects to /auth/callback?code=xxx for PKCE code exchange. That PKCE flow
  // requires a `code_verifier` cookie stored in the BROWSER that requested the
  // link — but admin.generateLink is called server-side by the coach, so the
  // client's browser never stored a verifier. exchangeCodeForSession() fails
  // with "both auth code and code verifier should be non-empty", and Cedric
  // sees "Er ging iets mis met de verificatie."
  //
  // Using token_hash directly sends the user to /auth/set-password which calls
  // verifyOtp({ token_hash, type }) client-side. verifyOtp is a direct OTP
  // verification that does NOT use PKCE, so no verifier is needed — the session
  // is established purely from the hashed token. Works for magiclink + invite +
  // recovery, and the set-password page's verifyAttempted ref already handles
  // the React strict-mode double-render case.
  const tokenHash = linkData.properties?.hashed_token || ''
  if (!tokenHash) {
    console.error('No token_hash found in link data:', JSON.stringify(linkData.properties))
    return NextResponse.json(
      { error: 'Kon geen geldige token genereren. Probeer later opnieuw.' },
      { status: 500 }
    )
  }
  const inviteLink = `${appUrl}/auth/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=${linkType}`

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
