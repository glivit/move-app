import { createServerSupabaseClient } from '@/lib/supabase-server'
import BillingView from './BillingView'
import type { ClientSubscription } from './BillingView'

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, package, start_date, subscription_status')
    .eq('role', 'client')
    .order('full_name')

  return <BillingView initialClients={(data || []) as ClientSubscription[]} />
}
