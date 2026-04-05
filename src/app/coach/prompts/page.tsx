import { createServerSupabaseClient } from '@/lib/supabase-server'
import PromptsView from './PromptsView'
import type { Prompt } from './PromptsView'

export default async function PromptConfigurationPage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('prompts')
    .select('*')
    .order('send_day', { ascending: true })
    .order('send_time', { ascending: true })

  return <PromptsView initialPrompts={(data || []) as Prompt[]} />
}
