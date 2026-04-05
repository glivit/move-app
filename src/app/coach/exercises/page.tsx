import { createServerSupabaseClient } from '@/lib/supabase-server'
import ExercisesView from './ExercisesView'
import type { Exercise } from './ExercisesView'

export default async function ExercisesPage() {
  const supabase = await createServerSupabaseClient()

  const { data, count } = await supabase
    .from('exercises')
    .select('id, name, name_nl, body_part, target_muscle, equipment, gif_url', {
      count: 'exact',
    })
    .eq('is_visible', true)
    .order('name', { ascending: true })
    .limit(50)

  return (
    <ExercisesView
      initialExercises={(data || []) as Exercise[]}
      initialCount={count || 0}
    />
  )
}
