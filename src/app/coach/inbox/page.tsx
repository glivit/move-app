import { getAuthFast } from '@/lib/auth-fast'
import { fetchCoachInbox } from '@/lib/coach-inbox-data'
import { InboxView } from '@/components/coach/InboxView'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Coach · Inbox (v3 Orion).
 * Unified stream: vragen + check-ins + sessie-feedback + systeem-alerts + berichten.
 */
export default async function CoachInboxPage() {
  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const data = await fetchCoachInbox(user.id)

  return <InboxView data={data} coachId={user.id} />
}
