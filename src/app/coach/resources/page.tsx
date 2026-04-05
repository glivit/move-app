import { createServerSupabaseClient } from '@/lib/supabase-server'
import ResourcesView from './ResourcesView'
import type { Resource } from './ResourcesView'

export default async function ResourcesPage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('resources')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  return <ResourcesView initialResources={(data || []) as Resource[]} />
}
