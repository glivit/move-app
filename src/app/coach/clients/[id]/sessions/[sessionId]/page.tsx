import { getAuthFast } from '@/lib/auth-fast'
import { fetchSessionDetail } from '@/lib/coach-session-detail'
import { SessionDetailView } from '@/components/coach/SessionDetailView'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string; sessionId: string }>
}

/**
 * Coach · Sessie-detail (v3 Orion).
 * Server Component: laadt één workout-sessie met sets + vergelijking.
 */
export default async function ClientSessionDetailPage({ params }: Props) {
  const { id, sessionId } = await params

  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchSessionDetail(sessionId, id)
  if (!data) notFound()

  return <SessionDetailView data={data} coachId={user.id} />
}
