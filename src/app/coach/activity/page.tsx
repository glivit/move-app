import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import {
  Dumbbell, CheckCircle2, MessageSquare, AlertTriangle,
  Trophy, ChevronRight, Clock, Activity
} from 'lucide-react'

function timeSince(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'zojuist'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m geleden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d geleden`
  return new Date(date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}

const moodEmojis: Record<number, string> = { 1: '😫', 2: '😐', 3: '😊', 4: '💪', 5: '🔥' }
const difficultyLabels: Record<number, string> = { 1: 'Te makkelijk', 2: 'Makkelijk', 3: 'Perfect', 4: 'Zwaar', 5: 'Te zwaar' }
const difficultyColors: Record<number, string> = { 1: 'text-[#5A7FB5]', 2: 'text-[#2FA65A]', 3: 'text-[#FDFDFE]', 4: 'text-[#D9A645]', 5: 'text-[#B55A4A]' }

export default async function CoachActivityFeedPage() {
  const supabase = await createServerSupabaseClient()

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  // Load workouts and check-ins in parallel
  // Use select('*') for workouts to avoid column-not-exist errors
  const [{ data: workouts, error: workoutsError }, { data: checkins }] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('*, profiles!workout_sessions_client_id_fkey(full_name), program_template_days(name)')
      .not('completed_at', 'is', null)
      .gte('completed_at', twoWeeksAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(50),
    supabase
      .from('checkins')
      .select('id, client_id, date, weight_kg, coach_reviewed, profiles!checkins_client_id_fkey(full_name)')
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(20),
  ])

  // Fallback: if FK join fails, try without join
  let workoutData = workouts
  if (workoutsError) {
    console.error('Activity workouts query error:', workoutsError.message)
    const { data: fallback } = await supabase
      .from('workout_sessions')
      .select('*')
      .not('completed_at', 'is', null)
      .gte('completed_at', twoWeeksAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(50)
    workoutData = fallback
  }

  // Combine into a unified activity feed
  type ActivityItem = {
    id: string
    type: 'workout' | 'checkin'
    clientId: string
    clientName: string
    timestamp: string
    data: any
    reviewed: boolean
  }

  const activities: ActivityItem[] = []

  // Add workouts
  for (const w of workoutData || []) {
    const rawProfile = (w as any).profiles
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
    const rawDay = (w as any).program_template_days
    const dayInfo = Array.isArray(rawDay) ? rawDay[0] : rawDay

    activities.push({
      id: `w-${w.id}`,
      type: 'workout',
      clientId: w.client_id,
      clientName: profile?.full_name || 'Client',
      timestamp: w.completed_at!,
      reviewed: (w as any).coach_seen === true,
      data: {
        sessionId: w.id,
        dayName: dayInfo?.name || 'Training',
        durationSeconds: (w as any).duration_seconds,
        moodRating: (w as any).mood_rating,
        difficultyRating: (w as any).difficulty_rating,
        feedbackText: (w as any).feedback_text,
        painReported: (w as any).pain_reported,
      },
    })
  }

  // Add check-ins
  for (const c of checkins || []) {
    const rawProfile = (c as any).profiles
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
    activities.push({
      id: `c-${c.id}`,
      type: 'checkin',
      clientId: c.client_id,
      clientName: profile?.full_name || 'Client',
      timestamp: c.date,
      reviewed: c.coach_reviewed || false,
      data: {
        checkinId: c.id,
        weightKg: c.weight_kg,
      },
    })
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const unseenCount = activities.filter(a => !a.reviewed).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-[40px] font-semibold text-[#FDFDFE] tracking-[-0.03em] leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
          Activiteit
        </h1>
        <p className="mt-2.5 text-[15px] text-[#E6E8E7] tracking-[-0.01em]">
          {unseenCount > 0
            ? `${unseenCount} nieuwe activiteit${unseenCount !== 1 ? 'en' : ''} in de afgelopen 2 weken`
            : 'Alle activiteit is bijgewerkt'
          }
        </p>
      </div>

      {/* Activity Feed */}
      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => {
            if (activity.type === 'workout') {
              const d = activity.data
              const durationMin = d.durationSeconds ? Math.round(d.durationSeconds / 60) : null
              const firstName = activity.clientName.split(' ')[0]

              return (
                <Link
                  key={activity.id}
                  href={`/coach/clients/${activity.clientId}/workout/${d.sessionId}`}
                  className={`block rounded-2xl border overflow-hidden transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
                    !activity.reviewed
                      ? 'bg-[#A6ADA7] border-[#C0FC01]/20 shadow-[0_1px_3px_rgba(212,106,58,0.08)]'
                      : 'bg-[#A6ADA7] border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      !activity.reviewed ? 'bg-[var(--color-pop-light)]' : 'bg-[#A6ADA7]'
                    }`}>
                      <Dumbbell strokeWidth={1.5} className={`w-5 h-5 ${!activity.reviewed ? 'text-[var(--color-pop)]' : 'text-[#E6E8E7]'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#FDFDFE]">{firstName}</p>
                        <span className="text-[13px] text-[#E6E8E7]">heeft {d.dayName} voltooid</span>
                        {!activity.reviewed && (
                          <span className="w-2 h-2 rounded-full bg-[var(--color-pop)] flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-[#E6E8E7]">
                        {durationMin && <span>{durationMin} min</span>}
                        {d.difficultyRating && (
                          <span className={`font-medium ${difficultyColors[d.difficultyRating] || ''}`}>
                            {difficultyLabels[d.difficultyRating]}
                          </span>
                        )}
                        {d.moodRating && <span>{moodEmojis[d.moodRating]}</span>}
                        {d.painReported && (
                          <span className="flex items-center gap-1 text-[#B55A4A] font-medium">
                            <AlertTriangle strokeWidth={1.5} className="w-3 h-3" /> Pijn
                          </span>
                        )}
                      </div>
                      {d.feedbackText && (
                        <p className="text-[13px] text-[#E6E8E7] mt-1.5 truncate italic">
                          &ldquo;{d.feedbackText}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Time + Chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[12px] text-[#989F99]">{timeSince(activity.timestamp)}</span>
                      <ChevronRight className="w-4 h-4 text-[#989F99]" strokeWidth={1.5} />
                    </div>
                  </div>
                </Link>
              )
            }

            if (activity.type === 'checkin') {
              const d = activity.data
              const firstName = activity.clientName.split(' ')[0]

              return (
                <Link
                  key={activity.id}
                  href={`/coach/check-ins/${d.checkinId}`}
                  className={`block rounded-2xl border overflow-hidden transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
                    !activity.reviewed
                      ? 'bg-[#A6ADA7] border-[#D9A645]/20 shadow-[0_1px_3px_rgba(196,125,21,0.08)]'
                      : 'bg-[#A6ADA7] border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      !activity.reviewed ? 'bg-[#D9A645]/10' : 'bg-[#A6ADA7]'
                    }`}>
                      <CheckCircle2 strokeWidth={1.5} className={`w-5 h-5 ${!activity.reviewed ? 'text-[#D9A645]' : 'text-[#E6E8E7]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#FDFDFE]">{firstName}</p>
                        <span className="text-[13px] text-[#E6E8E7]">heeft een check-in ingediend</span>
                        {!activity.reviewed && (
                          <span className="w-2 h-2 rounded-full bg-[#D9A645] flex-shrink-0" />
                        )}
                      </div>
                      {d.weightKg && (
                        <p className="text-[12px] text-[#E6E8E7] mt-1">Gewicht: {d.weightKg} kg</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[12px] text-[#989F99]">{timeSince(activity.timestamp)}</span>
                      <ChevronRight className="w-4 h-4 text-[#989F99]" strokeWidth={1.5} />
                    </div>
                  </div>
                </Link>
              )
            }

            return null
          })}
        </div>
      ) : (
        <div className="card-elevated p-16 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2FA65A]/10 to-[#2FA65A]/5 flex items-center justify-center mb-5">
            <Activity className="w-7 h-7 text-[#2FA65A]" strokeWidth={1.5} />
          </div>
          <h3 className="text-[18px] font-semibold text-[#FDFDFE] mb-1.5">Geen activiteit</h3>
          <p className="text-[14px] text-[#E6E8E7]">Activiteiten van je cliënten verschijnen hier.</p>
        </div>
      )}
    </div>
  )
}
