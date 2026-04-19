// One-shot repair: Charles's client_programs.schedule has the literal string
// "Push" in slot 1 instead of the UUID template_day_id. We map it to the
// correct UUID (c4e9b772...) and also detect any other slots that contain
// non-UUID values or stale FKs → map by name inside the program's template.
//
// Usage:
//   node scripts/repair-charles-schedule.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim() : null
}
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const charlesId = '4f52ca47-4d2d-43ce-9c43-2b0f3713ff43'

const { data: cp } = await admin
  .from('client_programs')
  .select('id, template_id, schedule')
  .eq('client_id', charlesId)
  .eq('is_active', true)
  .maybeSingle()

if (!cp) { console.error('No active program'); process.exit(1) }
console.log('Active program:', cp.id, 'schedule:', cp.schedule)

const { data: tds } = await admin
  .from('program_template_days')
  .select('id, name, day_number')
  .eq('template_id', cp.template_id)

const byId = new Map((tds || []).map(t => [t.id, t]))
const byNameLower = new Map((tds || []).map(t => [String(t.name).toLowerCase(), t]))

let changed = false
const next = { ...(cp.schedule || {}) }
for (const [dow, val] of Object.entries(next)) {
  if (!val) continue
  if (UUID_RE.test(val) && byId.has(val)) continue
  // Try name match
  const td = byNameLower.get(String(val).toLowerCase())
  if (td) {
    console.log(`  Slot ${dow}: "${val}" → ${td.id} (${td.name})`)
    next[dow] = td.id
    changed = true
  } else {
    console.warn(`  Slot ${dow}: "${val}" — geen match in template`)
  }
}

if (!changed) {
  console.log('Niets te repareren.')
  process.exit(0)
}

const { error } = await admin
  .from('client_programs')
  .update({ schedule: next })
  .eq('id', cp.id)

if (error) { console.error('Update failed:', error); process.exit(1) }
console.log('✓ Schedule gerepareerd:', next)
