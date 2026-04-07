import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/exercises/create
 * Creates a custom exercise using admin client (bypasses RLS).
 * Clients can only create exercises with is_custom = true.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Auth
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (error) console.error('[exercises/create] Token auth error:', error.message)
      if (user) userId = user.id
    }

    if (!userId) {
      try {
        const { createServerSupabaseClient } = await import('@/lib/supabase-server')
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch { /* ignore */ }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name_nl, body_part, target_muscle, equipment, category } = body

    if (!name_nl?.trim() || !body_part || !target_muscle?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: inserted, error } = await admin
      .from('exercises')
      .insert({
        name: name_nl.trim(),
        name_nl: name_nl.trim(),
        body_part,
        target_muscle: target_muscle.trim(),
        equipment: equipment || 'body weight',
        is_custom: true,
        is_visible: true,
        category: category || 'strength',
      })
      .select('id, name, name_nl, body_part, target_muscle, equipment, gif_url, video_url, instructions, coach_tips, category')
      .single()

    if (error) {
      console.error('[exercises/create] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, exercise: inserted })
  } catch (err: any) {
    console.error('[exercises/create] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
