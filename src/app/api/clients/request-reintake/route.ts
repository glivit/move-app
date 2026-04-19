import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/clients/request-reintake
 *
 * Coach vraagt een klant om de intake opnieuw in te vullen. We zetten
 * `profiles.reintake_requested_at = now()` op de klant, zodat er een
 * task op hun dashboard verschijnt met link naar /onboarding.
 *
 * We raken `intake_completed` NIET aan — dat zou de middleware-gate
 * activeren en de klant hard naar /onboarding redirecten. We willen een
 * zachte nudge, niet een harde lock.
 *
 * Body: { clientId: string, clear?: boolean }
 *   - clear=true → reset naar null (coach annuleert de vraag)
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const body = (await request.json().catch(() => ({}))) as {
    clientId?: string
    clear?: boolean
  }

  if (!body.clientId) {
    return NextResponse.json({ error: 'Client ID is verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the target is actually a client (defence-in-depth)
  const { data: clientProfile } = await admin
    .from('profiles')
    .select('id, role, reintake_requested_at')
    .eq('id', body.clientId)
    .single()

  if (!clientProfile) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }
  if (clientProfile.role !== 'client') {
    return NextResponse.json({ error: 'Profiel is geen klant' }, { status: 400 })
  }

  const now = body.clear ? null : new Date().toISOString()

  const { error: updateErr } = await admin
    .from('profiles')
    .update({
      reintake_requested_at: now,
      reintake_requested_by: body.clear ? null : user.id,
    })
    .eq('id', body.clientId)

  if (updateErr) {
    console.error('request-reintake update error:', updateErr)
    return NextResponse.json(
      { error: 'Kon intake-vraag niet opslaan' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    cleared: !!body.clear,
    requested_at: now,
  })
}
