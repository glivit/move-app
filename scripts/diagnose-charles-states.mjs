// Reproduceert EXACT de state-computation uit fetchClientWeekTimeline
// + print wat summary.doneCount/missedCount/plannedCount zouden zijn.

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

const charlesId = '4f52ca47-4d2d-43ce-9c43-2b0f3713ff43'

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
const today = new Date(); today.setHours(0,0,0,0)
const todayIso = toDateIso(today)

const { data: program } = await admin
  .from('client_programs')
  .select('schedule').eq('client_id', charlesId).eq('is_active', true).maybeSingle()
const schedule = program?.schedule || {}

const { data: tds } = await admin.from('program_template_days').select('id, name')
const dayNameMap = Object.fromEntries((tds || []).map(t => [t.id, t.name]))

const { data: sessions } = await admin
  .from('workout_sessions')
  .select('id, template_day_id, started_at, completed_at')
  .eq('client_id', charlesId)
  .or(`and(started_at.gte.${weekStart.toISOString()},started_at.lt.${weekEnd.toISOString()}),and(completed_at.gte.${weekStart.toISOString()},completed_at.lt.${weekEnd.toISOString()})`)

const completedTemplateIds = new Set((sessions||[]).filter(s => s.completed_at && s.template_day_id).map(s => s.template_day_id))
const scheduledIdToDow = new Map()
for (const [dow, tid] of Object.entries(schedule)) if (tid) scheduledIdToDow.set(tid, Number(dow))

let doneCount = 0, missedCount = 0
const plannedCount = Object.keys(schedule).filter(k => schedule[k]).length

const DAY_LABELS = ['Ma','Di','Wo','Do','Vr','Za','Zo']
console.log('Computed state per day:')
for (let i = 0; i < 7; i++) {
  const d = new Date(weekStart); d.setDate(d.getDate() + i)
  const dateIso = toDateIso(d)
  const dayStart = new Date(dateIso + 'T00:00:00')
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
  const daySessions = (sessions||[]).filter(s => {
    if (!s.completed_at) return false
    const t = new Date(s.completed_at)
    return t >= dayStart && t < dayEnd
  })
  const isToday = dateIso === todayIso
  const isFuture = dateIso > todayIso
  const plannedDayId = schedule[String(i+1)] || null
  const plannedDayName = plannedDayId ? (dayNameMap[plannedDayId] || `Training (stale=${plannedDayId.slice(0,8)})`) : null

  let state = 'rest'
  if (daySessions.length > 0) {
    const primary = daySessions[0]
    if (plannedDayId && primary.template_day_id === plannedDayId) state = 'done_planned'
    else if (primary.template_day_id && scheduledIdToDow.has(primary.template_day_id)) state = 'done_moved'
    else state = 'done_bonus'
  } else if (plannedDayId) {
    if (completedTemplateIds.has(plannedDayId)) state = 'rest'
    else if (isToday) state = 'today_open'
    else if (isFuture) state = 'upcoming'
    else state = 'missed'
  }

  if (state.startsWith('done_')) doneCount++
  if (state === 'missed') missedCount++

  console.log(`  ${DAY_LABELS[i]} ${dateIso}  planned=${plannedDayName ?? '—'}  sessions=${daySessions.length}  → state=${state}`)
}
console.log('')
console.log(`summary: doneCount=${doneCount}  plannedCount=${plannedCount}  missedCount=${missedCount}`)
console.log(`UI zou zeggen: "${doneCount}/${plannedCount} gedaan · ${missedCount} gemist"`)
