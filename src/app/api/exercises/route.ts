import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/exercises
 * Create a new exercise (coach only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    let adminDb
    try {
      adminDb = createAdminClient()
    } catch {
      adminDb = supabase
    }

    // Verify coach role
    const { data: profile } = await adminDb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Geen toestemming' }, { status: 403 })
    }

    const body = await request.json()

    const { data, error } = await adminDb
      .from('exercises')
      .insert([{
        name: body.name,
        name_nl: body.name_nl || null,
        body_part: body.body_part,
        target_muscle: body.target_muscle,
        equipment: body.equipment,
        category: body.category || null,
        coach_tips: body.coach_tips || null,
        coach_notes: body.coach_notes || null,
        instructions: body.instructions || null,
        gif_url: body.gif_url || null,
        is_custom: true,
        is_visible: true,
        sort_order: 9999,
      }])
      .select()
      .single()

    if (error) {
      console.error('Exercise insert error:', error)
      return NextResponse.json({ error: 'Fout bij aanmaken oefening' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
