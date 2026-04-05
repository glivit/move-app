import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { clientCreationSchema } from '@/lib/validation'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  // Validate request body with zod
  const validation = clientCreationSchema.safeParse(body)
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    return NextResponse.json(
      {
        error: 'Validatiefout',
        fields: errors,
      },
      { status: 400 }
    )
  }

  const { full_name, email, phone, package: pkg, start_date } = validation.data

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://movestudio.be'

  // Generate invite link WITHOUT sending Supabase's default email
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: {
        full_name,
        role: 'client',
      },
      redirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (linkError) {
    if (linkError.message?.includes('already been registered') ||
        linkError.message?.includes('already exists')) {
      return NextResponse.json({ error: 'Dit e-mailadres is al geregistreerd.' }, { status: 400 })
    }
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  // Use action_link (goes through Supabase's server-side verification).
  // This is more reliable than client-side verifyOtp with token_hash because:
  // 1. Token is verified server-side (no React double-render issues)
  // 2. Session is established via PKCE code exchange in our callback
  // 3. No URL encoding issues with the token
  // Ensure redirect_to points to our callback
  let inviteLink = linkData.properties?.action_link || ''
  if (inviteLink) {
    const actionUrl = new URL(inviteLink)
    actionUrl.searchParams.set('redirect_to', `${appUrl}/auth/callback`)
    inviteLink = actionUrl.toString()
  } else {
    // Fallback: use hashed_token directly (legacy approach)
    const tokenHash = linkData.properties?.hashed_token || ''
    inviteLink = `${appUrl}/auth/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=invite`
  }

  // Update the auto-created profile with additional data
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      phone: phone || null,
      package: pkg,
      start_date,
    })
    .eq('id', linkData.user.id)

  if (profileError) {
    console.error('Profile update error:', profileError)
  }

  // Send branded invite email via Resend
  try {
    await sendInviteEmail({
      to: email,
      clientName: full_name,
      inviteLink,
      packageName: PACKAGE_LABELS[pkg] || pkg,
    })
  } catch (emailError) {
    console.error('Email send error:', emailError)
    // User was created in Supabase but email failed — coach can resend later
    return NextResponse.json({
      success: true,
      userId: linkData.user.id,
      warning: 'Client aangemaakt maar email kon niet verstuurd worden. Probeer later opnieuw.',
    }, { status: 201 })
  }

  return NextResponse.json({ success: true, userId: linkData.user.id }, { status: 201 })
}
