/**
 * Milestone / Achievement engine for MŌVE
 *
 * Called after workout completion and periodically to check
 * if a client has unlocked new achievements.
 */
import { createAdminClient } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/push-server'

export interface MilestoneDef {
  type: string
  title: string
  description: string
  icon: string
  check: (stats: ClientStats) => boolean
}

export interface ClientStats {
  totalWorkouts: number
  totalPRs: number
  currentStreak: number
  longestStreak: number
  totalVolume: number
  daysOnProgram: number
  nutritionDaysLogged: number
  totalCheckins: number
}

// All possible milestones
const MILESTONES: MilestoneDef[] = [
  // Workout count
  { type: 'workout_1', title: 'Eerste stap', description: 'Eerste workout voltooid', icon: '🎯', check: s => s.totalWorkouts >= 1 },
  { type: 'workout_5', title: 'Op gang', description: '5 workouts voltooid', icon: '💪', check: s => s.totalWorkouts >= 5 },
  { type: 'workout_10', title: 'Dubbele cijfers', description: '10 workouts voltooid', icon: '🔥', check: s => s.totalWorkouts >= 10 },
  { type: 'workout_25', title: 'Kwart honderd', description: '25 workouts voltooid', icon: '⚡', check: s => s.totalWorkouts >= 25 },
  { type: 'workout_50', title: 'Halve eeuw', description: '50 workouts voltooid', icon: '🏆', check: s => s.totalWorkouts >= 50 },
  { type: 'workout_100', title: 'Centurion', description: '100 workouts voltooid', icon: '👑', check: s => s.totalWorkouts >= 100 },

  // Streaks
  { type: 'streak_3', title: 'Consistentie', description: '3 dagen op rij getraind', icon: '🔗', check: s => s.currentStreak >= 3 },
  { type: 'streak_7', title: 'Weekwarrior', description: '7 dagen op rij getraind', icon: '📅', check: s => s.currentStreak >= 7 },
  { type: 'streak_14', title: 'Twee weken staal', description: '14 dagen op rij getraind', icon: '🗓️', check: s => s.currentStreak >= 14 },
  { type: 'streak_30', title: 'Maand machine', description: '30 dagen op rij getraind', icon: '🤖', check: s => s.currentStreak >= 30 },

  // PRs
  { type: 'pr_1', title: 'Nieuw record', description: 'Eerste persoonlijk record', icon: '🏅', check: s => s.totalPRs >= 1 },
  { type: 'pr_5', title: 'Record breker', description: '5 persoonlijke records', icon: '📈', check: s => s.totalPRs >= 5 },
  { type: 'pr_10', title: 'PR machine', description: '10 persoonlijke records', icon: '🚀', check: s => s.totalPRs >= 10 },
  { type: 'pr_25', title: 'Onhoudbaar', description: '25 persoonlijke records', icon: '💎', check: s => s.totalPRs >= 25 },

  // Volume
  { type: 'volume_10k', title: '10 ton club', description: '10.000 kg totaal volume', icon: '🏋️', check: s => s.totalVolume >= 10000 },
  { type: 'volume_50k', title: '50 ton titan', description: '50.000 kg totaal volume', icon: '⚔️', check: s => s.totalVolume >= 50000 },
  { type: 'volume_100k', title: '100 ton legende', description: '100.000 kg totaal volume', icon: '🦁', check: s => s.totalVolume >= 100000 },

  // Nutrition
  { type: 'nutrition_7', title: 'Voeding op punt', description: '7 dagen voeding bijgehouden', icon: '🥗', check: s => s.nutritionDaysLogged >= 7 },
  { type: 'nutrition_30', title: 'Discipline', description: '30 dagen voeding bijgehouden', icon: '🍽️', check: s => s.nutritionDaysLogged >= 30 },

  // Longevity
  { type: 'days_30', title: 'Eerste maand', description: '30 dagen lid', icon: '📆', check: s => s.daysOnProgram >= 30 },
  { type: 'days_90', title: 'Kwartaal klaar', description: '90 dagen lid', icon: '🎖️', check: s => s.daysOnProgram >= 90 },

  // Check-ins
  { type: 'checkin_1', title: 'Eerste check-in', description: 'Eerste body check-in voltooid', icon: '📸', check: s => s.totalCheckins >= 1 },
  { type: 'checkin_6', title: 'Half jaar tracking', description: '6 check-ins voltooid', icon: '📊', check: s => s.totalCheckins >= 6 },
]

/**
 * Check and award milestones for a client.
 * Only awards new ones — skips already earned.
 */
export async function checkAndAwardMilestones(clientId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const newMilestones: string[] = []

  try {
    // Get already earned milestones
    const { data: existing } = await supabase
      .from('milestones')
      .select('type')
      .eq('client_id', clientId)

    const earnedTypes = new Set((existing || []).map((m: any) => m.type))

    // Get client stats
    const stats = await getClientStats(clientId)

    // Check each milestone
    for (const m of MILESTONES) {
      if (earnedTypes.has(m.type)) continue
      if (!m.check(stats)) continue

      // Award!
      const { error } = await supabase.from('milestones').insert({
        client_id: clientId,
        type: m.type,
        title: m.title,
        description: m.description,
        icon: m.icon,
      })

      if (!error) {
        newMilestones.push(m.type)

        // Push notification
        await sendPushToUser(clientId, {
          title: `${m.icon} ${m.title}`,
          body: m.description,
          url: '/client/progress',
          tag: `milestone-${m.type}`,
        })
      }
    }
  } catch (error) {
    console.error('[Milestones] Error:', error)
  }

  return newMilestones
}

async function getClientStats(clientId: string): Promise<ClientStats> {
  const supabase = createAdminClient()
  const now = new Date()

  const [
    { data: profile },
    { count: totalWorkouts },
    { count: totalPRs },
    { data: recentSessions },
    { count: totalCheckins },
    { data: nutritionDays },
    { data: volumeData },
  ] = await Promise.all([
    supabase.from('profiles').select('start_date, created_at').eq('id', clientId).single(),
    supabase.from('workout_sessions').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('completed_at', 'is', null),
    supabase.from('personal_records').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId),
    supabase.from('workout_sessions').select('started_at')
      .eq('client_id', clientId).not('completed_at', 'is', null)
      .order('started_at', { ascending: false }).limit(90),
    supabase.from('checkins').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId),
    supabase.from('nutrition_daily_summary').select('date')
      .eq('client_id', clientId).gt('meals_completed', 0),
    supabase.from('workout_sets').select('weight_kg, actual_reps')
      .eq('completed', true)
      .in('workout_session_id',
        (await supabase.from('workout_sessions').select('id').eq('client_id', clientId).not('completed_at', 'is', null)).data?.map((w: any) => w.id) || []
      ),
  ])

  // Calculate streak
  const activeDates = new Set(
    (recentSessions || []).map((s: any) => new Date(s.started_at).toISOString().split('T')[0])
  )
  let currentStreak = 0
  for (let i = 0; i < 90; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (activeDates.has(d.toISOString().split('T')[0])) currentStreak++
    else if (i === 0) continue
    else break
  }

  // Calculate volume
  const totalVolume = (volumeData || []).reduce((sum: number, s: any) =>
    sum + (s.weight_kg || 0) * (s.actual_reps || 0), 0)

  // Days on program
  const startDate = profile?.start_date || profile?.created_at
  const daysOnProgram = startDate
    ? Math.floor((now.getTime() - new Date(startDate).getTime()) / 86400000)
    : 0

  return {
    totalWorkouts: totalWorkouts || 0,
    totalPRs: totalPRs || 0,
    currentStreak,
    longestStreak: currentStreak, // simplified
    totalVolume,
    daysOnProgram,
    nutritionDaysLogged: nutritionDays?.length || 0,
    totalCheckins: totalCheckins || 0,
  }
}
