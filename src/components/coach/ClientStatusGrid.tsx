'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Dumbbell, UtensilsCrossed, Send, ChevronRight,
  Flame, CheckCircle2, AlertTriangle, MessageCircle,
  Settings, Calendar, Clock, Pencil,
} from 'lucide-react'

// ─── Types ────────────────────────────────────

interface ClientStatus {
  id: string
  fullName: string
  initials: string
  avatarUrl: string | null
  package: string

  // Workout
  workoutsThisWeek: number
  expectedPerWeek: number
  workedOutToday: boolean
  workoutStreak: number
  lastWorkoutDaysAgo: number | null
  scheduledToday: string | null  // template day name if scheduled today

  // Nutrition
  hasNutritionPlan: boolean
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  nutritionLoggedToday: boolean

  // Check-in
  hasPendingCheckin: boolean

  // Overall
  needsAttention: boolean
}

type FilterMode = 'all' | 'behind' | 'on-track'

// ─── Helpers ────────────────────────────────────

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function getDayOfWeek(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

// ─── Component ────────────────────────────────────

export function ClientStatusGrid() {
  const [clients, setClients] = useState<ClientStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sendingPrompt, setSendingPrompt] = useState<string | null>(null)
  const [promptSent, setPromptSent] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      const today = todayStr()
      const weekStart = getWeekStart()
      const isoDay = getDayOfWeek()

      const [
        { data: profilesData },
        { data: sessionsData },
        { data: programsData },
        { data: nutritionPlansData },
        { data: nutritionSummaryData },
        { data: allSessionsData },
        { data: checkinsData },
        { data: templateDaysData },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, package').eq('role', 'client'),
        supabase.from('workout_sessions').select('client_id, started_at, completed_at').gte('started_at', weekStart.toISOString()).not('completed_at', 'is', null),
        supabase.from('client_programs').select('client_id, schedule').eq('is_active', true),
        supabase.from('nutrition_plans').select('client_id, calories_target, protein_g, meals').eq('is_active', true),
        supabase.from('nutrition_daily_summary').select('client_id, total_calories, total_protein').eq('date', today),
        supabase.from('workout_sessions').select('client_id, started_at, completed_at').not('completed_at', 'is', null).order('started_at', { ascending: false }),
        supabase.from('checkins').select('client_id').eq('coach_reviewed', false),
        supabase.from('program_template_days').select('id, name'),
      ])

      const profiles = profilesData || []
      const sessions = sessionsData || []
      const programs = programsData || []
      const nutritionPlans = nutritionPlansData || []
      const nutritionSummary = nutritionSummaryData || []
      const allSessions = allSessionsData || []
      const checkins = checkinsData || []
      const templateDays = templateDaysData || []

      // Build template day name lookup
      const dayNameMap: Record<string, string> = {}
      for (const td of templateDays) {
        dayNameMap[td.id] = td.name
      }

      const clientStatuses: ClientStatus[] = profiles.map((p: any) => {
        const fullName = p.full_name || 'Onbekend'
        const nameParts = fullName.split(' ')
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
          : fullName.substring(0, 2)

        // Workout data — use actual schedule for expectedPerWeek
        const clientSessions = sessions.filter((s: any) => s.client_id === p.id)
        const clientProgram = programs.find((pr: any) => pr.client_id === p.id) as any
        const schedule = (clientProgram?.schedule || {}) as Record<string, string>
        const expectedPerWeek = Object.keys(schedule).length || 0
        const workoutsThisWeek = clientSessions.length
        const workedOutToday = clientSessions.some((s: any) => s.completed_at?.startsWith(today))

        // What's scheduled today?
        const todayDayId = schedule[String(isoDay)]
        const scheduledToday = todayDayId ? (dayNameMap[todayDayId] || 'Training') : null

        // Last workout days ago
        const clientAll = allSessions.filter((s: any) => s.client_id === p.id)
        let lastWorkoutDaysAgo: number | null = null
        if (clientAll.length > 0) {
          const lastDate = new Date(clientAll[0].started_at)
          lastWorkoutDaysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        }

        // Streak
        let streak = 0
        if (clientAll.length > 0) {
          const ws = new Date(weekStart)
          if (workoutsThisWeek > 0) streak = 1
          for (let i = 0; i < 52; i++) {
            ws.setDate(ws.getDate() - 7)
            const we = new Date(ws)
            we.setDate(we.getDate() + 7)
            if (clientAll.some((s: any) => { const d = new Date(s.started_at); return d >= ws && d < we })) {
              streak++
            } else break
          }
        }

        // Nutrition data
        const plan = nutritionPlans.find((np: any) => np.client_id === p.id) as any
        const summary = nutritionSummary.find((ns: any) => ns.client_id === p.id) as any
        const hasNutritionPlan = !!plan
        const caloriesLogged = summary?.total_calories || 0
        const caloriesTarget = plan?.calories_target || 0
        const proteinLogged = summary?.total_protein || 0
        const proteinTarget = plan?.protein_g || 0
        const nutritionLoggedToday = caloriesLogged > 0

        // Check-in
        const hasPendingCheckin = checkins.some((c: any) => c.client_id === p.id)

        // Needs attention
        const dayOfWeek = getDayOfWeek()
        const expectedByNow = expectedPerWeek > 0 ? Math.floor(expectedPerWeek * dayOfWeek / 7) : 0
        const workoutBehind = expectedPerWeek > 0 && workoutsThisWeek < expectedByNow
        const nutritionBehind = hasNutritionPlan && !nutritionLoggedToday
        const needsAttention = workoutBehind || nutritionBehind || hasPendingCheckin

        return {
          id: p.id,
          fullName,
          initials: initials.toUpperCase(),
          avatarUrl: p.avatar_url,
          package: p.package || 'essential',
          workoutsThisWeek,
          expectedPerWeek,
          workedOutToday,
          workoutStreak: streak,
          lastWorkoutDaysAgo,
          scheduledToday,
          hasNutritionPlan,
          caloriesLogged,
          caloriesTarget,
          proteinLogged,
          proteinTarget,
          nutritionLoggedToday,
          hasPendingCheckin,
          needsAttention,
        }
      })

      clientStatuses.sort((a, b) => {
        if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1
        return a.fullName.localeCompare(b.fullName, 'nl')
      })

      setClients(clientStatuses)
    } catch (err) {
      console.error('ClientStatusGrid load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function sendPrompt(clientId: string, type: 'workout' | 'nutrition' | 'general') {
    try {
      setSendingPrompt(`${clientId}-${type}`)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const client = clients.find(c => c.id === clientId)
      const firstName = client?.fullName.split(' ')[0] || ''

      const messages: Record<string, string> = {
        workout: `${firstName}, heb je vandaag al getraind? Probeer je sessie nog in te plannen`,
        nutrition: `${firstName}, vergeet niet je voeding bij te houden vandaag`,
        general: `Hey ${firstName}, hoe gaat het? Check even je planning en laat me weten als je ergens mee zit`,
      }

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: clientId,
        content: messages[type],
        message_type: 'text',
      })

      setPromptSent(prev => new Set(prev).add(`${clientId}-${type}`))
    } catch (err) {
      console.error('Send prompt error:', err)
    } finally {
      setSendingPrompt(null)
    }
  }

  const filtered = clients.filter(c => {
    if (filter === 'behind') return c.needsAttention
    if (filter === 'on-track') return !c.needsAttention
    return true
  })

  const behindCount = clients.filter(c => c.needsAttention).length
  const onTrackCount = clients.filter(c => !c.needsAttention).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-56 bg-[#A6ADA7] rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-[#A6ADA7] rounded-2xl border border-[#A6ADA7] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[22px] font-semibold text-[#FDFDFE] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
          Cliënten
        </h2>
        <div className="flex gap-1.5">
          {[
            { key: 'all' as FilterMode, label: `Iedereen (${clients.length})` },
            { key: 'behind' as FilterMode, label: `Achter (${behindCount})`, color: 'text-[#B55A4A]' },
            { key: 'on-track' as FilterMode, label: `Op schema (${onTrackCount})`, color: 'text-[#2FA65A]' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f.key
                  ? 'bg-[#474B48] text-white'
                  : `bg-[#A6ADA7] ${f.color || 'text-[#E6E8E7]'} hover:bg-[#EBE8E0]`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((client) => {
          const kcalPct = client.caloriesTarget > 0 ? Math.min(100, Math.round((client.caloriesLogged / client.caloriesTarget) * 100)) : 0
          const workoutPct = client.expectedPerWeek > 0 ? Math.min(100, Math.round((client.workoutsThisWeek / client.expectedPerWeek) * 100)) : 0

          return (
            <div
              key={client.id}
              className={`bg-[#A6ADA7] rounded-2xl border transition-all ${
                client.needsAttention
                  ? 'border-[#B55A4A]/20 shadow-[0_0_0_1px_rgba(255,59,48,0.05)]'
                  : 'border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
              }`}
            >
              {/* ── Top row: name + badges + actions ── */}
              <div className="flex items-center gap-3 px-5 py-4">
                <Link href={`/coach/clients/${client.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                  <div className="w-11 h-11 rounded-full bg-[#A6ADA7] flex items-center justify-center text-[13px] font-semibold text-[#D6D9D6] flex-shrink-0 overflow-hidden">
                    {client.avatarUrl ? (
                      <Image src={client.avatarUrl} alt="" width={44} height={44} className="w-full h-full object-cover" unoptimized loading="lazy" />
                    ) : client.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-semibold text-[#FDFDFE] truncate group-hover:text-[#C0FC01] transition-colors">
                        {client.fullName}
                      </p>
                      {client.needsAttention && (
                        <span className="text-[11px] font-semibold text-[#B55A4A] flex items-center gap-0.5 shrink-0">
                          <AlertTriangle size={11} /> Achter
                        </span>
                      )}
                      {client.workoutStreak > 1 && (
                        <span className="text-[11px] font-semibold text-[#E8B948] flex items-center gap-0.5 shrink-0">
                          <Flame size={11} /> {client.workoutStreak}w
                        </span>
                      )}
                      {client.hasPendingCheckin && (
                        <span className="text-[11px] font-semibold text-[#D9A645] flex items-center gap-0.5 shrink-0">
                          Check-in
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#E6E8E7] mt-0.5">
                      {client.lastWorkoutDaysAgo !== null
                        ? client.lastWorkoutDaysAgo === 0
                          ? 'Vandaag getraind'
                          : client.lastWorkoutDaysAgo === 1
                          ? 'Gisteren getraind'
                          : `${client.lastWorkoutDaysAgo} dagen geleden getraind`
                        : 'Nog niet getraind'}
                      {client.scheduledToday && !client.workedOutToday && (
                        <span className="text-[#C0FC01]"> · {client.scheduledToday} gepland</span>
                      )}
                    </p>
                  </div>
                </Link>

                <ChevronRight size={16} className="text-[#989F99] flex-shrink-0" strokeWidth={1.5} />
              </div>

              {/* ── Stats row ── */}
              <div className="px-5 pb-3 flex items-center gap-6">
                {/* Workout progress */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Dumbbell size={15} className={client.workedOutToday ? 'text-[#2FA65A] shrink-0' : 'text-[#989F99] shrink-0'} strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[12px] font-semibold tabular-nums ${
                        client.workoutsThisWeek >= client.expectedPerWeek && client.expectedPerWeek > 0
                          ? 'text-[#2FA65A]'
                          : client.workoutsThisWeek > 0
                          ? 'text-[#E8B948]'
                          : client.expectedPerWeek > 0
                          ? 'text-[#B55A4A]'
                          : 'text-[#E6E8E7]'
                      }`}>
                        {client.expectedPerWeek > 0 ? `${client.workoutsThisWeek}/${client.expectedPerWeek} deze week` : 'Geen schema'}
                      </span>
                    </div>
                    {client.expectedPerWeek > 0 && (
                      <div className="h-1.5 bg-[#A6ADA7] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${workoutPct}%`,
                            backgroundColor: client.workoutsThisWeek >= client.expectedPerWeek ? '#2FA65A' : client.workoutsThisWeek > 0 ? '#E8B948' : '#B55A4A',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Nutrition progress */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <UtensilsCrossed size={15} className={client.nutritionLoggedToday ? 'text-[#C0FC01] shrink-0' : 'text-[#989F99] shrink-0'} strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    {client.hasNutritionPlan ? (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[12px] font-semibold tabular-nums ${
                            kcalPct >= 80 ? 'text-[#2FA65A]' : kcalPct > 0 ? 'text-[#C0FC01]' : 'text-[#E6E8E7]'
                          }`}>
                            {client.caloriesLogged}/{client.caloriesTarget} kcal
                          </span>
                          {client.proteinTarget > 0 && (
                            <span className="text-[11px] text-[#E6E8E7] tabular-nums">
                              {client.proteinLogged}/{client.proteinTarget}g eiwit
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 bg-[#A6ADA7] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${kcalPct}%`,
                              backgroundColor: kcalPct >= 80 ? '#2FA65A' : kcalPct > 0 ? '#C0FC01' : '#A6ADA7',
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-[12px] text-[#989F99]">Geen voedingsplan</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Action buttons ── */}
              <div className="px-5 py-3 border-t border-[#A6ADA7] flex items-center gap-2">
                <Link
                  href={`/coach/clients/${client.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#E6E8E7] hover:bg-[#A6ADA7] transition-colors"
                >
                  <Settings size={13} strokeWidth={1.5} />
                  Programma
                </Link>
                <Link
                  href={`/coach/clients/${client.id}/nutrition`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#E6E8E7] hover:bg-[#A6ADA7] transition-colors"
                >
                  <UtensilsCrossed size={13} strokeWidth={1.5} />
                  Voeding
                </Link>
                {client.hasPendingCheckin && (
                  <Link
                    href={`/coach/check-ins?client=${client.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#D9A645] bg-[#D9A645]/8 hover:bg-[#D9A645]/15 transition-colors"
                  >
                    <Calendar size={13} strokeWidth={1.5} />
                    Check-in
                  </Link>
                )}

                {/* Quick message — push right */}
                <div className="ml-auto flex items-center gap-1.5">
                  {!client.workedOutToday && client.scheduledToday && (
                    <button
                      onClick={() => sendPrompt(client.id, 'workout')}
                      disabled={sendingPrompt !== null || promptSent.has(`${client.id}-workout`)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        promptSent.has(`${client.id}-workout`)
                          ? 'bg-[#2FA65A]/10 text-[#2FA65A]'
                          : 'bg-[#A6ADA7] text-[#E6E8E7] hover:bg-[#C0FC01]/10 hover:text-[#C0FC01]'
                      }`}
                      title="Herinnering workout"
                    >
                      {promptSent.has(`${client.id}-workout`) ? (
                        <><CheckCircle2 size={11} /> Verstuurd</>
                      ) : sendingPrompt === `${client.id}-workout` ? (
                        <div className="w-3 h-3 border-2 border-[#C0FC01] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Dumbbell size={11} /> Herinnering</>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => sendPrompt(client.id, 'general')}
                    disabled={sendingPrompt !== null || promptSent.has(`${client.id}-general`)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      promptSent.has(`${client.id}-general`)
                        ? 'bg-[#2FA65A]/10'
                        : 'bg-[#A6ADA7] hover:bg-[#C0FC01]/10 active:scale-95'
                    }`}
                    title="Stuur bericht"
                  >
                    {promptSent.has(`${client.id}-general`) ? (
                      <CheckCircle2 size={14} className="text-[#2FA65A]" />
                    ) : sendingPrompt === `${client.id}-general` ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#C0FC01] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MessageCircle size={14} className="text-[#E6E8E7]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[14px] text-[#E6E8E7]">
            {filter === 'behind' ? 'Geen cliënten achter op schema' : 'Geen cliënten gevonden'}
          </p>
        </div>
      )}
    </div>
  )
}
