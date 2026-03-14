/**
 * MŌVE — ExerciseDB Import Script
 *
 * Fetches all 1500 exercises from ExerciseDB API (v1, open source)
 * and inserts them into our Supabase exercises table.
 *
 * Usage:
 *   npx tsx scripts/import-exercisedb.ts
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const API_BASE = 'https://exercisedb-api.vercel.app/api/v1'

interface ExerciseDBResponse {
  success: boolean
  metadata: {
    totalPages: number
    totalExercises: number
    currentPage: number
    nextPage: string | null
  }
  data: Array<{
    exerciseId: string
    name: string
    gifUrl: string
    targetMuscles: string[]
    bodyParts: string[]
    equipments: string[]
    secondaryMuscles: string[]
    instructions: string[]
  }>
}

function mapBodyPart(bodyParts: string[]): string {
  const part = (bodyParts[0] || '').toLowerCase()
  const mapping: Record<string, string> = {
    chest: 'chest',
    back: 'back',
    shoulders: 'shoulders',
    'upper arms': 'arms',
    'lower arms': 'arms',
    'upper legs': 'legs',
    'lower legs': 'legs',
    waist: 'core',
    cardio: 'cardio',
    neck: 'neck',
  }
  return mapping[part] || part || 'other'
}

// Clean instruction text: remove "Step:1 " prefix
function cleanInstruction(text: string): string {
  return text.replace(/^Step:\d+\s*/i, '').trim()
}

async function fetchAllExercises() {
  console.log('Ophalen van oefeningen van ExerciseDB API...\n')

  const allExercises: ExerciseDBResponse['data'] = []
  let offset = 0
  const limit = 100

  while (true) {
    const url = `${API_BASE}/exercises?offset=${offset}&limit=${limit}`
    console.log(`  Batch ophalen offset=${offset}...`)

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        const body = await response.text()
        console.error(`  API fout: ${response.status} — ${body.slice(0, 200)}`)
        // Try without offset/limit params on first failure
        if (offset === 0) {
          console.log('  Retry met alternatieve URL...')
          const retryResponse = await fetch(`${API_BASE}/exercises?limit=100`, {
            headers: { 'Accept': 'application/json' }
          })
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json()
            const retryExercises = retryResult.data || []
            if (retryExercises.length > 0) {
              allExercises.push(...retryExercises)
              console.log(`  Retry OK: ${retryExercises.length} oefeningen`)
              offset += retryExercises.length
              continue
            }
          }
        }
        break
      }

      const result: ExerciseDBResponse = await response.json()
      const exercises = result.data || []

      if (exercises.length === 0) break

      allExercises.push(...exercises)
      console.log(`  ${exercises.length} oefeningen opgehaald (totaal: ${allExercises.length})`)

      if (!result.metadata.nextPage || exercises.length < limit) break

      offset += limit
      // Rate limiting — be gentle with free API
      await new Promise(r => setTimeout(r, 6000))
    } catch (err) {
      console.error(`  Fetch fout:`, err)
      break
    }
  }

  return allExercises
}

async function main() {
  console.log('=== MOVE ExerciseDB Import ===\n')

  // 1. Fetch all exercises
  const exercises = await fetchAllExercises()
  console.log(`\nTotaal opgehaald: ${exercises.length} oefeningen\n`)

  if (exercises.length === 0) {
    console.error('Geen oefeningen gevonden. Check API beschikbaarheid.')
    process.exit(1)
  }

  // 2. Transform to our schema
  const rows = exercises.map(ex => ({
    name: ex.name,
    name_nl: null,
    body_part: mapBodyPart(ex.bodyParts),
    target_muscle: (ex.targetMuscles[0] || '').toLowerCase(),
    secondary_muscles: ex.secondaryMuscles.map(m => m.toLowerCase()),
    equipment: (ex.equipments[0] || 'body weight').toLowerCase(),
    gif_url: ex.gifUrl,
    instructions: ex.instructions.map(cleanInstruction),
    coach_tips: null,
    coach_notes: null,
    category: 'strength' as const,
    is_custom: false,
    is_visible: true,
    sort_order: 0,
    exercisedb_id: ex.exerciseId,
  }))

  console.log(`${rows.length} oefeningen klaar voor import.\n`)

  // Show body part distribution
  const bodyParts: Record<string, number> = {}
  rows.forEach(r => { bodyParts[r.body_part] = (bodyParts[r.body_part] || 0) + 1 })
  console.log('Verdeling per lichaamsdeel:')
  Object.entries(bodyParts).sort((a, b) => b[1] - a[1]).forEach(([part, count]) => {
    console.log(`  ${part}: ${count}`)
  })
  console.log('')

  // 3. Insert in batches
  const batchSize = 100
  let inserted = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(rows.length / batchSize)

    const { error } = await supabase
      .from('exercises')
      .upsert(batch, { onConflict: 'exercisedb_id', ignoreDuplicates: true })

    if (error) {
      console.error(`  Batch ${batchNum} fout:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      console.log(`  Batch ${batchNum}/${totalBatches} OK (${inserted} totaal)`)
    }

    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n=== Import Klaar ===`)
  console.log(`Geimporteerd: ${inserted}`)
  console.log(`Fouten: ${errors}`)

  // 4. Verify count
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })

  console.log(`\nTotaal in database: ${count} oefeningen`)

  // Show samples
  const { data: samples } = await supabase
    .from('exercises')
    .select('name, body_part, target_muscle, equipment, gif_url')
    .limit(5)

  console.log('\nVoorbeelden:')
  samples?.forEach((ex: any) => {
    console.log(`  - ${ex.name} | ${ex.body_part} | ${ex.target_muscle} | ${ex.equipment}`)
    console.log(`    GIF: ${ex.gif_url ? 'Ja' : 'Nee'}`)
  })
}

main().catch(console.error)
