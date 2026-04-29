'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, UtensilsCrossed, CheckCircle2, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { invalidateCache } from '@/lib/fetcher'
import { optimisticMutate } from '@/lib/optimistic'
import { readDashboardCache, writeDashboardCache } from '@/lib/dashboard-cache'
import type { DashboardData } from '@/app/client/DashboardClient'

interface AccountabilityLog {
  id: string
  date: string
  workout_completed: boolean
  nutrition_logged: boolean
  meals_completed: number | null
  meals_total: number | null
  workout_reason: string | null
  nutrition_reason: string | null
  responded: boolean
}

export default function AccountabilityPage() {
  const router = useRouter()
  const [log, setLog] = useState<AccountabilityLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [workoutReason, setWorkoutReason] = useState('')
  const [nutritionReason, setNutritionReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadLog = async () => {
      try {
        const res = await fetch('/api/accountability')
        const data = await res.json()
        if (data.data) {
          setLog(data.data)
          if (data.data.responded) setSubmitted(true)
          if (data.data.workout_reason) setWorkoutReason(data.data.workout_reason)
          if (data.data.nutrition_reason) setNutritionReason(data.data.nutrition_reason)
        }
      } catch (err) {
        console.error('Error loading accountability:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLog()
  }, [])

  const handleSubmit = async () => {
    if (!log) return

    // Validate
    if (!log.workout_completed && !workoutReason.trim()) {
      setError('Vul in waarom je niet getraind hebt')
      return
    }
    if (!log.nutrition_logged && !nutritionReason.trim()) {
      setError('Vul in waarom je je voeding niet volledig hebt gelogd')
      return
    }

    setError('')
    setSubmitting(true)

    // Snapshot dashboard-cache vóór optimistic patch — nodig voor rollback.
    const supabase = createClient()
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const userId = authSession?.user?.id ?? null
    let cacheSnapshot: DashboardData | null = null
    if (userId) {
      const hit = await readDashboardCache<DashboardData>(userId).catch(() => null)
      cacheSnapshot = hit?.data ?? null
    }

    const logId = log.id
    const payloadWorkout = workoutReason || null
    const payloadNutrition = nutritionReason || null

    try {
      await optimisticMutate({
        key: `accountability-submit:${logId}`,
        apply: () => {
          // UI-voelt-instant: "Bedankt voor je feedback!" verschijnt meteen.
          setSubmitted(true)
          // Patch dashboard-cache zodat de home page de accountability-nudge
          // niet meer toont als de user terug-zwipet.
          if (userId && cacheSnapshot) {
            const nextData: DashboardData = {
              ...cacheSnapshot,
              actions: {
                ...cacheSnapshot.actions,
                accountabilityPending: false,
                pendingPrompt: null,
              },
            }
            writeDashboardCache(userId, nextData).catch(() => {})
          }
        },
        rollback: () => {
          setSubmitted(false)
          if (userId && cacheSnapshot) {
            writeDashboardCache(userId, cacheSnapshot).catch(() => {})
          }
        },
        commit: async () => {
          const res = await fetch('/api/accountability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              log_id: logId,
              workout_reason: payloadWorkout,
              nutrition_reason: payloadNutrition,
            }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Er ging iets mis')
          }
          return res
        },
        onSuccess: () => {
          invalidateCache('/api/dashboard')
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : 'Fout bij versturen'
          setError(msg)
        },
      })
    } catch {
      // Error/rollback zijn al uitgevoerd door optimisticMutate; de catch
      // voorkomt alleen een unhandled promise rejection in de render-cycle.
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8 animate-slide-up">
          <p className="text-label mb-3">Dagelijks</p>
          <h1 className="page-title-sm">
            Check
          </h1>
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-[rgba(255,255,255,0.50)] animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  // No log for today — all good
  if (!log) {
    return (
      <div className="space-y-6">
        <div className="mb-8 animate-slide-up">
          <p className="text-label mb-3">Dagelijks</p>
          <h1 className="page-title-sm">
            Check
          </h1>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-[rgba(28,30,24,0.10)] text-center animate-slide-up stagger-2">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#2FA65A] mx-auto mb-3" />
          <p className="font-semibold text-[#1C1E18] text-lg">Alles op schema!</p>
          <p className="text-[14px] text-[rgba(28,30,24,0.62)] mt-2">
            Je hebt vandaag alles gedaan. Ga zo door!
          </p>
        </div>
      </div>
    )
  }

  // Already submitted
  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="mb-8 animate-slide-up">
          <p className="text-label mb-3">Dagelijks</p>
          <h1 className="page-title-sm">
            Check
          </h1>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-[rgba(28,30,24,0.10)] text-center animate-slide-up stagger-2">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#2FA65A] mx-auto mb-3" />
          <p className="font-semibold text-[#1C1E18] text-lg">Bedankt voor je feedback!</p>
          <p className="text-[14px] text-[rgba(28,30,24,0.62)] mt-2">
            Je coach bekijkt dit en helpt je op schema te blijven.
          </p>
        </div>
      </div>
    )
  }

  const needsWorkoutReason = !log.workout_completed
  const needsNutritionReason = !log.nutrition_logged
  const hasMealProgress = log.meals_completed !== null && log.meals_total !== null && log.meals_total > 0

  // Build nutrition status text
  const nutritionStatusText = (() => {
    if (log.nutrition_logged) return 'Volledig bijgehouden vandaag'
    if (hasMealProgress && log.meals_completed! > 0) {
      return `${log.meals_completed} van ${log.meals_total} maaltijden gelogd`
    }
    return 'Niet bijgehouden vandaag'
  })()

  return (
    <div className="space-y-6">
      <div className="mb-8 animate-slide-up">
        <p className="text-label mb-3">Dagelijks</p>
        <h1 className="page-title-sm">
          Check
        </h1>
      </div>
      <p className="text-[14px] text-[rgba(28,30,24,0.62)]">
        Even terugblikken op je dag
      </p>

      {/* Status cards */}
      <div className="space-y-3 animate-slide-up stagger-2">
        {/* Workout status */}
        <div className={`p-5 border rounded-2xl ${
          log.workout_completed
            ? 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border-[#2FA65A]/20'
            : 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border-[#C0FC01]/20'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 flex items-center justify-center ${
              log.workout_completed ? 'bg-[#2FA65A]/20' : 'bg-[#C0FC01]/20'
            }`}>
              <Dumbbell size={20} strokeWidth={1.5} className={
                log.workout_completed ? 'text-[#2FA65A]' : 'text-[#C0FC01]'
              } />
            </div>
            <div>
              <p className="font-semibold text-[#1C1E18]">Training</p>
              <p className="text-[13px] text-[rgba(28,30,24,0.62)]">
                {log.workout_completed ? 'Voltooid vandaag' : 'Niet voltooid vandaag'}
              </p>
            </div>
          </div>

          {needsWorkoutReason && (
            <div className="mt-3">
              <label className="block text-[13px] font-medium text-[#1C1E18] mb-1.5">
                Waarom heb je niet getraind? <span className="text-[#B55A4A]">*</span>
              </label>
              <textarea
                value={workoutReason}
                onChange={(e) => setWorkoutReason(e.target.value)}
                placeholder="Bijv. drukke werkdag, niet lekker gevoeld, reisdag..."
                rows={3}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border border-[rgba(28,30,24,0.10)] text-[14px] placeholder-[rgba(253,253,254,0.55)] focus:outline-none focus:border-[#FDFDFE] resize-none rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Nutrition status */}
        <div className={`p-5 border rounded-2xl ${
          log.nutrition_logged
            ? 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border-[#2FA65A]/20'
            : 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border-[#C0FC01]/20'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 flex items-center justify-center ${
              log.nutrition_logged ? 'bg-[#2FA65A]/20' : 'bg-[#C0FC01]/20'
            }`}>
              <UtensilsCrossed size={20} strokeWidth={1.5} className={
                log.nutrition_logged ? 'text-[#2FA65A]' : 'text-[#C0FC01]'
              } />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#1C1E18]">Voeding</p>
              <p className="text-[13px] text-[rgba(28,30,24,0.62)]">
                {nutritionStatusText}
              </p>
            </div>
          </div>

          {/* Meal progress bar when partially complete */}
          {hasMealProgress && !log.nutrition_logged && log.meals_completed! > 0 && (
            <div className="mt-2 mb-3">
              <div className="h-2 bg-[rgba(255,255,255,0.50)] overflow-hidden">
                <div
                  className="h-full bg-[#C0FC01] transition-all"
                  style={{ width: `${(log.meals_completed! / log.meals_total!) * 100}%` }}
                />
              </div>
            </div>
          )}

          {needsNutritionReason && (
            <div className="mt-3">
              <label className="block text-[13px] font-medium text-[#1C1E18] mb-1.5">
                {hasMealProgress && log.meals_completed! > 0
                  ? 'Waarom heb je niet alle maaltijden gelogd?'
                  : 'Waarom heb je je voeding niet gelogd?'
                } <span className="text-[#B55A4A]">*</span>
              </label>
              <textarea
                value={nutritionReason}
                onChange={(e) => setNutritionReason(e.target.value)}
                placeholder="Bijv. uit eten geweest, vergeten, weekend..."
                rows={3}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border border-[rgba(28,30,24,0.10)] text-[14px] placeholder-[rgba(253,253,254,0.55)] focus:outline-none focus:border-[#FDFDFE] resize-none rounded-xl"
              />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[14px] text-[#B55A4A] font-medium">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#474B48] text-white font-semibold uppercase tracking-wider text-[15px] hover:bg-[#3A3E3B] transition-colors disabled:opacity-50 rounded-xl animate-slide-up stagger-3"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Versturen...
          </>
        ) : (
          <>
            <Send size={18} strokeWidth={1.5} />
            Versturen naar coach
          </>
        )}
      </button>
    </div>
  )
}
