import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const get = (k) => { const m = env.match(new RegExp(`^${k}=(.*)$`, 'm')); return m ? m[1].trim() : null }
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })

// Get all columns on program_template_days
const { data, error } = await admin.from('program_template_days').select('*').eq('template_id', 'b8d16be4-eb30-48a4-8b3c-2d034685b8ed')
console.log('error:', error)
console.log('rows:', data)
