import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/coach-debug-sessions?clientId=<uuid>&days=7
 *
 * Coach-only diagnostisch endpoint. Geeft de volledige workout_sessions-rij
 * (inclusief NULL completed_at) voor een client over de laatste N dagen terug,
 * plus de actieve program-schedule en alle template_day-names.
 *
 * Bedoeld om live data-loss te debuggen wanneer een client "X workout gedaan"
 * meldt maar coach 'm nergens ziet — je kan direct zien of completed_at null
 * is, of template_day_id mismatcht, of client_program_id van een inactief
 * programma is.
 *
 * Kan weg zodra we structureel logging + monitoring rond workout-finish hebben.
 */
export async function GET(request: NextRequest) {
  try {
    // Coach-only guard
    const userSupabase = await createServerSupabaseClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')
    const clientEmail = url.searchParams.get('clientEmail')
    const clientName = url.searchParams.get('clientName')
    const days = Math.min(Math.max(Number(url.searchParams.get('days') || '7'), 1), 30)

    if (!clientId && !clientEmail && !clientName) {
      return NextResponse.json(
        { error: 'clientId, clientEmail of clientName required' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // Resolve client → profile
    let clientProfile: { id: string; full_name: string | null; email?: string | null } | null = null
    if (clientId) {
      const { data } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('id', clientId)
        .single()
      clientProfile = data || null
    } else if (clientEmail) {
      // auth.users heeft email; profiles heeft id koppelt
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 })
      const match = authUsers?.users?.find(
        (u) => u.email?.toLowerCase() === clientEmail.toLowerCase(),
      )
      if (match) {
        const { data } = await admin
          .from('profiles')
          .select('id, full_name')
          .eq('id', match.id)
          .single()
        if (data) clientProfile = { ...data, email: match.email || null }
      }
    } else if (clientName) {
      const { data } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'client')
        .ilike('full_name', `%${clientName}%`)
        .limit(5)
      if (data && data.length === 1) {
        clientProfile = data[0]
      } else if (data && data.length > 1) {
        return NextResponse.json(
          {
            error: `Multiple clients match "${clientName}"`,
            matches: data.map((c) => ({ id: c.id, name: c.full_name })),
          },
          { status: 400 },
        )
      }
    }

    if (!clientProfile) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Time window
    const now = new Date()
    const since = new Date(now.getTime() - days * 86400000)

    // Active + inactive programs, so we can tag which rows belong where
    const { data: programs } = await admin
      .from('client_programs')
      .select('id, name, is_active, schedule, template_id, start_date, end_date')
      .eq('client_id', clientProfile.id)
      .order('is_active', { ascending: false })

    const activeProgram = programs?.find((p) => p.is_active) || null

    // All template days across every program this client has (so we can name-map
    // sessions even if they reference an old program's template day).
    const templateIds = Array.from(
      new Set((programs || []).map((p) => p.template_id).filter(Boolean)),
    )
    const { data: templateDays } = templateIds.length
      ? await admin
          .from('program_template_days')
          .select('id, name, template_id')
          .in('template_id', templateIds)
      : { data: [] }

    const dayNameMap = new Map<string, string>(
      (templateDays || []).map((d) => [d.id, d.name]),
    )
    const dayTemplateMap = new Map<string, string>(
      (templateDays || []).map((d) => [d.id, d.template_id]),
    )

    // Sessions in window — EVERYTHING, including unfinished ones
    const { data: sessions } = await admin
      .from('workout_sessions')
      .select(
        'id, started_at, completed_at, template_day_id, client_program_id, duration_seconds, mood_rating, difficulty_rating, feedback_text, coach_seen, notes',
      )
      .eq('client_id', clientProfile.id)
      .gte('started_at', since.toISOString())
      .order('started_at', { ascending: false })

    // For each session, count sets
    const sessionIds = (sessions || []).map((s) => s.id)
    const { data: setsRows } = sessionIds.length
      ? await admin
          .from('workout_sets')
          .select('workout_session_id, completed')
          .in('workout_session_id', sessionIds)
      : { data: [] }

    const setCounts = new Map<string, { total: number; completed: number }>()
    for (const row of setsRows || []) {
      const cur = setCounts.get(row.workout_session_id) || { total: 0, completed: 0 }
      cur.total += 1
      if (row.completed) cur.completed += 1
      setCounts.set(row.workout_session_id, cur)
    }

    const enriched = (sessions || []).map((s) => {
      const sets = setCounts.get(s.id) || { total: 0, completed: 0 }
      const tmplName = s.template_day_id ? dayNameMap.get(s.template_day_id) || null : null
      const tmplProgram = s.template_day_id ? dayTemplateMap.get(s.template_day_id) || null : null
      const belongsToActiveProgram =
        activeProgram &&
        s.client_program_id === activeProgram.id &&
        (!tmplProgram || tmplProgram === activeProgram.template_id)
      return {
        id: s.id,
        started_at: s.started_at,
        completed_at: s.completed_at,
        is_completed: !!s.completed_at,
        template_day_id: s.template_day_id,
        template_day_name: tmplName,
        client_program_id: s.client_program_id,
        belongs_to_active_program: !!belongsToActiveProgram,
        sets_total: sets.total,
        sets_completed: sets.completed,
        duration_seconds: s.duration_seconds,
        duration_minutes: s.duration_seconds ? Math.round(s.duration_seconds / 60) : null,
        mood_rating: s.mood_rating,
        difficulty_rating: s.difficulty_rating,
        feedback_text: s.feedback_text,
        coach_seen: s.coach_seen,
        notes: s.notes,
      }
    })

    return NextResponse.json({
      client: clientProfile,
      activeProgram,
      allPrograms: programs || [],
      templateDays: (templateDays || []).map((d) => ({
        id: d.id,
        name: d.name,
        template_id: d.template_id,
      })),
      window: {
        days,
        sinceIso: since.toISOString(),
        nowIso: now.toISOString(),
      },
      sessions: enriched,
      summary: {
        total: enriched.length,
        completed: enriched.filter((s) => s.is_completed).length,
        unfinished: enriched.filter((s) => !s.is_completed).length,
        withZeroSets: enriched.filter((s) => s.sets_total === 0).length,
        notBelongingToActiveProgram: enriched.filter((s) => !s.belongs_to_active_program)
          .length,
      },
    })
  } catch (error) {
    console.error('[coach-debug-sessions] error:', error)
    return NextResponse.json(
      { error: 'Internal error', details: String(error) },
      { status: 500 },
    )
  }
}
