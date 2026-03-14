export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ClientsListView } from './ClientsListView'
import type { Profile } from '@/types'

export default async function ClientsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, package, start_date, avatar_url')
    .eq('role', 'client')
    .order('full_name')

  return <ClientsListView clients={(clients || []) as Profile[]} />
}
