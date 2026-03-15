'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, UtensilsCrossed, CheckCircle2, Send, Loader2 } from 'lucide-react'

interface AccountabilityLog {
  id: string
  date: string
  workout_completed: boolean
  nutrition_logged: boolean
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
      setError('Vul in waarom je je voeding niet hebt bijgehouden')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/accountability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: log.id,
          workout_reason: workoutReason || null,
          nutrition_reason: nutritionReason || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Er ging iets mis')
        return
      }

      setSubmitted(true)
    } catch (err) {
      setError('Fout bij versturen')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold text-text-primary">Dagelijkse check</h1>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-client-surface-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // No log for today — all good
  if (!log) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold text-text-primary">Dagelijkse check</h1>
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#34C759] mx-auto mb-3" />
          <p className="font-semibold text-text-primary text-lg">Alles op schema!</p>
          <p className="text-[14px] text-client-text-secondary mt-2">
            Je hebt vandaag alles gedaan. Ga zo door! 💪
          </p>
        </div>
      </div>
    )
  }

  // Already submitted
  if (submitted) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold text-text-primary">Dagelijkse check</h1>
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#34C759] mx-auto mb-3" />
          <p className="font-semibold text-text-primary text-lg">Bedankt voor je feedback!</p>
          <p className="text-[14px] text-client-text-secondary mt-2">
            Je coach bekijkt dit en helpt je op schema te blijven.
          </p>
        </div>
      </div>
    )
  }

  const needsWorkoutReason = !log.workout_completed
  const needsNutritionReason = !log.nutrition_logged

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Dagelijkse check</h1>
        <p className="text-[14px] text-client-text-secondary mt-1">
          Even terugblikken op je dag
        </p>
      </div>

      {/* Status cards */}
      <div className="space-y-3">
        {/* Workout status */}
        <div className={`rounded-2xl p-5 border ${
          log.workout_completed
            ? 'bg-[#F0FDF4] border-[#BBF7D0]'
            : 'bg-[#FFF7ED] border-[#FED7AA]'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              log.workout_completed ? 'bg-[#34C759]/20' : 'bg-[#FF9500]/20'
            }`}>
              <Dumbbell size={20} strokeWidth={1.5} className={
                log.workout_completed ? 'text-[#34C759]' : 'text-[#FF9500]'
              } />
            </div>
            <div>
              <p className="font-semibold text-text-primary">Training</p>
              <p className="text-[13px] text-client-text-secondary">
                {log.workout_completed ? 'Voltooid vandaag ✓' : 'Niet voltooid vandaag'}
              </p>
            </div>
          </div>

          {needsWorkoutReason && (
            <div className="mt-3">
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                Waarom heb je niet getraind? <span className="text-[#C4372A]">*</span>
              </label>
              <textarea
                value={workoutReason}
                onChange={(e) => setWorkoutReason(e.target.value)}
                placeholder="Bijv. drukke werkdag, niet lekker gevoeld, reisdag..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-[14px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-[#8B6914]/20 resize-none"
              />
            </div>
          )}
        </div>

        {/* Nutrition status */}
        <div className={`rounded-2xl p-5 border ${
          log.nutrition_logged
            ? 'bg-[#F0FDF4] border-[#BBF7D0]'
            : 'bg-[#FFF7ED] border-[#FED7AA]'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              log.nutrition_logged ? 'bg-[#34C759]/20' : 'bg-[#FF9500]/20'
            }`}>
              <UtensilsCrossed size={20} strokeWidth={1.5} className={
                log.nutrition_logged ? 'text-[#34C759]' : 'text-[#FF9500]'
              } />
            </div>
            <div>
              <p className="font-semibold text-text-primary">Voeding</p>
              <p className="text-[13px] text-client-text-secondary">
                {log.nutrition_logged ? 'Bijgehouden vandaag ✓' : 'Niet bijgehouden vandaag'}
              </p>
            </div>
          </div>

          {needsNutritionReason && (
            <div className="mt-3">
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                Waarom heb je je voeding niet gelogd? <span className="text-[#C4372A]">*</span>
              </label>
              <textarea
                value={nutritionReason}
                onChange={(e) => setNutritionReason(e.target.value)}
                placeholder="Bijv. uit eten geweest, vergeten, weekend..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-[14px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-[#8B6914]/20 resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[14px] text-[#C4372A] font-medium">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#8B6914] text-white rounded-2xl font-semibold text-[15px] hover:bg-[#7A5C12] transition-colors disabled:opacity-50"
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
