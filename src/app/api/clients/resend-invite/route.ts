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

  // Generate a new invite link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: clientProfile.email,
    options: {
      data: {
        full_name: clientProfile.full_name,
        role: 'client',
      },
      redirectTo: `${appUrl}/auth/callback/invite`,
    },
  })

  if (linkError) {
    console.error('Resend invite link error:', linkError)
    return NextResponse.json(
      { error: 'Kon geen nieuwe uitnodiging genereren. Probeer later opnieuw.' },
      { status: 500 }
    )
  }

  const inviteLink = linkData.properties.action_link

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
