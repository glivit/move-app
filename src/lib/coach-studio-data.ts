import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Data for the v3 Studio hub — library + coaching-stats + account.
 *
 * Returns everything needed to render /coach/studio in a single
 * async server call, matching the coach-studio.html mockup.
 */

export interface TemplateRow {
  id: string
  name: string
  meta: string      // "6 dagen · hypertrofie · 8 wk"
  usageLabel: string // "7 klanten"
  clientCount: number
}

export interface NutritionTemplateRow {
  id: string         // title acts as id (plans are per-client)
  name: string
  meta: string       // "2200–2600 kcal · 2,2 g/kg eiwit"
  usageLabel: string
  clientCount: number
}

export interface CoachStudioData {
  activeClients: number
  templateCount: number
  trialClients: number
  programTemplates: TemplateRow[]
  programTemplatesTotal: number
  nutritionTemplates: NutritionTemplateRow[]
  nutritionTemplatesTotal: number
  exerciseCount: number
  thisWeek: {
    sessionsDone: number
    sessionsPlanned: number
    sessionsPct: number
    checkinsDone: number
    checkinsPlanned: number
    checkinsOpen: number
    newClientsWeek: number
  }
  coach: {
    fullName: string
    tierLabel: string
    integrationsLabel: string
    availabilityLabel: string
  }
}

// ─── Row types (local) ──────────────────────────────────────────
interface ProfileLite {
  id: string
  full_name: string | null
  role: string
  package: string | null
  start_date: string | null
  created_at?: string
}

interface ProgramTemplateRow {
  id: string
  name: string
  duration_weeks: number | null
  days_per_week: number | null
  difficulty: string | null
  is_archived: boolean | null
}

interface ClientProgramRow {
  id: string
  client_id: string
  template_id: string
  is_active: boolean
}

interface NutritionPlanRow {
  id: string
  client_id: string
  title: string
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  is_active: boolean
}

interface WorkoutSessionRow {
  id: string
  client_id: string
  started_at: string
  completed_at: string | null
}

interface CheckinRow {
  id: string
  client_id: string
  created_at: string
  coach_reviewed: boolean
}

// ─── Helpers ────────────────────────────────────────────────────

function mondayOf(d: Date): Date {
  const result = new Date(d)
  result.setHours(0, 0, 0, 0)
  const day = (result.getDay() + 6) % 7 // Mon=0, Sun=6
  result.setDate(result.getDate() - day)
  return result
}

function difficultyLabel(diff: string | null): string {
  if (!diff) return ''
  const map: Record<string, string> = {
    beginner: 'beginner',
    intermediate: 'gevorderd',
    advanced: 'expert',
    hypertrophy: 'hypertrofie',
    strength: 'kracht',
    cut: 'cut',
  }
  return map[diff.toLowerCase()] || diff.toLowerCase()
}

function programMeta(t: ProgramTemplateRow): string {
  const parts: string[] = []
  if (t.days_per_week) parts.push(`${t.days_per_week} dagen`)
  const diff = difficultyLabel(t.difficulty)
  if (diff) parts.push(diff)
  if (t.duration_weeks) parts.push(`${t.duration_weeks} wk`)
  return parts.join(' · ')
}

function nutritionMeta(plans: NutritionPlanRow[]): string {
  const kcals = plans.map((p) => p.calories_target || 0).filter((x) => x > 0)
  const proteins = plans.map((p) => p.protein_g || 0).filter((x) => x > 0)
  if (!kcals.length) return '—'
  const min = Math.min(...kcals)
  const max = Math.max(...kcals)
  const avgP = proteins.length
    ? Math.round((proteins.reduce((s, v) => s + v, 0) / proteins.length) * 10) / 10
    : null
  const kcalLabel = min === max ? `${min} kcal` : `${min}–${max} kcal`
  if (avgP !== null) {
    return `${kcalLabel} · ~${avgP.toString().replace('.', ',')} g eiwit`
  }
  return kcalLabel
}

// ─── Main fetcher ───────────────────────────────────────────────

export async function fetchCoachStudio(coachId: string): Promise<CoachStudioData> {
  const admin = createAdminClient()
  const now = new Date()
  const monday = mondayOf(now)
  const nextMonday = new Date(monday)
  nextMonday.setDate(nextMonday.getDate() + 7)

  const [
    { data: coachProfile },
    { data: clientsData },
    { data: templatesData },
    { data: clientProgramsData },
    { data: nutritionData },
    { data: weekSessionsData },
    { data: weekCheckinsData },
    { count: exerciseCount },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, package, start_date, created_at, role')
      .eq('id', coachId)
      .single(),
    admin
      .from('profiles')
      .select('id, full_name, package, start_date, created_at, role')
      .eq('role', 'client'),
    admin
      .from('program_templates')
      .select('id, name, duration_weeks, days_per_week, difficulty, is_archived')
      .eq('is_archived', false),
    admin
      .from('client_programs')
      .select('id, client_id, template_id, is_active'),
    admin
      .from('nutrition_plans')
      .select('id, client_id, title, calories_target, protein_g, carbs_g, fat_g, is_active')
      .eq('is_active', true),
    admin
      .from('workout_sessions')
      .select('id, client_id, started_at, completed_at')
      .gte('started_at', monday.toISOString())
      .lt('started_at', nextMonday.toISOString()),
    admin
      .from('checkins')
      .select('id, client_id, created_at, coach_reviewed')
      .gte('created_at', monday.toISOString())
      .lt('created_at', nextMonday.toISOString()),
    admin.from('exercises').select('*', { count: 'exact', head: true }),
  ])

  const coach = coachProfile as ProfileLite | null
  const clients = (clientsData || []) as ProfileLite[]
  const templates = (templatesData || []) as ProgramTemplateRow[]
  const clientPrograms = (clientProgramsData || []) as ClientProgramRow[]
  const nutritionPlans = (nutritionData || []) as NutritionPlanRow[]
  const weekSessions = (weekSessionsData || []) as WorkoutSessionRow[]
  const weekCheckins = (weekCheckinsData || []) as CheckinRow[]

  // Active clients = clients with an active program OR an active nutrition plan
  const activeClientIds = new Set<string>()
  for (const cp of clientPrograms) {
    if (cp.is_active) activeClientIds.add(cp.client_id)
  }
  for (const np of nutritionPlans) {
    if (np.is_active) activeClientIds.add(np.client_id)
  }
  // Fallback: if nothing active, count all clients so UI isn't empty
  const activeClients = activeClientIds.size || clients.length

  // Trial clients — profiles with package='trial' (best-effort)
  const trialClients = clients.filter((c) => (c.package || '').toLowerCase() === 'trial').length

  // Program templates with usage counts
  const usageByTemplate = new Map<string, number>()
  for (const cp of clientPrograms) {
    if (!cp.is_active || !cp.template_id) continue
    usageByTemplate.set(cp.template_id, (usageByTemplate.get(cp.template_id) || 0) + 1)
  }
  const programRows: TemplateRow[] = templates
    .map((t) => {
      const count = usageByTemplate.get(t.id) || 0
      return {
        id: t.id,
        name: t.name,
        meta: programMeta(t) || 'programma',
        usageLabel: `${count} ${count === 1 ? 'klant' : 'klanten'}`,
        clientCount: count,
      }
    })
    .sort((a, b) => b.clientCount - a.clientCount)

  const programTemplatesTotal = programRows.length
  const programTopThree = programRows.slice(0, 3)

  // Nutrition plans grouped by title (templates are per-client in this schema)
  const byTitle = new Map<string, NutritionPlanRow[]>()
  for (const np of nutritionPlans) {
    const key = (np.title || 'Voedingsplan').trim()
    if (!byTitle.has(key)) byTitle.set(key, [])
    byTitle.get(key)!.push(np)
  }
  const nutritionRows: NutritionTemplateRow[] = Array.from(byTitle.entries())
    .map(([title, plans]) => ({
      id: title.toLowerCase().replace(/\s+/g, '-'),
      name: title,
      meta: nutritionMeta(plans),
      usageLabel: `${plans.length} ${plans.length === 1 ? 'klant' : 'klanten'}`,
      clientCount: plans.length,
    }))
    .sort((a, b) => b.clientCount - a.clientCount)

  const nutritionTemplatesTotal = nutritionRows.length
  const nutritionTopThree = nutritionRows.slice(0, 3)

  // This week stats
  const sessionsDone = weekSessions.filter((s) => s.completed_at).length
  const sessionsPlanned = weekSessions.length
  const sessionsPct = sessionsPlanned > 0 ? Math.round((sessionsDone / sessionsPlanned) * 100) : 0

  const checkinsDone = weekCheckins.filter((c) => c.coach_reviewed).length
  const checkinsPlanned = weekCheckins.length
  const checkinsOpen = Math.max(0, checkinsPlanned - checkinsDone)

  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const newClientsWeek = clients.filter((c) => {
    const joinIso = c.start_date || c.created_at || null
    if (!joinIso) return false
    const d = new Date(joinIso)
    return d >= weekAgo
  }).length

  // Coach meta
  const tierLabel = (() => {
    const pkg = (coach?.package || '').toLowerCase()
    if (pkg.includes('pro')) return 'Pro · €29/mnd'
    if (pkg.includes('basic') || pkg.includes('starter')) return 'Basic · €9/mnd'
    if (pkg.includes('plus')) return 'Plus · €19/mnd'
    return coach?.package ? coach.package : 'Free plan'
  })()

  return {
    activeClients,
    templateCount: programTemplatesTotal + nutritionTemplatesTotal,
    trialClients,
    programTemplates: programTopThree,
    programTemplatesTotal,
    nutritionTemplates: nutritionTopThree,
    nutritionTemplatesTotal,
    exerciseCount: exerciseCount || 0,
    thisWeek: {
      sessionsDone,
      sessionsPlanned,
      sessionsPct,
      checkinsDone,
      checkinsPlanned,
      checkinsOpen,
      newClientsWeek,
    },
    coach: {
      fullName: coach?.full_name || 'Coach',
      tierLabel,
      integrationsLabel: 'Niet geconfigureerd',
      availabilityLabel: 'Ma–Vr · 08–20u',
    },
  }
}
