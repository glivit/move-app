import { getAuthFast } from '@/lib/auth-fast'
import { fetchCoachStudio } from '@/lib/coach-studio-data'
import { StudioView } from '@/components/coach/StudioView'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Coach · Studio (v3 Orion).
 * Library hub — templates, exercises, coaching-stats, account.
 */
export default async function CoachStudioPage() {
  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchCoachStudio(user.id)

  return <StudioView data={data} coachId={user.id} />
}
