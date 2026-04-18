import { getAuthFast } from '@/lib/auth-fast'
import { fetchCoachWorkoutEdit } from '@/lib/coach-workout-edit-data'
import { WorkoutEditView } from '@/components/coach/WorkoutEditView'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Coach · Workout-editor (v3 Orion).
 * Edit a single program template day's exercise prescriptions.
 */
export default async function CoachWorkoutEditPage({
  params,
}: {
  params: Promise<{ id: string; dayId: string }>
}) {
  const { id, dayId } = await params
  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchCoachWorkoutEdit(id, dayId)
  if (!data) notFound()

  return <WorkoutEditView data={data} />
}
