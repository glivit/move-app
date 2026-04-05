import { createServerSupabaseClient } from '@/lib/supabase-server'
import BroadcastsView from './BroadcastsView'
import type { Client, Broadcast } from './BroadcastsView'

export default async function BroadcastsPage() {
  const supabase = await createServerSupabaseClient()

  const [clientsResult, broadcastsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('role', 'client')
      .order('full_name'),
    supabase
      .from('broadcasts')
      .select('id, title, content, created_at, target_clients')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const clients = (clientsResult.data || []) as Client[]
  const broadcasts: Broadcast[] = (broadcastsResult.data || []).map((b: any) => ({
    id: b.id,
    title: b.title,
    message: b.content,
    sentAt: b.created_at,
    recipientCount: Array.isArray(b.target_clients) ? b.target_clients.length : 0,
  }))

  return <BroadcastsView initialClients={clients} initialBroadcasts={broadcasts} />
}
