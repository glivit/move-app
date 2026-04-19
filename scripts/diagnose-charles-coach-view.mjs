// Diagnose wat fetchClientWeekTimeline teruggeeft voor Charles.
// Reproduceert de exacte queries die de coach-detail-view doet en print
// wat er bij elke stap misloopt.

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

// Charles
const charlesId = '4f52ca47-4d2d-43ce-9c43-2b0f3713ff43'

// Week start (Maandag) — zelfde logica als fetcher
function getWeekStartDate(offsetWeeks = 0) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}
function toDateIso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const weekStart = getWeekStartDate(0)
const weekEnd = new Date(weekStart)
weekEnd.setDate(weekEnd.getDate() + 7)

console.log('Week window:')
console.log('  weekStart (ISO):', weekStart.toISOString(), ' = ', toDateIso(weekStart))
console.log('  weekEnd   (ISO):', weekEnd.toISOString(),   ' = ', toDateIso(weekEnd))
console.log('')

// Active program
const { data: program } = await admin
  .from('client_programs')
  .select('schedule, name, is_active, start_date, end_date')
  .eq('client_id', charlesId)
  .eq('is_active', true)
  .limit(1)
  .maybeSingle()
console.log('Active program:', program)
console.log('')

// Template days referenced by schedule
if (program?.schedule) {
  const scheduledIds = Object.values(program.schedule).filter(Boolean)
  const { data: tds } = await admin
    .from('program_template_days')
    .select('id, name, template_id')
    .in('id', scheduledIds)
  console.log('Template days referenced in schedule:')
  for (const [dow, tid] of Object.entries(program.schedule)) {
    if (!tid) continue
    const td = tds?.find(t => t.id === tid)
    console.log(`  day ${dow}: ${tid} → ${td ? td.name : '⚠ NIET GEVONDEN'}`)
  }
  console.log('')
}

// Sessions matching fetcher's .or() filter
const weekStartIso = weekStart.toISOString()
const weekEndIso = weekEnd.toISOString()

const { data: sessions } = await admin
  .from('workout_sessions')
  .select('id, template_day_id, started_at, completed_at, duration_seconds')
  .eq('client_id', charlesId)
  .or(
    `and(started_at.gte.${weekStartIso},started_at.lt.${weekEndIso}),and(completed_at.gte.${weekStartIso},completed_at.lt.${weekEndIso})`,
  )
  .order('started_at', { ascending: true })

console.log('Sessions in week window:')
for (const s of sessions || []) {
  console.log(`  - ${s.id}`)
  console.log(`      started_at   : ${s.started_at}`)
  console.log(`      completed_at : ${s.completed_at}`)
  console.log(`      template_day_id : ${s.template_day_id}`)
}
console.log('')

// For each day build dayStart/dayEnd + which sessions anchor there
console.log('Day-by-day session attachment:')
for (let i = 0; i < 7; i++) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + i)
  const dateIso = toDateIso(d)
  const dayStart = new Date(dateIso + 'T00:00:00')
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const daySessions = (sessions || []).filter(s => {
    if (!s.completed_at) return false
    const t = new Date(s.completed_at)
    return t >= dayStart && t < dayEnd
  })
  const dayLabels = ['Ma','Di','Wo','Do','Vr','Za','Zo']
  const plannedId = program?.schedule?.[String(i+1)] || null
  console.log(`  ${dayLabels[i]} ${dateIso}  planned=${plannedId || '—'}  sessions=${daySessions.length}`)
  for (const ds of daySessions) {
    const match = plannedId === ds.template_day_id ? 'done_planned' : 'other'
    console.log(`      → ${ds.id} tdy=${ds.template_day_id} completed_at=${ds.completed_at}  state=${match}`)
  }
}
