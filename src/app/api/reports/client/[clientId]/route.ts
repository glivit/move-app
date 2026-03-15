import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ clientId: string }>
}

/**
 * GET /api/reports/client/[clientId]
 * Generate a PDF progress report for a client (coach only)
 * Returns JSON data that the frontend uses to generate the PDF
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Geen toestemming' }, { status: 403 })
    }

    const { clientId } = await params

    // Get client profile
    const { data: client } = await adminDb
      .from('profiles')
      .select('id, full_name, email, created_at, goals, package_type')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Cliënt niet gevonden' }, { status: 404 })
    }

    // Get check-ins (body measurements & photos)
    const { data: checkins } = await adminDb
      .from('checkins')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: true })

    // Get workout sessions
    const { data: sessions } = await adminDb
      .from('workout_sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('started_at', { ascending: true })

    // Get workout sets if sessions exist
    let sets: any[] = []
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id)
      const { data: setsData } = await adminDb
        .from('workout_sets')
        .select('*')
        .in('workout_session_id', sessionIds)

      if (setsData) sets = setsData
    }

    // Get exercises for context
    const { data: exercises } = await adminDb
      .from('exercises')
      .select('id, name, name_nl, body_part, target_muscle')

    // Get personal records
    const { data: prs } = await adminDb
      .from('personal_records')
      .select('*, exercises(id, name, name_nl)')
      .eq('client_id', clientId)
      .order('achieved_at', { ascending: false })
      .limit(10)

    // Get accountability logs
    const { data: accountability } = await adminDb
      .from('accountability_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(30)

    // Compute summary stats
    const firstCheckin = checkins?.[0]
    const lastCheckin = checkins?.[checkins.length - 1]

    const completedSessions = sessions?.filter(s => s.completed_at) || []
    const totalVolume = sets
      .filter(s => s.completed && s.weight_kg && s.actual_reps)
      .reduce((sum, s) => sum + (s.weight_kg * s.actual_reps), 0)

    // Volume per body part
    const exerciseMap = new Map((exercises || []).map(e => [e.id, e]))
    const volumeByGroup: Record<string, number> = {}
    sets
      .filter(s => s.completed && s.weight_kg && s.actual_reps)
      .forEach(s => {
        const ex = exerciseMap.get(s.exercise_id)
        const group = ex?.body_part || 'overig'
        volumeByGroup[group] = (volumeByGroup[group] || 0) + (s.weight_kg * s.actual_reps)
      })

    // Accountability compliance
    const respondedLogs = accountability?.filter(l => l.responded) || []
    const workoutDone = respondedLogs.filter(l => l.workout_completed).length
    const nutritionDone = respondedLogs.filter(l => l.nutrition_logged).length

    const report = {
      generatedAt: new Date().toISOString(),
      coachName: profile.full_name || 'Coach',
      client: {
        name: client.full_name || 'Onbekend',
        email: client.email,
        memberSince: client.created_at,
        goals: client.goals,
        package: client.package_type,
      },
      body: {
        firstCheckin: firstCheckin ? {
          date: firstCheckin.date,
          weight: firstCheckin.weight_kg,
          bodyFat: firstCheckin.body_fat_pct,
          muscle: firstCheckin.muscle_mass_kg,
        } : null,
        lastCheckin: lastCheckin ? {
          date: lastCheckin.date,
          weight: lastCheckin.weight_kg,
          bodyFat: lastCheckin.body_fat_pct,
          muscle: lastCheckin.muscle_mass_kg,
        } : null,
        totalCheckins: checkins?.length || 0,
      },
      training: {
        totalSessions: completedSessions.length,
        totalVolume: Math.round(totalVolume),
        totalSets: sets.filter(s => s.completed).length,
        averageDuration: completedSessions.length > 0
          ? Math.round(completedSessions.reduce((s, se) => s + (se.duration_seconds || 0), 0) / completedSessions.length / 60)
          : 0,
        volumeByGroup,
        personalRecords: (prs || []).map(pr => ({
          exercise: (pr as any).exercises?.name_nl || (pr as any).exercises?.name || 'Oefening',
          type: pr.record_type,
          value: pr.value,
          date: pr.achieved_at,
        })),
      },
      accountability: {
        totalLogs: accountability?.length || 0,
        responded: respondedLogs.length,
        workoutCompliance: respondedLogs.length > 0 ? Math.round((workoutDone / respondedLogs.length) * 100) : 0,
        nutritionCompliance: respondedLogs.length > 0 ? Math.round((nutritionDone / respondedLogs.length) * 100) : 0,
      },
    }

    return NextResponse.json({ data: report })
  } catch (error) {
    console.error('Report API error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
