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

const sessionId = '1978311f-a54a-43e1-84cc-bd0458134e87'

const { data: s } = await admin
  .from('workout_sessions')
  .select('id, started_at, completed_at, duration_seconds, template_day_id, client_program_id, mood_rating, difficulty_rating, notes')
  .eq('id', sessionId)
  .single()
console.log('Session:', s)

const { data: day } = await admin
  .from('program_template_days')
  .select('id, name, template_id')
  .eq('id', s.template_day_id)
  .single()
console.log('Template day:', day)

const { data: sets, count } = await admin
  .from('workout_sets')
  .select('id, exercise_id, set_number, weight_kg, actual_reps, completed', { count: 'exact' })
  .eq('workout_session_id', sessionId)
  .order('set_number', { ascending: true })
console.log('Sets (count=' + count + '):', sets)
