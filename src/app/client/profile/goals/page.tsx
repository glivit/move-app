'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, Loader2, Check, Target } from 'lucide-react'

const GOAL_OPTIONS = [
  { id: 'weight_loss', label: 'Gewichtsverlies', emoji: '🔥' },
  { id: 'muscle_gain', label: 'Spiermassa opbouwen', emoji: '💪' },
  { id: 'strength', label: 'Sterker worden', emoji: '🏋️' },
  { id: 'endurance', label: 'Uithoudingsvermogen', emoji: '🏃' },
  { id: 'flexibility', label: 'Flexibiliteit', emoji: '🧘' },
  { id: 'health', label: 'Algemene gezondheid', emoji: '❤️' },
  { id: 'stress', label: 'Stressvermindering', emoji: '🧠' },
  { id: 'posture', label: 'Houding verbeteren', emoji: '🦴' },
  { id: 'sport', label: 'Sport prestatie', emoji: '⚽' },
  { id: 'rehabilitation', label: 'Revalidatie', emoji: '🩹' },
]

export default function GoalsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null)
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>([])
  const [motivation, setMotivation] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      const { data } = await supabase
        .from('intake_forms')
        .select('primary_goal, secondary_goals, motivation_statement')
        .eq('client_id', user.id)
        .single()

      if (data) {
        setPrimaryGoal(data.primary_goal)
        setSecondaryGoals(data.secondary_goals || [])
        setMotivation(data.motivation_statement || '')
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const toggleSecondaryGoal = (goalId: string) => {
    if (goalId === primaryGoal) return
    setSecondaryGoals(prev =>
      prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('intake_forms')
      .upsert({
        client_id: user.id,
        primary_goal: primaryGoal,
        secondary_goals: secondaryGoals,
        motivation_statement: motivation || null,
        completed: true,
      }, { onConflict: 'client_id' })

    // Also update profile goals field
    const goalLabels = GOAL_OPTIONS.filter(g => g.id === primaryGoal || secondaryGoals.includes(g.id)).map(g => g.label)
    await supabase
      .from('profiles')
      .update({ goals: goalLabels.join(', ') })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1C1E18]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#1C1E18]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-editorial-h2 text-[#1C1E18]">
          Mijn doelen
        </h1>
      </div>

      {/* Primary Goal */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(28,30,24,0.62)] uppercase tracking-wide px-1 mb-2">Hoofddoel</p>
        <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.10)] divide-y divide-[rgba(28,30,24,0.10)]">
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => setPrimaryGoal(goal.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{goal.emoji}</span>
                <span className="text-[15px] text-[#1C1E18]">{goal.label}</span>
              </div>
              {primaryGoal === goal.id && (
                <div className="w-6 h-6 rounded-full bg-[#FDFDFE] flex items-center justify-center">
                  <Check strokeWidth={2.5} className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Goals */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(28,30,24,0.62)] uppercase tracking-wide px-1 mb-2">Nevendoelen (optioneel)</p>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.filter(g => g.id !== primaryGoal).map((goal) => {
            const selected = secondaryGoals.includes(goal.id)
            return (
              <button
                key={goal.id}
                onClick={() => toggleSecondaryGoal(goal.id)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  selected
                    ? 'bg-[#474B48] text-white'
                    : 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border border-[rgba(28,30,24,0.10)] text-[#1C1E18] hover:border-[#FDFDFE]'
                }`}
              >
                {goal.emoji} {goal.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Motivation */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(28,30,24,0.62)] uppercase tracking-wide px-1 mb-2">Motivatie</p>
        <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.10)] p-5">
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Waarom wil je dit bereiken? Wat drijft je?"
            rows={4}
            className="w-full text-[15px] text-[#1C1E18] bg-transparent placeholder:text-[rgba(28,30,24,0.60)] focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-[#474B48] text-white font-semibold text-[15px] hover:bg-[#3A3E3B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : saved ? (
          <>
            <Check strokeWidth={2} className="w-5 h-5" />
            Opgeslagen
          </>
        ) : (
          'Opslaan'
        )}
      </button>
    </div>
  )
}
