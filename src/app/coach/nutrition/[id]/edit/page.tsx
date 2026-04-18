import { getAuthFast } from '@/lib/auth-fast'
import { fetchCoachDietEdit } from '@/lib/coach-diet-edit-data'
import { DietEditView } from '@/components/coach/DietEditView'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Coach · Dieet-editor (v3 Orion).
 * Edit a single nutrition_plan — macro targets, meals, guidelines.
 */
export default async function CoachDietEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchCoachDietEdit(id)
  if (!data) notFound()

  return <DietEditView data={data} />
}
