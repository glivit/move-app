import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProgramsView from './ProgramsView'
import type { ProgramTemplate } from './ProgramsView'

export default async function ProgramsPage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('program_templates')
    .select('*')
    .order('created_at', { ascending: false })

  return <ProgramsView initialPrograms={(data || []) as ProgramTemplate[]} />
}
