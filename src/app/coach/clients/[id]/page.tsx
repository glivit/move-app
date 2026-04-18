import { getAuthFast } from '@/lib/auth-fast'
import { fetchClientWeekTimeline } from '@/lib/coach-client-week-data'
import { ClientDetailView } from '@/components/coach/ClientDetailView'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Coach · Klant-detail (v3 Orion).
 * Server Component: laadt de volledige timeline en rendert
 * het 4-tabs mobile-first overzicht (Overzicht/Programma/Voeding/Voortgang).
 */
export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params

  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchClientWeekTimeline(id, user.id, 0)
  if (!data) notFound()

  return <ClientDetailView data={data} coachId={user.id} />
}
