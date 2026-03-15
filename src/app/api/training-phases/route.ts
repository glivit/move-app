import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/training-phases?client_program_id=xxx
 * Get training phases for a program
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    const programId = request.nextUrl.searchParams.get('client_program_id')
    if (!programId) {
      return NextResponse.json({ error: 'client_program_id vereist' }, { status: 400 })
    }

    const { data: phases } = await adminDb
      .from('training_phases')
      .select('*')
      .eq('client_program_id', programId)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ data: { phases: phases || [] } })
  } catch (error) {
    console.error('Training phases GET error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}

/**
 * POST /api/training-phases
 * Create or update training phases for a program (coach only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    const { data: profile } = await adminDb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Geen toestemming' }, { status: 403 })
    }

    const body = await request.json()

    if (body.action === 'set_phases') {
      const { client_program_id, phases } = body

      // Delete existing phases for this program
      await adminDb
        .from('training_phases')
        .delete()
        .eq('client_program_id', client_program_id)

      if (phases && phases.length > 0) {
        const { error } = await adminDb
          .from('training_phases')
          .insert(phases.map((p: any, i: number) => ({
            client_program_id,
            name: p.name,
            phase_type: p.phase_type,
            week_start: p.week_start,
            week_end: p.week_end,
            intensity_pct: p.intensity_pct || null,
            volume_modifier: p.volume_modifier || 1.0,
            notes: p.notes || null,
            sort_order: i,
          })))

        if (error) {
          console.error('Training phases insert error:', error)
          return NextResponse.json({ error: 'Fout bij opslaan' }, { status: 500 })
        }
      }

      return NextResponse.json({ data: { saved: true } })
    }

    return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 })
  } catch (error) {
    console.error('Training phases POST error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
