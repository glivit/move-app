import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/scheduling/availability
 * Get coach availability slots (for coach: own slots, for client: available booking slots)
 */
export async function GET(request: NextRequest) {
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

    if (profile?.role === 'coach') {
      // Coach sees their own availability settings
      const { data: slots } = await adminDb
        .from('coach_availability')
        .select('*')
        .eq('coach_id', user.id)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })

      const { data: blockedDates } = await adminDb
        .from('coach_blocked_dates')
        .select('*')
        .eq('coach_id', user.id)
        .gte('blocked_date', new Date().toISOString().split('T')[0])
        .order('blocked_date', { ascending: true })

      const response = NextResponse.json({ data: { slots: slots || [], blockedDates: blockedDates || [] } })
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
      return response
    }

    // Client: get available time slots for next 2 weeks
    const { data: coaches } = await adminDb
      .from('profiles')
      .select('id')
      .eq('role', 'coach')
      .limit(1)

    if (!coaches || coaches.length === 0) {
      const response = NextResponse.json({ data: { availableSlots: [] } })
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
      return response
    }

    const coachId = coaches[0].id

    const { data: availability } = await adminDb
      .from('coach_availability')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)

    const { data: blockedDates } = await adminDb
      .from('coach_blocked_dates')
      .select('blocked_date')
      .eq('coach_id', coachId)
      .gte('blocked_date', new Date().toISOString().split('T')[0])

    // Get already booked sessions for next 2 weeks
    const twoWeeksFromNow = new Date()
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

    const { data: bookedSessions } = await adminDb
      .from('video_sessions')
      .select('scheduled_at, duration_minutes')
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .lte('scheduled_at', twoWeeksFromNow.toISOString())

    // Generate available slots for next 14 days
    const blockedSet = new Set((blockedDates || []).map(d => d.blocked_date))
    const bookedTimes = (bookedSessions || []).map(s => ({
      start: new Date(s.scheduled_at).getTime(),
      end: new Date(s.scheduled_at).getTime() + (s.duration_minutes || 30) * 60000,
    }))

    const availableSlots: { date: string; time: string; datetime: string }[] = []
    const now = new Date()
    // Start from tomorrow
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + 1)
    startDate.setHours(0, 0, 0, 0)

    for (let d = 0; d < 14; d++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + d)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()

      if (blockedSet.has(dateStr)) continue

      const daySlots = (availability || []).filter(a => a.day_of_week === dayOfWeek)

      for (const slot of daySlots) {
        const [startH, startM] = slot.start_time.split(':').map(Number)
        const [endH, endM] = slot.end_time.split(':').map(Number)
        const duration = slot.slot_duration_minutes || 30

        let currentH = startH
        let currentM = startM

        while (currentH * 60 + currentM + duration <= endH * 60 + endM) {
          const slotDate = new Date(date)
          slotDate.setHours(currentH, currentM, 0, 0)

          // Check if not already booked
          const slotStart = slotDate.getTime()
          const slotEnd = slotStart + duration * 60000
          const isBooked = bookedTimes.some(b =>
            (slotStart >= b.start && slotStart < b.end) ||
            (slotEnd > b.start && slotEnd <= b.end)
          )

          if (!isBooked && slotDate > now) {
            availableSlots.push({
              date: dateStr,
              time: `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`,
              datetime: slotDate.toISOString(),
            })
          }

          currentM += duration
          while (currentM >= 60) {
            currentM -= 60
            currentH++
          }
        }
      }
    }

    const response = NextResponse.json({ data: { availableSlots } })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Availability GET error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}

/**
 * POST /api/scheduling/availability
 * Coach: set availability slots
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

    if (body.action === 'set_slots') {
      // Replace all slots with new ones
      await adminDb
        .from('coach_availability')
        .update({ is_active: false })
        .eq('coach_id', user.id)

      if (body.slots && body.slots.length > 0) {
        const { error } = await adminDb
          .from('coach_availability')
          .insert(body.slots.map((slot: any) => ({
            coach_id: user.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            slot_duration_minutes: slot.slot_duration_minutes || 30,
            is_active: true,
          })))

        if (error) {
          console.error('Availability insert error:', error)
          return NextResponse.json({ error: 'Fout bij opslaan' }, { status: 500 })
        }
      }

      return NextResponse.json({ data: { saved: true } })
    }

    if (body.action === 'block_date') {
      const { error } = await adminDb
        .from('coach_blocked_dates')
        .insert([{
          coach_id: user.id,
          blocked_date: body.date,
          reason: body.reason || null,
        }])

      if (error) {
        console.error('Block date error:', error)
        return NextResponse.json({ error: 'Fout bij blokkeren' }, { status: 500 })
      }

      return NextResponse.json({ data: { blocked: true } })
    }

    if (body.action === 'unblock_date') {
      await adminDb
        .from('coach_blocked_dates')
        .delete()
        .eq('coach_id', user.id)
        .eq('blocked_date', body.date)

      return NextResponse.json({ data: { unblocked: true } })
    }

    return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 })
  } catch (error) {
    console.error('Availability POST error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
