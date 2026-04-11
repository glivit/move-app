import { getAuthFast } from '@/lib/auth-fast'
import { fetchClientWeekTimeline } from '@/lib/coach-client-week-data'
import { ClientWeekTimelineView } from '@/components/coach/ClientWeekTimeline'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ offset?: string }>
}

export default async function ClientWeekPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams])

  const rawOffset = Number(sp.offset)
  const weekOffset = Number.isFinite(rawOffset) && rawOffset <= 0 ? rawOffset : 0

  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchClientWeekTimeline(id, user.id, weekOffset)
  if (!data) notFound()

  return <ClientWeekTimelineView data={data} weekOffset={weekOffset} coachId={user.id} />
}
