'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Dumbbell, UtensilsCrossed, Send, ChevronRight,
  Flame, CheckCircle2, XCircle, Clock, AlertTriangle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────

interface ClientStatus {
  id: string
  fullName: string
  initials: string
  avatarUrl: string | null

  // Workout
  workoutsThisWeek: number
  expectedPerWeek: number
  workedOutToday: boolean
  workoutStreak: number

  // Nutrition
  hasNutritionPlan: boolean
  mealsLoggedToday: number
  mealsPlannedToday: number
  nutritionLoggedToday: boolean
  caloriesLogged: number
  caloriesTarget: number

  // Overall
  needsAttention: boolean
}

type FilterMode = 'all' | 'behind' | 'on-track'

// ─── Helpers ────────────────────────────────────

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
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

      // Parallel fetches
      const [
        { data: profilesData },
        { data: sessionsData },
        { data: programsData },
        { data: nutritionPlansData },
        { data: nutritionSummaryData },
        { data: allSessionsData },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').eq('role', 'client'),
        supabase.from('workout_sessions').select('client_id, started_at, completed_at').gte('started_at', weekStart.toISOString()).not('completed_at', 'is', null),
        supabase.from('client_programs').select('client_id, program_templates(days_per_week)').eq('status', 'active'),
        supabase.from('nutrition_plans').select('client_id, calories_target, meals').eq('is_active', true),
        supabase.from('nutrition_daily_summary').select('client_id, meals_planned, meals_completed, total_calories').eq('date', today),
        supabase.from('workout_sessions').select('client_id, started_at, completed_at').not('completed_at', 'is', null).order('started_at', { ascending: false }),
      ])

      const profiles = profilesData || []
      const sessions = sessionsData || []
      const programs = programsData || []
      const nutritionPlans = nutritionPlansData || []
      const nutritionSummary = nutritionSummaryData || []
      const allSessions = allSessionsData || []

      const clientStatuses: ClientStatus[] = profiles.map((p: any) => {
        const fullName = p.full_name || 'Onbekend'
        const nameParts = fullName.split(' ')
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
          : fullName.substring(0, 2)

        // Workout data
        const clientSessions = sessions.filter((s: any) => s.client_id === p.id)
        const clientProgram = programs.find((pr: any) => pr.client_id === p.id) as any
        const expectedPerWeek = clientProgram?.program_templates?.days_per_week || 3
        const workoutsThisWeek = clientSessions.length
        const workedOutToday = clientSessions.some((s: any) => s.completed_at?.startsWith(today))

        // Streak
        let streak = 0
        const clientAll = allSessions.filter((s: any) => s.client_id === p.id)
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
        const mealsPlanned = summary?.meals_planned || (plan?.meals ? (Array.isArray(plan.meals) ? plan.meals.length : 0) : 0)
        const mealsCompleted = summary?.meals_completed || 0
        const caloriesLogged = summary?.total_calories || 0
        const caloriesTarget = plan?.calories_target || 0

        // Needs attention: behind on workouts OR not logging nutrition
        const workoutBehind = workoutsThisWeek < Math.floor(expectedPerWeek * (new Date().getDay() || 7) / 7)
        const nutritionBehind = hasNutritionPlan && !summary
        const needsAttention = workoutBehind || nutritionBehind

        return {
          id: p.id,
          fullName,
          initials: initials.toUpperCase(),
          avatarUrl: p.avatar_url,
          workoutsThisWeek,
          expectedPerWeek,
          workedOutToday,
          workoutStreak: streak,
          hasNutritionPlan,
          mealsLoggedToday: mealsCompleted,
          mealsPlannedToday: mealsPlanned,
          nutritionLoggedToday: mealsCompleted > 0,
          caloriesLogged,
          caloriesTarget,
          needsAttention,
        }
      })

      // Sort: needs attention first, then alphabetically
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

  async function sendPrompt(clientId: string, type: 'workout' | 'nutrition') {
    try {
      setSendingPrompt(`${clientId}-${type}`)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const messages: Record<string, string> = {
        workout: 'Hey! 💪 Heb je vandaag al getraind? Probeer vandaag je sessie in te plannen. Elke workout telt!',
        nutrition: 'Hey! 🍽️ Vergeet niet je voeding bij te houden vandaag. Het kost maar 2 minuten en helpt enorm voor je resultaten!',
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

  // Filter logic
  const filtered = clients.filter(c => {
    if (filter === 'behind') return c.needsAttention
    if (filter === 'on-track') return !c.needsAttention
    return true
  })

  const behindCount = clients.filter(c => c.needsAttention).length
  const onTrackCount = clients.filter(c => !c.needsAttention).length

  // ─── Loading ────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-56 bg-[#F0EDE7] rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-[#E8E4DC] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[22px] font-semibold text-[#1A1917] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
          Opvolging vandaag
        </h2>
        <div className="flex gap-1.5">
          {[
            { key: 'all' as FilterMode, label: `Iedereen (${clients.length})` },
            { key: 'behind' as FilterMode, label: `Achter (${behindCount})`, color: 'text-[#FF3B30]' },
            { key: 'on-track' as FilterMode, label: `Op schema (${onTrackCount})`, color: 'text-[#34C759]' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f.key
                  ? 'bg-[#1A1917] text-white'
                  : `bg-[#F5F2EC] ${f.color || 'text-[#6B6862]'} hover:bg-[#EBE8E0]`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => {
          const initials = client.initials
          const workoutPct = Math.min(100, Math.round((client.workoutsThisWeek / client.expectedPerWeek) * 100))
          const nutritionPct = client.caloriesTarget > 0 ? Math.min(100, Math.round((client.caloriesLogged / client.caloriesTarget) * 100)) : 0

          return (
            <div
              key={client.id}
              className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-md ${
                client.needsAttention
                  ? 'border-[#FF3B30]/20 shadow-[0_0_0_1px_rgba(255,59,48,0.05)]'
                  : 'border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
              }`}
            >
              {/* Header: Avatar + Name */}
              <Link href={`/coach/clients/${client.id}`} className="flex items-center gap-3 mb-4 group">
                <div className="w-10 h-10 rounded-full bg-[#F5F2EC] flex items-center justify-center text-[13px] font-semibold text-[#8E8E93] flex-shrink-0 overflow-hidden">
                  {client.avatarUrl ? (
                    <Image src={client.avatarUrl} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized loading="lazy" />
                  ) : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1917] truncate group-hover:text-[#D46A3A] transition-colors">
                    {client.fullName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {client.needsAttention && (
                      <span className="text-[11px] font-semibold text-[#FF3B30] flex items-center gap-0.5">
                        <AlertTriangle size={11} /> Achter
                      </span>
                    )}
                    {client.workoutStreak > 1 && (
                      <span className="text-[11px] font-semibold text-[#FF9500] flex items-center gap-0.5">
                        <Flame size={11} /> {client.workoutStreak}w streak
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#D5D0C8] group-hover:text-[#1A1917] transition-colors flex-shrink-0" strokeWidth={1.5} />
              </Link>

              {/* Workout Row */}
              <div className="flex items-center gap-3 py-2.5 border-t border-[#F5F2EC]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  client.workedOutToday ? 'bg-[#34C759]/10' : 'bg-[#F5F2EC]'
                }`}>
                  <Dumbbell size={16} className={client.workedOutToday ? 'text-[#34C759]' : 'text-[#A09D96]'} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-[#6B6862]">Workout</span>
                    <span className={`text-[12px] font-semibold tabular-nums ${
                      workoutPct >= 80 ? 'text-[#34C759]' : workoutPct >= 50 ? 'text-[#FF9500]' : 'text-[#FF3B30]'
                    }`}>
                      {client.workoutsThisWeek}/{client.expectedPerWeek}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#F5F2EC] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${workoutPct}%`,
                        backgroundColor: workoutPct >= 80 ? '#34C759' : workoutPct >= 50 ? '#FF9500' : '#FF3B30',
                      }}
                    />
                  </div>
                </div>
                {/* Quick prompt button */}
                {!client.workedOutToday && (
                  <button
                    onClick={() => sendPrompt(client.id, 'workout')}
                    disabled={sendingPrompt !== null || promptSent.has(`${client.id}-workout`)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      promptSent.has(`${client.id}-workout`)
                        ? 'bg-[#34C759]/10'
                        : 'bg-[#F5F2EC] hover:bg-[#D46A3A]/10 hover:text-[#D46A3A]'
                    }`}
                    title="Stuur een herinnering"
                  >
                    {promptSent.has(`${client.id}-workout`) ? (
                      <CheckCircle2 size={14} className="text-[#34C759]" />
                    ) : sendingPrompt === `${client.id}-workout` ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#D46A3A] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={14} className="text-[#A09D96]" />
                    )}
                  </button>
                )}
                {client.workedOutToday && (
                  <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-[#34C759]" />
                  </div>
                )}
              </div>

              {/* Nutrition Row */}
              <div className="flex items-center gap-3 py-2.5 border-t border-[#F5F2EC]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  client.nutritionLoggedToday ? 'bg-[#D46A3A]/10' : 'bg-[#F5F2EC]'
                }`}>
                  <UtensilsCrossed size={16} className={client.nutritionLoggedToday ? 'text-[#D46A3A]' : 'text-[#A09D96]'} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  {client.hasNutritionPlan ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-[#6B6862]">Voeding</span>
                        <span className={`text-[12px] font-semibold tabular-nums ${
                          client.nutritionLoggedToday ? 'text-[#D46A3A]' : 'text-[#A09D96]'
                        }`}>
                          {client.mealsLoggedToday}/{client.mealsPlannedToday} maaltijden
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#F5F2EC] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${client.mealsPlannedToday > 0 ? Math.min(100, (client.mealsLoggedToday / client.mealsPlannedToday) * 100) : 0}%`,
                            backgroundColor: '#D46A3A',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-[12px] text-[#C5C2BC] italic">Geen voedingsplan</span>
                  )}
                </div>
                {/* Quick prompt button */}
                {client.hasNutritionPlan && !client.nutritionLoggedToday && (
                  <button
                    onClick={() => sendPrompt(client.id, 'nutrition')}
                    disabled={sendingPrompt !== null || promptSent.has(`${client.id}-nutrition`)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      promptSent.has(`${client.id}-nutrition`)
                        ? 'bg-[#34C759]/10'
                        : 'bg-[#F5F2EC] hover:bg-[#D46A3A]/10 hover:text-[#D46A3A]'
                    }`}
                    title="Stuur een herinnering"
                  >
                    {promptSent.has(`${client.id}-nutrition`) ? (
                      <CheckCircle2 size={14} className="text-[#34C759]" />
                    ) : sendingPrompt === `${client.id}-nutrition` ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#D46A3A] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={14} className="text-[#A09D96]" />
                    )}
                  </button>
                )}
                {client.hasNutritionPlan && client.nutritionLoggedToday && (
                  <div className="w-8 h-8 rounded-lg bg-[#D46A3A]/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-[#D46A3A]" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[14px] text-[#A09D96]">
            {filter === 'behind' ? 'Geen cliënten achter op schema!' : 'Geen cliënten gevonden.'}
          </p>
        </div>
      )}
    </div>
  )
}
