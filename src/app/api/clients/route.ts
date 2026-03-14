import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { clientCreationSchema } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

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

  // Invite user by email — this creates the user AND sends the invite email
  const { data: newUser, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name,
      role: 'client',
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
  })

  if (inviteError) {
    // If user already exists, try to just send a magic link
    if (inviteError.message?.includes('already been registered')) {
      return NextResponse.json({ error: 'Dit e-mailadres is al geregistreerd.' }, { status: 400 })
    }
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // Update the auto-created profile with additional data
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      phone: phone || null,
      package: pkg,
      start_date,
    })
    .eq('id', newUser.user.id)

  if (profileError) {
    console.error('Profile update error:', profileError)
    // Don't fail — user was invited, profile can be updated later
  }

  return NextResponse.json({ success: true, userId: newUser.user.id }, { status: 201 })
}
