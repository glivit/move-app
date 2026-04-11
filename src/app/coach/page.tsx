import { getAuthFast } from '@/lib/auth-fast'
import { fetchCoachWeekOverview } from '@/lib/coach-week-data'
import { WeekOverviewClient } from '@/components/coach/WeekOverviewClient'

export const dynamic = 'force-dynamic'

/**
 * Coach home — mobile-first week overview.
 * Server Component fetches data on the server so the initial HTML already
 * contains the client list + week strips.
 */
export default async function CoachDashboard() {
  let initialData = null
  let coachFirstName = 'Coach'
  let coachId: string | null = null

  try {
    const { user, supabase } = await getAuthFast()
    if (user) {
      // Role check + first name in one query
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'coach') {
        coachId = user.id
        coachFirstName = (profile.full_name || '').split(' ')[0] || 'Coach'
        initialData = await fetchCoachWeekOverview(user.id)
      }
    }
  } catch {
    // Fall through — client component handles refetch
  }

  return (
    <WeekOverviewClient
      initialData={initialData}
      coachFirstName={coachFirstName}
      coachId={coachId}
    />
  )
}
