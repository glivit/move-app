import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const get = (k) => { const m = env.match(new RegExp(`^${k}=(.*)$`, 'm')); return m ? m[1].trim() : null }
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })

const charlesId = '4f52ca47-4d2d-43ce-9c43-2b0f3713ff43'

// What's Charles's active program's template?
const { data: cp } = await admin
  .from('client_programs')
  .select('id, template_id, schedule, name, is_active')
  .eq('client_id', charlesId).eq('is_active', true).maybeSingle()
console.log('client_program:', cp)

// What template_days belong to that template?
if (cp?.template_id) {
  const { data: tds } = await admin
    .from('program_template_days')
    .select('id, name, day_order')
    .eq('template_id', cp.template_id)
    .order('day_order')
  console.log('\nTemplate days for this template:')
  for (const td of tds||[]) console.log(`  ${td.day_order}. ${td.name} (${td.id})`)
}

// The Monday session's tdy
const { data: sess } = await admin
  .from('workout_sessions')
  .select('id, started_at, template_day_id')
  .eq('client_id', charlesId)
  .gte('started_at', '2026-04-13T00:00:00Z')
  .lt('started_at', '2026-04-14T00:00:00Z')
console.log('\nMonday sessions:', sess)

// What IS tdy c4e9b772?
const { data: c4 } = await admin.from('program_template_days').select('id, name, template_id').eq('id', 'c4e9b772-5955-49d5-b155-4be9799fdc1f').maybeSingle()
console.log('\nMonday session tdy → ', c4)

// And tdy abc49d06
const { data: abc } = await admin.from('program_template_days').select('id, name, template_id').eq('id', 'abc49d06-061a-4bd2-918d-b65b4ae6bc8f').maybeSingle()
console.log('Saturday session tdy → ', abc)
