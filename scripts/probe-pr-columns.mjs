import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const get = (k) => { const m = env.match(new RegExp(`^${k}=(.*)$`, 'm')); return m ? m[1].trim() : null }
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })

// Sample a PR row
const { data: pr, error: e1 } = await admin.from('personal_records').select('*').limit(1)
console.log('personal_records sample:', pr, 'error:', e1)

// Sample an exercise row
const { data: ex, error: e2 } = await admin.from('exercises').select('*').limit(1)
console.log('exercises sample:', ex, 'error:', e2)
