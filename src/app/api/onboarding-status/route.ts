import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

/**
 * GET /api/onboarding-status
 * Returns a checklist of onboarding items and their completion status
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ items: [] })
    }

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    // Fetch profile data
    const { data: profile } = await adminDb
      .from('profiles')
      .select('full_name, avatar_url, weight_kg, height_cm, primary_goal, training_experience, onboarding_completed')
      .eq('id', user.id)
      .single()

    // If onboarding fully completed or no profile, skip
    if (!profile || profile.onboarding_completed) {
      return NextResponse.json({ items: [] })
    }

    // Check for push subscription
    const { count: pushCount } = await adminDb
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Check for health info
    const { data: healthData } = await adminDb
      .from('client_health_data')
      .select('id')
      .eq('client_id', user.id)
      .limit(1)

    // Check for habits
    const { count: habitsCount } = await adminDb
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const items = [
      {
        id: 'profile-photo',
        label: 'Profielfoto toevoegen',
        href: '/client/profile/edit',
        completed: !!profile.avatar_url,
      },
      {
        id: 'goals',
        label: 'Doelen instellen',
        href: '/client/profile/goals',
        completed: !!profile.primary_goal,
      },
      {
        id: 'measurements',
        label: 'Startmetingen invullen',
        href: '/client/profile/edit',
        completed: !!profile.weight_kg && !!profile.height_cm,
      },
      {
        id: 'health',
        label: 'Gezondheidsinformatie',
        href: '/client/profile/health',
        completed: !!(healthData && healthData.length > 0),
      },
      {
        id: 'notifications',
        label: 'Notificaties instellen',
        href: '/client/profile/notifications',
        completed: (pushCount || 0) > 0,
      },
      {
        id: 'habits',
        label: 'Dagelijkse gewoontes aanmaken',
        href: '/client/health',
        completed: (habitsCount || 0) > 0,
      },
    ]

    const response = NextResponse.json({ items })
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
    return response
  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json({ items: [] })
  }
}
