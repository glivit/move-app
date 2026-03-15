import { createAdminClient } from '@/lib/supabase-admin'
import { sendPasswordResetEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://movestudio.be'

  // Generate password reset link without sending Supabase's default email
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (linkError) {
    // Don't reveal whether the email exists or not (security)
    console.error('Reset link error:', linkError)
    return NextResponse.json({ success: true })
  }

  // Extract token_hash from Supabase's action_link and build our OWN direct link.
  // This bypasses Supabase's redirect (implicit flow / hash fragments get lost).
  const actionUrl = new URL(linkData.properties.action_link)
  const tokenHash = actionUrl.searchParams.get('token')
  const resetLink = `${appUrl}/auth/reset-password?token_hash=${tokenHash}&type=recovery`

  // Get user name for personalization
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', linkData.user.id)
    .single()

  // Send branded reset email via Resend
  try {
    await sendPasswordResetEmail({
      to: email,
      resetLink,
      clientName: profile?.full_name || undefined,
    })
  } catch (err) {
    console.error('Reset email error:', err)
    // Don't reveal email sending failure to prevent email enumeration
  }

  // Always return success (don't reveal if email exists)
  return NextResponse.json({ success: true })
}
