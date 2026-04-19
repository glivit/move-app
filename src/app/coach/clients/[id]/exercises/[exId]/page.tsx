import { getAuthFast } from '@/lib/auth-fast'
import { fetchExerciseProgress } from '@/lib/coach-exercise-progress'
import { ExerciseProgressView } from '@/components/coach/ExerciseProgressView'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string; exId: string }>
}

/**
 * Coach · Klant > Oefening-voortgang (v3 Orion).
 *
 * Shows per-klant progressie voor 1 oefening: series (top-set per sessie),
 * PR-historie, laatste 6 sessies mét alle sets, best-ever tegenover nu.
 */
export default async function ClientExerciseProgressPage({ params }: Props) {
  const { id, exId } = await params

  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchExerciseProgress(id, exId)
  if (!data) notFound()

  return <ExerciseProgressView data={data} clientId={id} />
}
