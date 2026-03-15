import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/accountability/coach
 * Get accountability overview for all clients (coach only)
 * Query params: ?date=2026-03-15&days=7
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    // Verify coach role
    const { data: profile } = await adminDb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Geen toestemming' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get all accountability logs for the period
    const { data: logs, error } = await adminDb
      .from('accountability_logs')
      .select('*, profiles!accountability_logs_client_id_fkey(full_name, email)')
      .gte('date', startDateStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching accountability logs:', error)
      return NextResponse.json({ error: 'Fout bij ophalen' }, { status: 500 })
    }

    // Build summary per client
    const clientSummary: Record<string, {
      client_id: string
      full_name: string
      total_days: number
      workouts_missed: number
      nutrition_missed: number
      unresponded: number
      latest_reasons: Array<{
        date: string
        workout_completed: boolean
        nutrition_logged: boolean
        workout_reason: string | null
        nutrition_reason: string | null
        responded: boolean
        responded_at: string | null
      }>
    }> = {}

    for (const log of (logs || [])) {
      const clientId = log.client_id
      if (!clientSummary[clientId]) {
        const clientProfile = log.profiles as any
        clientSummary[clientId] = {
          client_id: clientId,
          full_name: clientProfile?.full_name || 'Onbekend',
          total_days: 0,
          workouts_missed: 0,
          nutrition_missed: 0,
          unresponded: 0,
          latest_reasons: [],
        }
      }

      const s = clientSummary[clientId]
      s.total_days++
      if (!log.workout_completed) s.workouts_missed++
      if (!log.nutrition_logged) s.nutrition_missed++
      if (!log.responded) s.unresponded++

      if (s.latest_reasons.length < 10) {
        s.latest_reasons.push({
          date: log.date,
          workout_completed: log.workout_completed,
          nutrition_logged: log.nutrition_logged,
          workout_reason: log.workout_reason,
          nutrition_reason: log.nutrition_reason,
          responded: log.responded,
          responded_at: log.responded_at,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: logs || [],
        summary: Object.values(clientSummary).sort((a, b) =>
          b.unresponded - a.unresponded || b.workouts_missed - a.workouts_missed
        ),
      },
    })
  } catch (error) {
    console.error('Error in coach accountability:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
