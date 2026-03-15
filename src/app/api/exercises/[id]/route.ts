import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/exercises/[id]
 * Update an exercise (coach only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params
    const body = await request.json()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (body.name_nl !== undefined) updateData.name_nl = body.name_nl || null
    if (body.coach_tips !== undefined) updateData.coach_tips = body.coach_tips || null
    if (body.coach_notes !== undefined) updateData.coach_notes = body.coach_notes || null
    if (body.instructions !== undefined) updateData.instructions = body.instructions || null
    if (body.is_visible !== undefined) updateData.is_visible = body.is_visible
    if (body.category !== undefined) updateData.category = body.category || null

    const { data, error } = await adminDb
      .from('exercises')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Exercise update error:', error)
      return NextResponse.json({ error: 'Fout bij opslaan oefening' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
