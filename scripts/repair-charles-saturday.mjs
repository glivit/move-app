// One-shot repair: mark Charles's Saturday 2026-04-18 workout as completed.
// Reason: the complete-flow silently failed (no bug_reports row, no retry queue
// — those fixes ship later). We manually set completed_at so his week-view and
// the coach surfaces pick it up.
//
// Usage:
//   node scripts/repair-charles-saturday.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim() : null
}
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const key = get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) {
  console.error('Missing env vars'); process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

// Find Charles — full_name ilike. Try 'client' first, then anything.
const { data: matches } = await admin
  .from('profiles')
  .select('id, full_name, role')
  .ilike('full_name', '%charles%')

console.log('Name matches:', matches)
if (!matches || matches.length === 0) {
  console.error('No Charles found'); process.exit(1)
}

// Prefer role=client
const charles = matches.find(m => m.role === 'client') || matches[0]
console.log('Using:', charles)

// Find his Saturday 2026-04-18 sessions (started_at between 00:00 and 23:59 local Europe/Brussels)
// Use UTC window that covers CEST (UTC+2): 2026-04-17T22:00Z .. 2026-04-18T22:00Z
const { data: sats } = await admin
  .from('workout_sessions')
  .select('id, started_at, completed_at, template_day_id, client_program_id, duration_seconds')
  .eq('client_id', charles.id)
  .gte('started_at', '2026-04-17T22:00:00Z')
  .lt('started_at', '2026-04-18T22:00:00Z')
  .order('started_at', { ascending: false })

console.log('Saturday sessions:', sats)
if (!sats || sats.length === 0) {
  console.error('No Saturday session found'); process.exit(1)
}

// Target = most recent incomplete one
const open = sats.find(s => !s.completed_at) || sats[0]
console.log('Repairing session:', open.id)

if (open.completed_at) {
  console.log('Already has completed_at:', open.completed_at, '- skipping')
  process.exit(0)
}

// Estimate completed_at: started_at + max(duration_seconds, activity window from sets)
const { data: sets } = await admin
  .from('workout_sets')
  .select('created_at, completed')
  .eq('workout_session_id', open.id)
  .order('created_at', { ascending: false })
  .limit(1)

const lastSetAt = sets && sets.length > 0 ? new Date(sets[0].created_at) : null
const startedAt = new Date(open.started_at)
let completedAt
if (lastSetAt && lastSetAt.getTime() > startedAt.getTime()) {
  // + 2 min buffer na laatste set
  completedAt = new Date(lastSetAt.getTime() + 2 * 60 * 1000)
} else if (open.duration_seconds) {
  completedAt = new Date(startedAt.getTime() + open.duration_seconds * 1000)
} else {
  completedAt = new Date(startedAt.getTime() + 55 * 60 * 1000) // 55 min default
}

const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
console.log('Setting completed_at =', completedAt.toISOString(), '(', durationSeconds, 'seconds )')

const { error: updErr } = await admin
  .from('workout_sessions')
  .update({
    completed_at: completedAt.toISOString(),
    duration_seconds: durationSeconds,
  })
  .eq('id', open.id)

if (updErr) {
  console.error('Update failed:', updErr)
  process.exit(1)
}

console.log('✓ Repaired', open.id)
