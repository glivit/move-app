'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { PhotoUploadStep } from '@/components/client/PhotoUploadStep'
import { TapeMeasurementsStep } from '@/components/client/TapeMeasurementsStep'
import {
  ChevronLeft,
  Check,
  Zap,
  Trophy,
  Loader2,
  Sparkles,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────── */

interface OnboardingData {
  // Stap 1: Jij
  sex: 'male' | 'female' | ''
  date_of_birth: string
  height_cm: string
  weight_kg: string
  // Stap 2: Doel
  goal_type: string
  goal_weight_kg: string
  goal_description: string
  goal_pace: string
  motivation_statement: string
  previous_attempts: boolean
  previous_attempts_detail: string
  // Stap 3: Leefstijl
  work_type: string
  sleep_hours_avg: number
  stress_level: string
  alcohol: string
  caffeine: string
  meals_per_day: string
  social_context: string
  // Stap 4: Voeding
  favorite_meals: string[]
  hated_foods: string[]
  allergies: string[]
  cooking_style: string
  current_snacks: string[]
  snack_reason: string[]
  snack_preference: string
  evening_snacker: string
  food_adventurousness: number
  typical_daily_eating: string
  // Stap 5: Training & Gezondheid
  training_location: string
  home_equipment: string[]
  experience_level: number
  training_frequency: number
  training_types: string[]
  session_duration: string
  preferred_training_days: string[]
  has_injuries: boolean
  injuries_limitations: string
  has_food_relationship_issues: boolean
}

/* ─── Step definitions ──────────────────────────────────── */

const STEPS = [
  { id: 'welcome', title: 'Welkom bij MŌVE' },
  { id: 'you', title: 'Jij' },
  { id: 'goal', title: 'Je doel' },
  { id: 'lifestyle', title: 'Je leefstijl' },
  { id: 'nutrition', title: 'Je voeding' },
  { id: 'training', title: 'Training & gezondheid' },
  { id: 'photos', title: "Foto's & metingen" },
  { id: 'generating', title: 'Even geduld...' },
  { id: 'complete', title: 'Klaar!' },
]

const TOTAL = STEPS.length

/* ─── Chip component ────────────────────────────────────── */

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
        selected
          ? 'bg-[#1A1917] text-white shadow-sm'
          : 'bg-[#F5F2EC] text-[#6B6862] border border-[#E5E1D9] hover:border-[#CCC7BC]'
      }`}
    >
      {label}
    </button>
  )
}

function ChipMulti({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip key={opt} label={opt} selected={selected.includes(opt)} onClick={() => toggle(opt)} />
      ))}
    </div>
  )
}

function ChipSingle({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip key={opt} label={opt} selected={value === opt} onClick={() => onChange(opt)} />
      ))}
    </div>
  )
}

/* ─── Slider component ──────────────────────────────────── */

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  leftLabel,
  rightLabel,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  leftLabel?: string
  rightLabel?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm font-medium text-[#1A1917]">{label}</label>
        <span className="text-sm font-semibold text-[#D46A3A]">
          {value}{unit || ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-[#E5E1D9] accent-[#1A1917] cursor-pointer"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-[#A09D96] mt-1.5">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  )
}

/* ─── Tag input component ───────────────────────────────── */

function TagInput({
  label,
  placeholder,
  suggestions,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  suggestions: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag))

  return (
    <div>
      <label className="text-sm font-medium text-[#1A1917] block mb-2">{label}</label>
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1A1917] text-white text-xs font-medium rounded-full"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-[#A09D96] transition-colors">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag(input)
          }
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
      />
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="px-3 py-1.5 text-xs text-[#6B6862] bg-[#F5F2EC] border border-dashed border-[#DDD9D0] rounded-full hover:border-[#1A1917] hover:text-[#1A1917] transition-all"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

/* ─── Section label ─────────────────────────────────────── */

function SectionLabel({ text }: { text: string }) {
  return <p className="text-sm font-medium text-[#1A1917] mb-2">{text}</p>
}

/* ─── Completion screen — mat black → fade to dashboard ──── */

function CompletionScreen() {
  const router = useRouter()
  const [phase, setPhase] = useState<'black' | 'greeting' | 'fading'>('black')

  useEffect(() => {
    // Phase 1: mat black for 400ms
    const t1 = setTimeout(() => setPhase('greeting'), 400)
    // Phase 2: show greeting for 2s
    const t2 = setTimeout(() => setPhase('fading'), 2400)
    // Phase 3: navigate after fade
    const t3 = setTimeout(() => {
      router.push('/client')
      router.refresh()
    }, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [router])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 6) return 'Goedenacht'
    if (h < 12) return 'Goedemorgen'
    if (h < 18) return 'Goedemiddag'
    return 'Goedenavond'
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A1917]"
      style={{
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <p
        className="text-[15px] text-white/40 tracking-[0.3px]"
        style={{
          fontFamily: 'var(--font-body)',
          opacity: phase === 'greeting' ? 1 : 0,
          transform: phase === 'greeting' ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {greeting}
      </p>
      <h1
        className="text-[42px] font-bold text-white tracking-tight mt-2"
        style={{
          fontFamily: 'var(--font-display)',
          opacity: phase === 'greeting' ? 1 : 0,
          transform: phase === 'greeting' ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.6s 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Let&apos;s MŌVE
      </h1>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animatingOut, setAnimatingOut] = useState(false)

  const [data, setData] = useState<OnboardingData>({
    sex: '',
    date_of_birth: '',
    height_cm: '',
    weight_kg: '',
    goal_type: '',
    goal_weight_kg: '',
    goal_description: '',
    goal_pace: '',
    motivation_statement: '',
    previous_attempts: false,
    previous_attempts_detail: '',
    work_type: '',
    sleep_hours_avg: 7,
    stress_level: '',
    alcohol: '',
    caffeine: '',
    meals_per_day: '',
    social_context: '',
    favorite_meals: [],
    hated_foods: [],
    allergies: [],
    cooking_style: '',
    current_snacks: [],
    snack_reason: [],
    snack_preference: '',
    evening_snacker: '',
    food_adventurousness: 5,
    typical_daily_eating: '',
    training_location: '',
    home_equipment: [],
    experience_level: 1,
    training_frequency: 3,
    training_types: [],
    session_duration: '',
    preferred_training_days: [],
    has_injuries: false,
    injuries_limitations: '',
    has_food_relationship_issues: false,
  })

  const [photos, setPhotos] = useState<{
    front: File | null; back: File | null; left: File | null; right: File | null
  }>({ front: null, back: null, left: null, right: null })

  const [tapeMeasurements, setTapeMeasurements] = useState<Record<string, string>>({
    chest_cm: '', waist_cm: '', hips_cm: '',
    left_arm_cm: '', right_arm_cm: '',
    left_thigh_cm: '', right_thigh_cm: '',
    left_calf_cm: '', right_calf_cm: '',
  })

  /* ─── Helpers ───────────────────────────────────────── */

  const update = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const daysFull = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
  const daysShort = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  const goTo = (s: number) => {
    setAnimatingOut(true)
    setTimeout(() => {
      setStep(s)
      setError(null)
      setAnimatingOut(false)
    }, 250)
  }

  const parseNum = (v: string) => (v ? parseFloat(v.replace(',', '.')) : null)

  /* ─── Submit ────────────────────────────────────────── */

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Niet aangemeld'); setSubmitting(false); return }

      // Upload photos
      const photoUrls: Record<string, string | null> = { front: null, back: null, left: null, right: null }
      for (const [pos, file] of Object.entries(photos)) {
        if (file) {
          const fileName = `${user.id}/onboarding_${pos}.jpg`
          const { error: upErr } = await supabase.storage.from('checkin-photos').upload(fileName, file, { upsert: true })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('checkin-photos').getPublicUrl(fileName)
            photoUrls[pos] = urlData.publicUrl
          }
        }
      }

      // Save intake form
      const { error: insertError } = await supabase.from('intake_forms').insert({
        client_id: user.id,
        // Stap 1
        weight_kg: parseNum(data.weight_kg),
        height_cm: parseNum(data.height_cm),
        age: data.date_of_birth ? Math.floor((Date.now() - new Date(data.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        // Stap 2
        primary_goal: data.goal_type,
        goal_type: data.goal_type,
        goal_weight_kg: parseNum(data.goal_weight_kg),
        goal_description: data.goal_description,
        goal_pace: data.goal_pace,
        motivation_statement: data.motivation_statement,
        previous_attempts: data.previous_attempts,
        previous_attempts_detail: data.previous_attempts_detail || null,
        // Stap 3
        work_type: data.work_type,
        sleep_hours_avg: data.sleep_hours_avg,
        stress_level: data.stress_level === 'Laag' ? 2 : data.stress_level === 'Gemiddeld' ? 5 : data.stress_level === 'Hoog' ? 8 : null,
        alcohol: data.alcohol,
        caffeine: data.caffeine,
        meals_per_day: data.meals_per_day,
        social_context: data.social_context,
        // Stap 4
        favorite_meals: data.favorite_meals,
        hated_foods: data.hated_foods,
        allergies: data.allergies,
        dietary_preferences: data.cooking_style,
        dietary_restrictions: data.allergies.join(', '),
        cooking_style: data.cooking_style,
        current_snacks: data.current_snacks,
        snack_reason: data.snack_reason,
        snack_preference: data.snack_preference,
        evening_snacker: data.evening_snacker,
        food_adventurousness: data.food_adventurousness,
        typical_daily_eating: data.typical_daily_eating || null,
        // Stap 5
        training_location: data.training_location,
        home_equipment: data.home_equipment,
        experience_level: data.experience_level === 0 ? 'beginner' : data.experience_level === 1 ? 'intermediate' : 'advanced',
        current_activity_level: `${data.training_frequency}x per week`,
        training_experience: data.training_types.join(', '),
        training_frequency: data.training_frequency,
        training_types: data.training_types,
        session_duration: data.session_duration,
        preferred_training_days: data.preferred_training_days,
        has_injuries: data.has_injuries,
        injuries_limitations: data.injuries_limitations || null,
        has_food_relationship_issues: data.has_food_relationship_issues,
        // Photos
        photo_front_url: photoUrls.front,
        photo_back_url: photoUrls.back,
        photo_left_url: photoUrls.left,
        photo_right_url: photoUrls.right,
        // Tape
        chest_cm: parseNum(tapeMeasurements.chest_cm),
        waist_cm: parseNum(tapeMeasurements.waist_cm),
        hips_cm: parseNum(tapeMeasurements.hips_cm),
        left_arm_cm: parseNum(tapeMeasurements.left_arm_cm),
        right_arm_cm: parseNum(tapeMeasurements.right_arm_cm),
        left_thigh_cm: parseNum(tapeMeasurements.left_thigh_cm),
        right_thigh_cm: parseNum(tapeMeasurements.right_thigh_cm),
        left_calf_cm: parseNum(tapeMeasurements.left_calf_cm),
        right_calf_cm: parseNum(tapeMeasurements.right_calf_cm),
        completed: true,
      })

      if (insertError) {
        setError('Fout bij opslaan: ' + insertError.message)
        setSubmitting(false)
        return
      }

      // Update profile
      await supabase.from('profiles').update({
        sex: data.sex || null,
        date_of_birth: data.date_of_birth || null,
        height_cm: parseNum(data.height_cm),
        intake_completed: true,
      }).eq('id', user.id)

      // Initial weight tracking
      if (data.weight_kg) {
        await supabase.from('health_metrics').insert({
          client_id: user.id,
          metric_type: 'weight',
          value: parseNum(data.weight_kg),
          measured_at: new Date().toISOString(),
        }).then(() => {})
      }

      // Go to AI generation screen
      goTo(TOTAL - 2) // 'generating' step
      setSubmitting(false)
      setAiGenerating(true)

      // Trigger AI nutrition plan generation
      try {
        await fetch('/api/ai/nutrition-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
      } catch {
        // Non-blocking — plan can be generated later
      }

      setAiGenerating(false)
      goTo(TOTAL - 1) // 'complete' step
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
      setSubmitting(false)
    }
  }

  /* ─── Progress ──────────────────────────────────────── */

  const progress = (step / (TOTAL - 1)) * 100
  const lastFormStep = TOTAL - 3 // photos step index

  /* ─── Render ────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#EEEBE3] flex flex-col">
      {/* Progress bar */}
      {step > 0 && step < TOTAL - 1 && (
        <div className="h-1 bg-[#E5E1D9]">
          <div className="h-full bg-[#1A1917] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto">
        <div className={`w-full max-w-md transition-all duration-250 ${animatingOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>

          {/* ═══ STEP 0: Welcome ═══ */}
          {step === 0 && (
            <div className="space-y-6 pt-8">
              <div className="h-16 w-16 bg-gradient-to-br from-[#D46A3A]/20 to-[#D46A3A]/10 rounded-3xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-[#D46A3A]" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-4xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] leading-tight">
                  Welkom bij MŌVE
                </h1>
                <p className="text-[#6B6862] mt-3 leading-relaxed">
                  Laten we je even leren kennen zodat we het perfecte plan kunnen maken. Duurt maar 4 minuten.
                </p>
              </div>
              <div className="space-y-2.5 pt-4">
                {['Gepersonaliseerd trainingsplan', 'Voedingsadvies op maat', 'Voedingsplan bij start'].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-[#3D8B5C] flex-shrink-0" strokeWidth={2} />
                    <span className="text-sm text-[#6B6862]">{t}</span>
                  </div>
                ))}
              </div>
              <div className="pt-6">
                <Button onClick={() => goTo(1)} fullWidth size="lg" className="bg-[#1A1917] text-white hover:bg-[#333]">
                  Laten we beginnen
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 1: Jij ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#A09D96] uppercase tracking-wider">Stap 1 van 6</p>
                <h2 className="text-2xl font-semibold text-[#1A1917] mt-1">Over jou</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <SectionLabel text="Geslacht" />
                  <ChipSingle options={['Man', 'Vrouw']} value={data.sex === 'male' ? 'Man' : data.sex === 'female' ? 'Vrouw' : ''} onChange={(v) => update('sex', v === 'Man' ? 'male' : 'female')} />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1A1917] block mb-2">Geboortedatum</label>
                  <input
                    type="date"
                    value={data.date_of_birth}
                    onChange={(e) => update('date_of_birth', e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-[#1A1917] block mb-2">Lengte (cm)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={data.height_cm}
                      onChange={(e) => update('height_cm', e.target.value)}
                      placeholder="178"
                      className="w-full px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1A1917] block mb-2">Gewicht (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={data.weight_kg}
                      onChange={(e) => update('weight_kg', e.target.value)}
                      placeholder="82"
                      className="w-full px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Doel ═══ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#A09D96] uppercase tracking-wider">Stap 2 van 6</p>
                <h2 className="text-2xl font-semibold text-[#1A1917] mt-1">Je doel</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <SectionLabel text="Wat wil je bereiken?" />
                  <ChipSingle
                    options={['Vetverlies', 'Spiermassa', 'Sterker worden', 'Gezonder leven', 'Sportprestatie', 'Revalidatie']}
                    value={data.goal_type}
                    onChange={(v) => update('goal_type', v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-[#1A1917] block mb-2">Streefgewicht (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={data.goal_weight_kg}
                      onChange={(e) => update('goal_weight_kg', e.target.value)}
                      placeholder="75"
                      className="w-full px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1A1917] block mb-2">Of beschrijf het</label>
                    <input
                      type="text"
                      value={data.goal_description}
                      onChange={(e) => update('goal_description', e.target.value)}
                      placeholder="Strakker, meer energie"
                      className="w-full px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
                    />
                  </div>
                </div>

                <div>
                  <SectionLabel text="Tempo" />
                  <ChipSingle
                    options={['Rustig & duurzaam', 'Gemiddeld', 'Zo snel mogelijk']}
                    value={data.goal_pace}
                    onChange={(v) => update('goal_pace', v)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1A1917] block mb-2">Waarom wil je dit?</label>
                  <textarea
                    value={data.motivation_statement}
                    onChange={(e) => update('motivation_statement', e.target.value)}
                    placeholder="Je motivatie in een paar woorden..."
                    rows={2}
                    maxLength={200}
                    className="w-full px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20 resize-none"
                  />
                </div>

                <div>
                  <SectionLabel text="Eerder geprobeerd?" />
                  <ChipSingle
                    options={['Ja', 'Nee']}
                    value={data.previous_attempts ? 'Ja' : 'Nee'}
                    onChange={(v) => update('previous_attempts', v === 'Ja')}
                  />
                  {data.previous_attempts && (
                    <input
                      type="text"
                      value={data.previous_attempts_detail}
                      onChange={(e) => update('previous_attempts_detail', e.target.value)}
                      placeholder="Wat ging mis?"
                      className="w-full mt-2 px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Leefstijl ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#A09D96] uppercase tracking-wider">Stap 3 van 6</p>
                <h2 className="text-2xl font-semibold text-[#1A1917] mt-1">Je leefstijl</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <SectionLabel text="Type werk" />
                  <ChipSingle
                    options={['Zittend', 'Staand', 'Licht fysiek', 'Zwaar fysiek']}
                    value={data.work_type}
                    onChange={(v) => update('work_type', v)}
                  />
                </div>

                <SliderField
                  label="Slaap per nacht"
                  value={data.sleep_hours_avg}
                  min={4}
                  max={10}
                  step={0.5}
                  unit=" uur"
                  leftLabel="4 uur"
                  rightLabel="10 uur"
                  onChange={(v) => update('sleep_hours_avg', v)}
                />

                <div>
                  <SectionLabel text="Stressniveau" />
                  <ChipSingle
                    options={['Laag', 'Gemiddeld', 'Hoog']}
                    value={data.stress_level}
                    onChange={(v) => update('stress_level', v)}
                  />
                </div>

                <div>
                  <SectionLabel text="Alcohol" />
                  <ChipSingle
                    options={['Nee', 'Af en toe', 'Regelmatig', 'Dagelijks']}
                    value={data.alcohol}
                    onChange={(v) => update('alcohol', v)}
                  />
                </div>

                <div>
                  <SectionLabel text="Koffie/cafeïne" />
                  <ChipSingle
                    options={['Geen', '1-2 per dag', '3+ per dag']}
                    value={data.caffeine}
                    onChange={(v) => update('caffeine', v)}
                  />
                </div>

                <div>
                  <SectionLabel text="Maaltijden per dag" />
                  <ChipSingle
                    options={['2 maaltijden', '3 maaltijden', '4+ maaltijden']}
                    value={data.meals_per_day}
                    onChange={(v) => update('meals_per_day', v)}
                  />
                </div>

                <div>
                  <SectionLabel text="Ik kook..." />
                  <ChipSingle
                    options={['Voor mezelf', 'Voor gezin', 'Eet veel buitenshuis']}
                    value={data.social_context}
                    onChange={(v) => update('social_context', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Voeding ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#A09D96] uppercase tracking-wider">Stap 4 van 6</p>
                <h2 className="text-2xl font-semibold text-[#1A1917] mt-1">Je voeding</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <SectionLabel text="Wat eet je op een doorsnee dag?" />
                  <p className="text-[12px] text-[#A09D96] mb-2">Beschrijf kort je typische ontbijt, lunch, avondeten en tussendoortjes</p>
                  <textarea
                    value={data.typical_daily_eating}
                    onChange={(e) => update('typical_daily_eating', e.target.value)}
                    placeholder="bv. Ontbijt: boterhammen met kaas. Lunch: broodje van de bakker. Avond: pasta of rijst met kip. Tussendoor: koekje bij de koffie..."
                    rows={4}
                    className="w-full rounded-xl border border-[#E5E1D9] bg-white px-4 py-3 text-[14px] text-[#1A1917] placeholder:text-[#C8C8C8] outline-none focus:border-[#D46A3A]/40 transition-colors resize-none"
                  />
                </div>

                <TagInput
                  label="Favoriete maaltijden"
                  placeholder="Typ en druk enter..."
                  suggestions={['Pasta', 'Sushi', 'Steak', 'Curry', 'Pizza', 'Salade', 'Burgers', 'Rijst', 'Vis']}
                  value={data.favorite_meals}
                  onChange={(v) => update('favorite_meals', v)}
                />

                <TagInput
                  label="Haat-voedsel"
                  placeholder="Wat eet je absoluut niet?"
                  suggestions={['Lever', 'Olijven', 'Ansjovissen', 'Spruiten', 'Bloemkool']}
                  value={data.hated_foods}
                  onChange={(v) => update('hated_foods', v)}
                />

                <div>
                  <SectionLabel text="Allergieën of restricties" />
                  <ChipMulti
                    options={['Geen', 'Vegetarisch', 'Veganistisch', 'Lactosevrij', 'Glutenvrij', 'Notenallergie']}
                    selected={data.allergies}
                    onChange={(v) => update('allergies', v)}
                  />
                </div>

                <div>
                  <SectionLabel text="Hoe kook je het liefst?" />
                  <ChipSingle
                    options={['Vers koken', 'Snel (<20 min)', 'Mealprep']}
                    value={data.cooking_style}
                    onChange={(v) => update('cooking_style', v)}
                  />
                </div>

                <TagInput
                  label="Huidige snacks"
                  placeholder="Wat snack je nu?"
                  suggestions={['Chips', 'Chocolade', 'Noten', 'Fruit', 'Koekjes', 'Crackers', 'Kaas']}
                  value={data.current_snacks}
                  onChange={(v) => update('current_snacks', v)}
                />
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Training & Gezondheid ═══ */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#A09D96] uppercase tracking-wider">Stap 5 van 6</p>
                <h2 className="text-2xl font-semibold text-[#1A1917] mt-1">Training & gezondheid</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <SectionLabel text="Waar train je?" />
                  <ChipSingle
                    options={['Sportschool', 'Home gym', 'Buiten']}
                    value={data.training_location}
                    onChange={(v) => update('training_location', v)}
                  />
                </div>

                {data.training_location === 'Home gym' && (
                  <div>
                    <SectionLabel text="Beschikbare apparatuur" />
                    <ChipMulti
                      options={['Dumbbells', 'Barbell + rack', 'Kabelstation', 'Pull-up bar', 'Resistance bands', 'Cardio apparaat', 'Kettlebells']}
                      selected={data.home_equipment}
                      onChange={(v) => update('home_equipment', v)}
                    />
                  </div>
                )}

                <SliderField
                  label="Ervaring"
                  value={data.experience_level}
                  min={0}
                  max={2}
                  step={1}
                  leftLabel="Beginner"
                  rightLabel="Ervaren"
                  onChange={(v) => update('experience_level', v)}
                />

                <SliderField
                  label="Hoe vaak train je per week?"
                  value={data.training_frequency}
                  min={0}
                  max={7}
                  step={1}
                  unit="x"
                  leftLabel="0x"
                  rightLabel="7x"
                  onChange={(v) => update('training_frequency', v)}
                />

                <div>
                  <SectionLabel text="Type training" />
                  <ChipMulti
                    options={['Kracht', 'Cardio', 'HIIT', 'Yoga/stretching']}
                    selected={data.training_types}
                    onChange={(v) => update('training_types', v)}
                  />
                </div>

                <div>
                  <SectionLabel text="Tijd per sessie" />
                  <ChipSingle
                    options={['30 min', '45 min', '60 min', '75+ min']}
                    value={data.session_duration}
                    onChange={(v) => update('session_duration', v)}
                  />
                </div>

                <div>
                  <SectionLabel text="Beschikbare dagen" />
                  <div className="grid grid-cols-7 gap-2">
                    {daysFull.map((dayFull, idx) => (
                      <button
                        key={dayFull}
                        type="button"
                        onClick={() => {
                          const days = data.preferred_training_days
                          update('preferred_training_days', days.includes(dayFull) ? days.filter((d) => d !== dayFull) : [...days, dayFull])
                        }}
                        className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          data.preferred_training_days.includes(dayFull)
                            ? 'bg-[#1A1917] text-white'
                            : 'bg-[#F5F2EC] text-[#6B6862] border border-[#E5E1D9]'
                        }`}
                      >
                        {daysShort[idx]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel text="Blessures of pijnklachten?" />
                  <ChipSingle
                    options={['Ja', 'Nee']}
                    value={data.has_injuries ? 'Ja' : 'Nee'}
                    onChange={(v) => update('has_injuries', v === 'Ja')}
                  />
                  {data.has_injuries && (
                    <input
                      type="text"
                      value={data.injuries_limitations}
                      onChange={(e) => update('injuries_limitations', e.target.value)}
                      placeholder="Bijv. schouder links, onderrug"
                      className="w-full mt-2 px-4 py-3 text-sm bg-[#F5F2EC] border border-[#E5E1D9] rounded-2xl text-[#1A1917] placeholder:text-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20"
                    />
                  )}
                </div>

                <div className="pt-2 border-t border-[#E5E1D9]">
                  <SectionLabel text="Heb je een verleden met eetproblemen?" />
                  <ChipSingle
                    options={['Ja', 'Nee']}
                    value={data.has_food_relationship_issues ? 'Ja' : 'Nee'}
                    onChange={(v) => update('has_food_relationship_issues', v === 'Ja')}
                  />
                  <p className="text-xs text-[#A09D96] mt-1.5">Vertrouwelijk — helpt ons veilig te adviseren.</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 6: Foto's & metingen (optioneel) ═══ */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#A09D96] uppercase tracking-wider">Stap 6 van 6</p>
                <h2 className="text-2xl font-semibold text-[#1A1917] mt-1">Foto's & metingen</h2>
                <p className="text-sm text-[#6B6862] mt-1">Optioneel — je coach kan dit ook later invullen.</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#E5E1D9]">
                <PhotoUploadStep photos={photos} onChange={setPhotos} />
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#E5E1D9]">
                <TapeMeasurementsStep measurements={tapeMeasurements} onChange={setTapeMeasurements} />
              </div>
            </div>
          )}

          {/* ═══ STEP 7: AI Generating ═══ */}
          {step === TOTAL - 2 && (
            <div className="space-y-6 pt-16 text-center">
              <div className="h-20 w-20 bg-gradient-to-br from-[#D46A3A]/20 to-[#D46A3A]/10 rounded-3xl flex items-center justify-center mx-auto">
                {aiGenerating ? (
                  <Loader2 className="w-10 h-10 text-[#D46A3A] animate-spin" strokeWidth={1.5} />
                ) : (
                  <Sparkles className="w-10 h-10 text-[#D46A3A]" strokeWidth={1.5} />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#1A1917]">
                  {aiGenerating ? 'Even geduld...' : 'Bijna klaar!'}
                </h2>
                <p className="text-[#6B6862] mt-2">
                  {aiGenerating
                    ? 'Je coach stelt je persoonlijke voedingsplan samen op basis van je gegevens.'
                    : 'Je voedingsplan is klaar!'}
                </p>
              </div>
              {aiGenerating && (
                <div className="flex justify-center gap-1 pt-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#D46A3A] animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 8: Complete — mat black greeting → fade to dashboard ═══ */}
          {step === TOTAL - 1 && <CompletionScreen />}
        </div>
      </div>

      {/* Footer Navigation */}
      {step > 0 && step <= lastFormStep && (
        <div className="border-t border-[#E5E1D9] bg-white px-6 py-4 safe-area-bottom">
          <div className="max-w-md mx-auto flex gap-3">
            <button
              onClick={() => goTo(step - 1)}
              className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-[#6B6862] hover:text-[#1A1917] rounded-2xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              Terug
            </button>

            {step < lastFormStep ? (
              <Button onClick={() => goTo(step + 1)} fullWidth className="bg-[#1A1917] text-white hover:bg-[#333]">
                Volgende
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting} fullWidth className="bg-[#1A1917] text-white hover:bg-[#333]">
                Afronden
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#C4372A] text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium z-50 animate-bounce">
          {error}
        </div>
      )}
    </div>
  )
}
