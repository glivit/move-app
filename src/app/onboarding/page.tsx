'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PhotoUploadStep } from '@/components/client/PhotoUploadStep'
import { TapeMeasurementsStep } from '@/components/client/TapeMeasurementsStep'
import {
  ChevronLeft,
  Check,
  Zap,
  Camera,
  Lock,
  Loader2,
} from 'lucide-react'

/**
 * v3 Orion onboarding flow.
 *
 * Shell: #8E9890 canvas + thin lime progress bar. Each step lives in one or
 * more dark #474B48 cards with semi-transparent inputs. Footer is dark glass;
 * primary CTA is a white pill, "Afronden" is a lime pill. Error toast uses the
 * Orion amber-red.
 *
 * Keep in sync:
 *   lastFormStep = TOTAL - 1 (photos step). See feedback_onboarding_step_math
 *   in /mnt/.auto-memory — stale math here silently hides the footer.
 */

/* ─── Types ─────────────────────────────────────────────── */

interface OnboardingData {
  // Stap 1: Jij
  sex: 'male' | 'female' | ''
  date_of_birth: string
  height_cm: string
  weight_kg: string
  // Stap 2: Doel
  goal_type: string[]
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
  cooking_style: string[]
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
  { id: 'you', title: 'Over jou' },
  { id: 'goal', title: 'Je doel' },
  { id: 'lifestyle', title: 'Je leefstijl' },
  { id: 'nutrition', title: 'Je voeding' },
  { id: 'training', title: 'Training & gezondheid' },
  { id: 'photos', title: "Foto's & metingen" },
]

const TOTAL = STEPS.length

/* ─── Design tokens (v3 Orion) ──────────────────────────── */

const ORION = {
  bg: '#8E9890',
  card: '#474B48',
  softCard: 'rgba(71,75,72,0.55)',
  inputBg: 'rgba(253,253,254,0.06)',
  inputBgHover: 'rgba(253,253,254,0.10)',
  ink: '#FDFDFE',
  inkMuted: 'rgba(253,253,254,0.62)',
  inkFaded: 'rgba(253,253,254,0.44)',
  inkGhost: 'rgba(253,253,254,0.30)',
  divider: 'rgba(253,253,254,0.10)',
  lime: '#C0FC01',
  limeSoft: 'rgba(192,252,1,0.14)',
  amber: '#E8A93C',
  amberSoft: 'rgba(232,169,60,0.14)',
  error: '#E86C3C',
  errorSoft: 'rgba(232,108,60,0.12)',
} as const

/* ─── Primitives ────────────────────────────────────────── */

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[20px] px-[18px] py-[18px] space-y-5"
      style={{ background: ORION.card }}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[11px] font-semibold uppercase tracking-[0.14em] mb-2"
      style={{ color: ORION.inkFaded }}
    >
      {children}
    </label>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11.5px] mb-2 leading-[1.45]"
      style={{ color: ORION.inkMuted }}
    >
      {children}
    </p>
  )
}

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className = '', style, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full rounded-[14px] px-[14px] py-3 text-[14px] leading-[1.5] outline-none transition-colors placeholder:text-[rgba(253,253,254,0.36)] ${className}`}
      style={{
        background: ORION.inputBg,
        color: ORION.ink,
        border: 'none',
        ...style,
      }}
    />
  )
}

function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className = '', style, ...rest } = props
  return (
    <textarea
      {...rest}
      className={`w-full rounded-[14px] px-[14px] py-3 text-[14px] leading-[1.5] resize-none outline-none transition-colors placeholder:text-[rgba(253,253,254,0.36)] ${className}`}
      style={{
        background: ORION.inputBg,
        color: ORION.ink,
        border: 'none',
        ...style,
      }}
    />
  )
}

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
      className="inline-flex items-center rounded-full px-[14px] py-2 text-[13px] font-medium transition-all active:opacity-70"
      style={
        selected
          ? { background: ORION.ink, color: '#1A1A18' }
          : { background: ORION.inputBg, color: ORION.inkMuted }
      }
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
    onChange(
      selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v],
    )
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          selected={selected.includes(opt)}
          onClick={() => toggle(opt)}
        />
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
        <Chip
          key={opt}
          label={opt}
          selected={value === opt}
          onClick={() => onChange(opt)}
        />
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
      <div className="flex justify-between items-baseline mb-2.5">
        <FieldLabel>{label}</FieldLabel>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{ color: ORION.lime, fontFamily: 'var(--font-display)' }}
        >
          {value}
          {unit || ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer onboarding-slider"
        style={{
          background: `linear-gradient(to right, ${ORION.lime} 0%, ${ORION.lime} ${((value - min) / (max - min)) * 100}%, rgba(253,253,254,0.14) ${((value - min) / (max - min)) * 100}%, rgba(253,253,254,0.14) 100%)`,
        }}
      />
      {(leftLabel || rightLabel) && (
        <div
          className="flex justify-between text-[11px] mt-2"
          style={{ color: ORION.inkFaded }}
        >
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
      <style jsx>{`
        .onboarding-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${ORION.lime};
          border: 3px solid #1a1a18;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.24);
        }
        .onboarding-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${ORION.lime};
          border: 3px solid #1a1a18;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.24);
        }
      `}</style>
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
      <FieldLabel>{label}</FieldLabel>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
              style={{ background: ORION.ink, color: '#1A1A18' }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-[14px] leading-none -mr-0.5 transition-opacity hover:opacity-60"
                aria-label={`Verwijder ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <TextInput
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
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-[12px] transition-colors active:opacity-70"
                style={{
                  background: 'transparent',
                  color: ORION.inkMuted,
                  border: `1px dashed rgba(253,253,254,0.24)`,
                }}
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

/* ─── Step header ───────────────────────────────────────── */

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-1">
      <p
        className="text-[10.5px] uppercase tracking-[0.18em] m-0"
        style={{ color: ORION.inkFaded }}
      >
        Stap {step} van 6
      </p>
      <h2
        className="text-[28px] font-light tracking-[-0.025em] leading-[1.1] mt-2 m-0"
        style={{ color: ORION.ink, fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
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
  const [error, setError] = useState<string | null>(null)
  const [animatingOut, setAnimatingOut] = useState(false)
  const [showPhotoStep, setShowPhotoStep] = useState(false)

  const [data, setData] = useState<OnboardingData>({
    sex: '',
    date_of_birth: '',
    height_cm: '',
    weight_kg: '',
    goal_type: [],
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
    cooking_style: [],
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
    front: File | null
    back: File | null
    left: File | null
    right: File | null
  }>({ front: null, back: null, left: null, right: null })

  const [tapeMeasurements, setTapeMeasurements] = useState<
    Record<string, string>
  >({
    chest_cm: '',
    waist_cm: '',
    hips_cm: '',
    left_arm_cm: '',
    right_arm_cm: '',
    left_thigh_cm: '',
    right_thigh_cm: '',
    left_calf_cm: '',
    right_calf_cm: '',
  })

  /* ─── Helpers ───────────────────────────────────────── */

  const update = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const daysFull = [
    'Maandag',
    'Dinsdag',
    'Woensdag',
    'Donderdag',
    'Vrijdag',
    'Zaterdag',
    'Zondag',
  ]
  const daysShort = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  const goTo = (s: number) => {
    setAnimatingOut(true)
    setTimeout(() => {
      setStep(s)
      setError(null)
      setAnimatingOut(false)
    }, 220)
  }

  const parseNum = (v: string) => (v ? parseFloat(v.replace(',', '.')) : null)

  /* ─── Submit ────────────────────────────────────────── */

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Niet aangemeld')
        setSubmitting(false)
        return
      }

      // Upload photos
      const photoUrls: Record<string, string | null> = {
        front: null,
        back: null,
        left: null,
        right: null,
      }
      for (const [pos, file] of Object.entries(photos)) {
        if (file) {
          const fileName = `${user.id}/onboarding_${pos}.jpg`
          const { error: upErr } = await supabase.storage
            .from('checkin-photos')
            .upload(fileName, file, { upsert: true })
          if (!upErr) {
            const { data: urlData } = supabase.storage
              .from('checkin-photos')
              .getPublicUrl(fileName)
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
        age: data.date_of_birth
          ? Math.floor(
              (Date.now() - new Date(data.date_of_birth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : null,
        // Stap 2
        primary_goal: data.goal_type[0] || null,
        goal_type: data.goal_type.join(', '),
        goal_weight_kg: parseNum(data.goal_weight_kg),
        goal_description: data.goal_description,
        goal_pace: data.goal_pace,
        motivation_statement: data.motivation_statement,
        previous_attempts: data.previous_attempts,
        previous_attempts_detail: data.previous_attempts_detail || null,
        // Stap 3
        work_type: data.work_type,
        sleep_hours_avg: data.sleep_hours_avg,
        stress_level:
          data.stress_level === 'Laag'
            ? 2
            : data.stress_level === 'Gemiddeld'
              ? 5
              : data.stress_level === 'Hoog'
                ? 8
                : null,
        alcohol: data.alcohol,
        caffeine: data.caffeine,
        meals_per_day: data.meals_per_day,
        social_context: data.social_context,
        // Stap 4
        favorite_meals: data.favorite_meals,
        hated_foods: data.hated_foods,
        allergies: data.allergies,
        dietary_preferences: data.cooking_style.join(', '),
        dietary_restrictions: data.allergies.join(', '),
        cooking_style: data.cooking_style.join(', '),
        current_snacks: data.current_snacks,
        snack_reason: data.snack_reason,
        snack_preference: data.snack_preference,
        evening_snacker: data.evening_snacker,
        food_adventurousness: data.food_adventurousness,
        typical_daily_eating: data.typical_daily_eating || null,
        // Stap 5
        training_location: data.training_location,
        home_equipment: data.home_equipment,
        experience_level:
          data.experience_level === 0
            ? 'beginner'
            : data.experience_level === 1
              ? 'intermediate'
              : 'advanced',
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
      await supabase
        .from('profiles')
        .update({
          sex: data.sex || null,
          date_of_birth: data.date_of_birth || null,
          height_cm: parseNum(data.height_cm),
          intake_completed: true,
        })
        .eq('id', user.id)

      // Initial weight tracking
      if (data.weight_kg) {
        await supabase
          .from('health_metrics')
          .insert({
            client_id: user.id,
            metric_type: 'weight',
            value: parseNum(data.weight_kg),
            measured_at: new Date().toISOString(),
          })
          .then(() => {})
      }

      setSubmitting(false)

      // Trigger AI nutrition plan generation in the background (non-blocking)
      fetch('/api/ai/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {})

      // Go straight to client dashboard
      router.push('/client')
      router.refresh()
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
      setSubmitting(false)
    }
  }

  /* ─── Progress ──────────────────────────────────────── */

  const progress = (step / (TOTAL - 1)) * 100
  // Last interactive form step is the photos step (TOTAL - 1). Previously this
  // was TOTAL - 3 because the flow had "generating" + "complete" screens after
  // photos — those were removed (flow now goes straight to /client), but the
  // math wasn't updated. Bug: footer was hidden on Voeding step because the
  // condition `step === lastFormStep && !showPhotoStep` matched incorrectly —
  // user could not click Volgende on snacks/dieet, completely stuck.
  const lastFormStep = TOTAL - 1 // photos step index

  const showFooter =
    step > 0 &&
    step <= lastFormStep &&
    !(step === lastFormStep && !showPhotoStep)

  /* ─── Render ────────────────────────────────────────── */

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: ORION.bg }}
    >
      {/* Progress bar — thin lime fill on dark track */}
      {step > 0 && step < TOTAL - 1 && (
        <div
          className="h-[3px]"
          style={{ background: 'rgba(26,26,24,0.20)' }}
        >
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: ORION.lime }}
          />
        </div>
      )}

      {/* Content */}
      <div
        className={`flex-1 flex flex-col items-center px-5 pt-8 overflow-y-auto ${showFooter ? 'pb-[120px]' : 'pb-8'}`}
      >
        <div
          className={`w-full max-w-md transition-all duration-[220ms] ${animatingOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
        >
          {/* ═══ STEP 0: Welcome ═══ */}
          {step === 0 && (
            <div className="space-y-7 pt-10">
              <div
                className="h-14 w-14 rounded-[18px] flex items-center justify-center"
                style={{ background: ORION.limeSoft }}
              >
                <Zap
                  className="w-6 h-6"
                  strokeWidth={1.75}
                  style={{ color: ORION.lime }}
                />
              </div>
              <div>
                <h1
                  className="text-[40px] font-light tracking-[-0.025em] leading-[1.05] m-0"
                  style={{
                    color: ORION.ink,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Welkom bij MŌVE
                </h1>
                <p
                  className="text-[15px] mt-3 leading-[1.55] m-0"
                  style={{ color: ORION.inkMuted }}
                >
                  Laten we je even leren kennen zodat we het perfecte plan
                  kunnen maken. Duurt maar 4 minuten.
                </p>
              </div>
              <div className="space-y-2.5 pt-2">
                {[
                  'Gepersonaliseerd trainingsplan',
                  'Voedingsadvies op maat',
                  'Voedingsplan bij start',
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: ORION.limeSoft }}
                    >
                      <Check
                        className="w-3 h-3"
                        strokeWidth={2.25}
                        style={{ color: ORION.lime }}
                      />
                    </div>
                    <span
                      className="text-[14px]"
                      style={{ color: ORION.ink }}
                    >
                      {t}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="w-full inline-flex items-center justify-center rounded-full px-6 py-[14px] text-[13px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70"
                  style={{ background: ORION.ink, color: '#1A1A18' }}
                >
                  Laten we beginnen
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 1: Jij ═══ */}
          {step === 1 && (
            <div className="space-y-5">
              <StepHeader step={1} title="Over jou" />

              <SectionCard>
                <div>
                  <FieldLabel>Geslacht</FieldLabel>
                  <ChipSingle
                    options={['Man', 'Vrouw']}
                    value={
                      data.sex === 'male'
                        ? 'Man'
                        : data.sex === 'female'
                          ? 'Vrouw'
                          : ''
                    }
                    onChange={(v) =>
                      update('sex', v === 'Man' ? 'male' : 'female')
                    }
                  />
                </div>

                <div>
                  <FieldLabel>Geboortedatum</FieldLabel>
                  <TextInput
                    type="date"
                    value={data.date_of_birth}
                    onChange={(e) => update('date_of_birth', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Lengte (cm)</FieldLabel>
                    <TextInput
                      type="number"
                      inputMode="decimal"
                      value={data.height_cm}
                      onChange={(e) => update('height_cm', e.target.value)}
                      placeholder="178"
                    />
                  </div>
                  <div>
                    <FieldLabel>Gewicht (kg)</FieldLabel>
                    <TextInput
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={data.weight_kg}
                      onChange={(e) => update('weight_kg', e.target.value)}
                      placeholder="82"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 2: Doel ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <StepHeader step={2} title="Je doel" />

              <SectionCard>
                <div>
                  <FieldLabel>Wat wil je bereiken?</FieldLabel>
                  <Hint>Meerdere keuzes mogelijk</Hint>
                  <ChipMulti
                    options={[
                      'Vetverlies',
                      'Spiermassa',
                      'Sterker worden',
                      'Gezonder leven',
                      'Sportprestatie',
                      'Revalidatie',
                    ]}
                    selected={data.goal_type}
                    onChange={(v) => update('goal_type', v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Streefgewicht (kg)</FieldLabel>
                    <TextInput
                      type="number"
                      inputMode="decimal"
                      value={data.goal_weight_kg}
                      onChange={(e) =>
                        update('goal_weight_kg', e.target.value)
                      }
                      placeholder="75"
                    />
                  </div>
                  <div>
                    <FieldLabel>Of beschrijf het</FieldLabel>
                    <TextInput
                      type="text"
                      value={data.goal_description}
                      onChange={(e) =>
                        update('goal_description', e.target.value)
                      }
                      placeholder="Strakker, meer energie"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Tempo</FieldLabel>
                  <ChipSingle
                    options={['Rustig & duurzaam', 'Gemiddeld', 'Zo snel mogelijk']}
                    value={data.goal_pace}
                    onChange={(v) => update('goal_pace', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Waarom wil je dit?</FieldLabel>
                  <TextArea
                    value={data.motivation_statement}
                    onChange={(e) =>
                      update('motivation_statement', e.target.value)
                    }
                    placeholder="Je motivatie in een paar woorden…"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div>
                  <FieldLabel>Eerder geprobeerd?</FieldLabel>
                  <ChipSingle
                    options={['Ja', 'Nee']}
                    value={data.previous_attempts ? 'Ja' : 'Nee'}
                    onChange={(v) => update('previous_attempts', v === 'Ja')}
                  />
                  {data.previous_attempts && (
                    <div className="mt-3">
                      <TextInput
                        type="text"
                        value={data.previous_attempts_detail}
                        onChange={(e) =>
                          update('previous_attempts_detail', e.target.value)
                        }
                        placeholder="Wat ging mis?"
                      />
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 3: Leefstijl ═══ */}
          {step === 3 && (
            <div className="space-y-5">
              <StepHeader step={3} title="Je leefstijl" />

              <SectionCard>
                <div>
                  <FieldLabel>Type werk</FieldLabel>
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
                  unit=" u"
                  leftLabel="4 uur"
                  rightLabel="10 uur"
                  onChange={(v) => update('sleep_hours_avg', v)}
                />

                <div>
                  <FieldLabel>Stressniveau</FieldLabel>
                  <ChipSingle
                    options={['Laag', 'Gemiddeld', 'Hoog']}
                    value={data.stress_level}
                    onChange={(v) => update('stress_level', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Alcohol</FieldLabel>
                  <ChipSingle
                    options={['Nee', 'Af en toe', 'Regelmatig', 'Dagelijks']}
                    value={data.alcohol}
                    onChange={(v) => update('alcohol', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Koffie/cafeïne</FieldLabel>
                  <ChipSingle
                    options={['Geen', '1-2 per dag', '3+ per dag']}
                    value={data.caffeine}
                    onChange={(v) => update('caffeine', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Maaltijden per dag</FieldLabel>
                  <ChipSingle
                    options={['2 maaltijden', '3 maaltijden', '4+ maaltijden']}
                    value={data.meals_per_day}
                    onChange={(v) => update('meals_per_day', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Ik kook…</FieldLabel>
                  <ChipSingle
                    options={[
                      'Voor mezelf',
                      'Voor gezin',
                      'Iemand anders kookt',
                      'Eet veel buitenshuis',
                    ]}
                    value={data.social_context}
                    onChange={(v) => update('social_context', v)}
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 4: Voeding ═══ */}
          {step === 4 && (
            <div className="space-y-5">
              <StepHeader step={4} title="Je voeding" />

              <SectionCard>
                <div>
                  <FieldLabel>Wat eet je op een doorsnee dag?</FieldLabel>
                  <Hint>
                    Beschrijf kort je typische ontbijt, lunch, avondeten en
                    tussendoortjes
                  </Hint>
                  <TextArea
                    value={data.typical_daily_eating}
                    onChange={(e) =>
                      update('typical_daily_eating', e.target.value)
                    }
                    placeholder="bv. Ontbijt: boterhammen met kaas. Lunch: broodje van de bakker. Avond: pasta of rijst met kip. Tussendoor: koekje bij de koffie…"
                    rows={4}
                  />
                </div>

                <TagInput
                  label="Favoriete maaltijden"
                  placeholder="Typ en druk enter…"
                  suggestions={[
                    'Pasta',
                    'Sushi',
                    'Steak',
                    'Curry',
                    'Pizza',
                    'Salade',
                    'Burgers',
                    'Rijst',
                    'Vis',
                  ]}
                  value={data.favorite_meals}
                  onChange={(v) => update('favorite_meals', v)}
                />

                <TagInput
                  label="Haat-voedsel"
                  placeholder="Wat eet je absoluut niet?"
                  suggestions={[
                    'Lever',
                    'Olijven',
                    'Ansjovissen',
                    'Spruiten',
                    'Bloemkool',
                  ]}
                  value={data.hated_foods}
                  onChange={(v) => update('hated_foods', v)}
                />

                <div>
                  <FieldLabel>Allergieën of restricties</FieldLabel>
                  <ChipMulti
                    options={[
                      'Geen',
                      'Vegetarisch',
                      'Veganistisch',
                      'Lactosevrij',
                      'Glutenvrij',
                      'Notenallergie',
                    ]}
                    selected={data.allergies}
                    onChange={(v) => update('allergies', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Hoe kook je het liefst?</FieldLabel>
                  <Hint>Meerdere keuzes mogelijk</Hint>
                  <ChipMulti
                    options={[
                      'Vers koken',
                      'Snel (<20 min)',
                      'Mealprep',
                      'Simpel & makkelijk',
                    ]}
                    selected={data.cooking_style}
                    onChange={(v) => update('cooking_style', v)}
                  />
                </div>

                <TagInput
                  label="Huidige snacks"
                  placeholder="Wat snack je nu?"
                  suggestions={[
                    'Chips',
                    'Chocolade',
                    'Noten',
                    'Fruit',
                    'Koekjes',
                    'Crackers',
                    'Kaas',
                  ]}
                  value={data.current_snacks}
                  onChange={(v) => update('current_snacks', v)}
                />
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 5: Training & Gezondheid ═══ */}
          {step === 5 && (
            <div className="space-y-5">
              <StepHeader step={5} title="Training & gezondheid" />

              <SectionCard>
                <div>
                  <FieldLabel>Waar train je?</FieldLabel>
                  <ChipSingle
                    options={['Sportschool', 'Home gym', 'Buiten']}
                    value={data.training_location}
                    onChange={(v) => update('training_location', v)}
                  />
                </div>

                {data.training_location === 'Home gym' && (
                  <div>
                    <FieldLabel>Beschikbare apparatuur</FieldLabel>
                    <ChipMulti
                      options={[
                        'Dumbbells',
                        'Barbell + rack',
                        'Kabelstation',
                        'Pull-up bar',
                        'Resistance bands',
                        'Cardio apparaat',
                        'Kettlebells',
                      ]}
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
                  unit="×"
                  leftLabel="0×"
                  rightLabel="7×"
                  onChange={(v) => update('training_frequency', v)}
                />

                <div>
                  <FieldLabel>Type training</FieldLabel>
                  <ChipMulti
                    options={['Kracht', 'Cardio', 'HIIT', 'Yoga/stretching']}
                    selected={data.training_types}
                    onChange={(v) => update('training_types', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Tijd per sessie</FieldLabel>
                  <ChipSingle
                    options={['30 min', '45 min', '60 min', '75+ min']}
                    value={data.session_duration}
                    onChange={(v) => update('session_duration', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Beschikbare dagen</FieldLabel>
                  <div className="grid grid-cols-7 gap-1.5">
                    {daysFull.map((dayFull, idx) => {
                      const active =
                        data.preferred_training_days.includes(dayFull)
                      return (
                        <button
                          key={dayFull}
                          type="button"
                          onClick={() => {
                            const days = data.preferred_training_days
                            update(
                              'preferred_training_days',
                              days.includes(dayFull)
                                ? days.filter((d) => d !== dayFull)
                                : [...days, dayFull],
                            )
                          }}
                          className="py-2.5 rounded-[12px] text-[11.5px] font-semibold uppercase tracking-[0.08em] transition-all active:opacity-70"
                          style={
                            active
                              ? { background: ORION.lime, color: '#1A1A18' }
                              : {
                                  background: ORION.inputBg,
                                  color: ORION.inkMuted,
                                }
                          }
                        >
                          {daysShort[idx]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel>Blessures of pijnklachten?</FieldLabel>
                  <ChipSingle
                    options={['Ja', 'Nee']}
                    value={data.has_injuries ? 'Ja' : 'Nee'}
                    onChange={(v) => update('has_injuries', v === 'Ja')}
                  />
                  {data.has_injuries && (
                    <div className="mt-3">
                      <TextInput
                        type="text"
                        value={data.injuries_limitations}
                        onChange={(e) =>
                          update('injuries_limitations', e.target.value)
                        }
                        placeholder="Bijv. schouder links, onderrug"
                      />
                    </div>
                  )}
                </div>

                <div
                  className="pt-5"
                  style={{ borderTop: `1px solid ${ORION.divider}` }}
                >
                  <FieldLabel>Heb je een verleden met eetproblemen?</FieldLabel>
                  <ChipSingle
                    options={['Ja', 'Nee']}
                    value={data.has_food_relationship_issues ? 'Ja' : 'Nee'}
                    onChange={(v) =>
                      update('has_food_relationship_issues', v === 'Ja')
                    }
                  />
                  <p
                    className="text-[11.5px] mt-2 m-0 leading-[1.45]"
                    style={{ color: ORION.inkFaded }}
                  >
                    Vertrouwelijk — helpt ons veilig te adviseren.
                  </p>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 6: Foto's & metingen — nu of later ═══ */}
          {step === 6 && !showPhotoStep && (
            <div className="space-y-5">
              <StepHeader step={6} title="Foto's & metingen" />

              <div
                className="rounded-[20px] px-[18px] py-[20px]"
                style={{ background: ORION.card }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0"
                    style={{ background: ORION.limeSoft }}
                  >
                    <Camera
                      className="w-5 h-5"
                      strokeWidth={1.75}
                      style={{ color: ORION.lime }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[15px] font-medium m-0 tracking-[-0.005em]"
                      style={{ color: ORION.ink }}
                    >
                      Kan je nu foto&apos;s nemen en afmetingen invullen?
                    </p>
                    <p
                      className="text-[13px] mt-1.5 leading-[1.5] m-0"
                      style={{ color: ORION.inkMuted }}
                    >
                      Startfoto&apos;s en metingen helpen om je vooruitgang bij
                      te houden. Je kan dit ook later doen vanuit je dashboard.
                    </p>
                  </div>
                </div>

                {/* Privacy disclaimer */}
                <div
                  className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 mt-4"
                  style={{ background: 'rgba(26,26,24,0.22)' }}
                >
                  <Lock
                    className="w-4 h-4 shrink-0 mt-0.5"
                    strokeWidth={1.75}
                    style={{ color: ORION.inkFaded }}
                  />
                  <p
                    className="text-[12px] leading-[1.5] m-0"
                    style={{ color: ORION.inkMuted }}
                  >
                    Je foto&apos;s zijn{' '}
                    <span
                      className="font-medium"
                      style={{ color: ORION.ink }}
                    >
                      alleen voor jou en je coach
                    </span>{' '}
                    zichtbaar. Ze dienen enkel om je eigen progress te volgen.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPhotoStep(true)}
                    className="w-full inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70"
                    style={{ background: ORION.ink, color: '#1A1A18' }}
                  >
                    Ja, ik doe het nu
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium transition-opacity active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: ORION.inputBg,
                      color: ORION.ink,
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          strokeWidth={2}
                          className="w-4 h-4 animate-spin"
                        />
                        Opslaan…
                      </>
                    ) : (
                      'Later doen — eerst mijn dashboard'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 6b: Actual photo & measurement form ═══ */}
          {step === 6 && showPhotoStep && (
            <div className="space-y-5">
              <StepHeader step={6} title="Foto's & metingen" />
              <p
                className="text-[13px] m-0 -mt-3"
                style={{ color: ORION.inkMuted }}
              >
                Neem een foto van voorkant, achterkant en zijkant.
              </p>

              <PhotoUploadStep
                photos={photos}
                onChange={setPhotos}
                showSilhouette={false}
              />

              <TapeMeasurementsStep
                measurements={tapeMeasurements}
                onChange={setTapeMeasurements}
              />
            </div>
          )}

          {/* Generating & complete screens removed — goes straight to dashboard */}
        </div>
      </div>

      {/* Footer Navigation */}
      {showFooter && (
        <div
          className="fixed bottom-0 left-0 right-0 px-5 py-4 safe-area-bottom"
          style={{
            background:
              'linear-gradient(to top, rgba(26,26,24,0.32) 0%, rgba(26,26,24,0.18) 60%, rgba(26,26,24,0) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="max-w-md mx-auto flex gap-3 items-center">
            <button
              type="button"
              onClick={() => {
                if (step === lastFormStep && showPhotoStep) {
                  setShowPhotoStep(false)
                } else {
                  goTo(step - 1)
                }
              }}
              className="inline-flex items-center gap-1 rounded-full px-4 py-[11px] text-[12px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70"
              style={{ background: ORION.inputBg, color: ORION.ink }}
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
              Terug
            </button>

            {step < lastFormStep ? (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className="flex-1 inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70"
                style={{ background: ORION.ink, color: '#1A1A18' }}
              >
                Volgende
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: ORION.lime, color: '#1A1A18' }}
              >
                {submitting ? (
                  <>
                    <Loader2 strokeWidth={2} className="w-4 h-4 animate-spin" />
                    Opslaan…
                  </>
                ) : (
                  'Afronden'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div
          className="fixed left-1/2 -translate-x-1/2 px-4 py-3 rounded-[14px] text-[13px] font-medium z-50 shadow-lg"
          style={{
            bottom: showFooter ? '96px' : '24px',
            background: ORION.errorSoft,
            color: ORION.error,
            border: '1px solid rgba(232,108,60,0.24)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
