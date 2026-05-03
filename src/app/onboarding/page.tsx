'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
  Edit3,
  Heart,
} from 'lucide-react'

/**
 * v3 Orion onboarding flow.
 *
 * STEPS (9):
 *   0 welcome
 *   1 over jou       (sex, dob, height, weight)
 *   2 doel           (goals, target weight, pace, motivation, history)
 *   3 leefstijl      (work, sleep, stress, alcohol, caffeine)
 *   4 voeding        (meals/day, kookcontext, daily eating, fav/liever niet,
 *                     allergies, cooking style, snacks + why/zoet-hartig/avond)
 *   5 training       (location, equipment, ervaring, frequency, days, types,
 *                     duration, injuries)
 *   6 zachte vraag   (has_food_relationship_issues met zachte framing)
 *   7 foto's         (choice + upload form)
 *   8 overzicht      (summary + edit links + Afronden)
 *
 * lastFormStep = TOTAL - 1 = 8 (overview). Progress bar loopt naar 100% op
 * overzicht. Draft save in localStorage na elke mutatie; draft wordt gewist
 * na succesvol submit. Zie feedback_onboarding_step_math in /mnt/.auto-memory.
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
  // Stap 4: Voeding
  meals_per_day: string
  social_context: string
  favorite_meals: string[]
  hated_foods: string[]
  allergies: string[]
  cooking_style: string[]
  current_snacks: string[]
  snack_other: string
  snack_reason: string[]
  snack_preference: string
  evening_snacker: string
  food_adventurousness: number
  typical_daily_eating: string
  // Stap 5: Training
  training_location: string
  home_equipment: string[]
  experience_level: number
  training_frequency: number
  training_types: string[]
  session_duration: string
  preferred_training_days: string[]
  has_injuries: boolean
  injuries_limitations: string
  // Stap 6: Zacht
  has_food_relationship_issues: boolean
}

/* ─── Step definitions ──────────────────────────────────── */

const STEPS = [
  { id: 'welcome', title: 'Welkom bij MŌVE' },
  { id: 'you', title: 'Over jou' },
  { id: 'goal', title: 'Je doel' },
  { id: 'lifestyle', title: 'Je leefstijl' },
  { id: 'nutrition', title: 'Je voeding' },
  { id: 'training', title: 'Training' },
  { id: 'sensitive', title: 'Nog één korte check' },
  { id: 'photos', title: "Foto's & metingen" },
  { id: 'overview', title: 'Alles op een rijtje' },
]

const TOTAL = STEPS.length // 9

/* ─── Design tokens (v3 Orion) ──────────────────────────── */

const ORION = {
  bg: '#8E9890',
  card: '#474B48',
  softCard: 'rgba(71,75,72,0.55)',
  inputBg: 'rgba(253,253,254,0.06)',
  ink: '#FDFDFE',
  // Bumped from 0.62→0.85 voor WCAG AA contrast op #8E9890 page bg
  // (was 2.05:1, nu ~3.6:1 — body ≥ 4.5:1 enkel op #474B48 card-context).
  inkMuted: 'rgba(253,253,254,0.85)',
  inkFaded: 'rgba(253,253,254,0.62)',
  inkGhost: 'rgba(253,253,254,0.40)',
  divider: 'rgba(253,253,254,0.10)',
  lime: '#C0FC01',
  limeSoft: 'rgba(192,252,1,0.14)',
  amber: '#E8A93C',
  amberSoft: 'rgba(232,169,60,0.14)',
  blue: '#A4C7F2',
  blueSoft: 'rgba(164,199,242,0.14)',
  error: '#E86C3C',
  errorSoft: 'rgba(232,108,60,0.12)',
} as const

/* ─── Draft storage ─────────────────────────────────────── */

const DRAFT_KEY = 'move:onboarding:draft:v2'

interface DraftShape {
  step: number
  showPhotoStep: boolean
  data: OnboardingData
  tapeMeasurements: Record<string, string>
  savedAt: string
}

/* ─── Primitives ────────────────────────────────────────── */

function SectionCard({
  children,
  padding = 'standard',
}: {
  children: React.ReactNode
  padding?: 'standard' | 'tight'
}) {
  const pad = padding === 'tight' ? 'px-4 py-4' : 'px-[18px] py-[18px]'
  return (
    <div
      className={`rounded-[20px] ${pad} space-y-5`}
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
      className="text-[11.5px] mb-2 leading-[1.45] m-0"
      style={{ color: ORION.inkMuted }}
    >
      {children}
    </p>
  )
}

/* Onboarding TextInput — local primitive met:
 *   - min 44px touch-target (py-3 + 14px text + line-height = ~46px)
 *   - :focus-visible ring (vervangt globale outline:none)
 *   - aria-invalid + aria-describedby slot
 *   - accepteert error-prop voor a11y koppeling
 */
type OnboardTextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  describedById?: string
}

function TextInput(props: OnboardTextInputProps) {
  const { className = '', style, error, describedById, id, 'aria-describedby': ariaDescribed, ...rest } = props
  const computedDescribed = [describedById, ariaDescribed].filter(Boolean).join(' ') || undefined
  return (
    <input
      {...rest}
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={computedDescribed}
      className={`w-full rounded-[14px] px-[14px] py-3 text-[14px] leading-[1.5] outline-none transition-colors placeholder:text-[rgba(253,253,254,0.36)] focus-visible:ring-2 focus-visible:ring-[#C0FC01] focus-visible:ring-offset-2 focus-visible:ring-offset-[#474B48] ${error ? 'ring-2 ring-[#E07A5F]' : ''} ${className}`}
      style={{
        background: ORION.inputBg,
        color: ORION.ink,
        border: 'none',
        minHeight: 44,
        ...style,
      }}
    />
  )
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', style, ...rest } = props
  return (
    <textarea
      {...rest}
      className={`w-full rounded-[14px] px-[14px] py-3 text-[14px] leading-[1.5] resize-none outline-none transition-colors placeholder:text-[rgba(253,253,254,0.36)] focus-visible:ring-2 focus-visible:ring-[#C0FC01] focus-visible:ring-offset-2 focus-visible:ring-offset-[#474B48] ${className}`}
      style={{
        background: ORION.inputBg,
        color: ORION.ink,
        border: 'none',
        minHeight: 44,
        ...style,
      }}
    />
  )
}

/* ─── Chip ──────────────────────────────────────────────── */

function Chip({
  label,
  selected,
  onClick,
  tone = 'white',
}: {
  label: string
  selected: boolean
  onClick: () => void
  tone?: 'white' | 'lime'
}) {
  const selectedStyle =
    tone === 'lime'
      ? { background: ORION.lime, color: '#1A1A18' }
      : { background: ORION.ink, color: '#1A1A18' }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full px-[14px] py-2 text-[13px] font-medium transition-all active:opacity-70"
      style={
        selected ? selectedStyle : { background: ORION.inputBg, color: ORION.inkMuted }
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

/* ─── Slider ────────────────────────────────────────────── */

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
  const pct = ((value - min) / (max - min)) * 100
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
          background: `linear-gradient(to right, ${ORION.lime} 0%, ${ORION.lime} ${pct}%, rgba(253,253,254,0.14) ${pct}%, rgba(253,253,254,0.14) 100%)`,
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

/* ─── Tag input ─────────────────────────────────────────── */

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

function StepHeader({
  step,
  title,
  total = 7,
}: {
  step: number
  title: string
  total?: number
}) {
  return (
    <div className="mb-1">
      <p
        className="text-[10.5px] uppercase tracking-[0.18em] m-0"
        style={{ color: ORION.inkFaded }}
      >
        Stap {step} van {total}
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
  // True wanneer user op disabled "Volgende" probeert te tappen — zet
  // een hint + aria-live boodschap zonder de stap te verlaten.
  const [attemptedAdvance, setAttemptedAdvance] = useState(false)
  const [draftNotice, setDraftNotice] = useState<DraftShape | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as DraftShape
      if (parsed.step > 0) return parsed
      localStorage.removeItem(DRAFT_KEY)
      return null
    } catch {
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      return null
    }
  })
  const [draftLoaded, setDraftLoaded] = useState(false)

  const initialData: OnboardingData = {
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
    snack_other: '',
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
  }

  const [data, setData] = useState<OnboardingData>(initialData)

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

  /* ─── Draft save on mutation (debounced via effect) ─── */

  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!draftLoaded && step === 0) return // don't save empty welcome state
    try {
      const draft: DraftShape = {
        step,
        showPhotoStep,
        data,
        tapeMeasurements,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // localStorage might be full / disabled — silently skip
    }
  }, [step, showPhotoStep, data, tapeMeasurements, draftLoaded])

  const applyDraft = (d: DraftShape) => {
    setData(d.data)
    setTapeMeasurements(d.tapeMeasurements)
    setStep(d.step)
    setShowPhotoStep(d.showPhotoStep)
    setDraftLoaded(true)
    setDraftNotice(null)
  }

  const dismissDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setDraftNotice(null)
  }

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
      setAttemptedAdvance(false)
      setAnimatingOut(false)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
    }, 220)
  }

  const parseNum = (v: string) => (v ? parseFloat(v.replace(',', '.')) : null)

  /* ─── Validation per step ───────────────────────────── */

  const canProceed = (s: number): boolean => {
    switch (s) {
      case 1:
        return !!(
          data.sex &&
          data.date_of_birth &&
          data.height_cm &&
          data.weight_kg
        )
      case 2:
        return data.goal_type.length > 0 && !!data.goal_pace
      case 3:
        return !!(data.work_type && data.stress_level)
      case 4:
        return (
          !!data.meals_per_day &&
          !!data.social_context &&
          data.allergies.length > 0
        )
      case 5:
        return !!(
          data.training_location &&
          data.training_frequency > 0 &&
          data.training_types.length > 0 &&
          data.session_duration
        )
      case 6:
      case 7:
      case 8:
        return true
      default:
        return true
    }
  }

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

      // Merge "anders" snack into current_snacks on submit
      const allSnacks = data.snack_other.trim()
        ? [...data.current_snacks, data.snack_other.trim()]
        : data.current_snacks

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
        current_snacks: allSnacks,
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

      await supabase
        .from('profiles')
        .update({
          sex: data.sex || null,
          date_of_birth: data.date_of_birth || null,
          height_cm: parseNum(data.height_cm),
          intake_completed: true,
        })
        .eq('id', user.id)

      // Best-effort: als de coach een re-intake had aangevraagd,
      // wissen we die nu. Kolommen bestaan alleen na migration
      // 20260419_reintake_request.sql — voordien silent fallback.
      try {
        await supabase
          .from('profiles')
          .update({
            reintake_requested_at: null,
            reintake_requested_by: null,
          })
          .eq('id', user.id)
      } catch {
        // kolom bestaat nog niet — geen probleem, niets te wissen
      }

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

      // Fire background AI plan generation
      fetch('/api/ai/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {})

      // Wipe draft — done!
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        // ignore
      }

      setSubmitting(false)
      router.push('/client')
      router.refresh()
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
      setSubmitting(false)
    }
  }

  /* ─── Progress ──────────────────────────────────────── */

  // Progress measured as steps 1..lastFormStep (welcome doesn't count).
  // Last interactive form step is the overview (TOTAL - 1). See comment in
  // feedback_onboarding_step_math memory.
  const lastFormStep = TOTAL - 1 // overview step index (8)
  const progress = step === 0 ? 0 : (step / lastFormStep) * 100

  const showFooter =
    step > 0 &&
    step <= lastFormStep &&
    !(STEPS[step]?.id === 'photos' && !showPhotoStep)

  const onOverview = STEPS[step]?.id === 'overview'
  const onSensitive = STEPS[step]?.id === 'sensitive'

  const displayTotal = lastFormStep // "Stap X van 8" — welcome niet meegeteld

  /* ─── Render ────────────────────────────────────────── */

  // Draft restore banner
  if (draftNotice && !draftLoaded) {
    const savedDate = new Date(draftNotice.savedAt).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: ORION.bg }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-[22px] px-[22px] py-[26px]"
            style={{ background: ORION.card }}
          >
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-4"
              style={{ background: ORION.limeSoft }}
            >
              <Edit3
                strokeWidth={1.75}
                className="w-5 h-5"
                style={{ color: ORION.lime }}
              />
            </div>
            <h1
              className="text-[24px] font-light tracking-[-0.025em] leading-[1.15] m-0"
              style={{ color: ORION.ink, fontFamily: 'var(--font-display)' }}
            >
              Ga je verder?
            </h1>
            <p
              className="text-[14px] mt-2 leading-[1.55] m-0"
              style={{ color: ORION.inkMuted }}
            >
              Je was al bezig met de onboarding (laatst opgeslagen {savedDate}).
              Je hoeft niet opnieuw te beginnen.
            </p>
            <div className="flex flex-col gap-2 mt-6">
              <button
                type="button"
                onClick={() => applyDraft(draftNotice)}
                className="w-full inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70"
                style={{ background: ORION.ink, color: '#1A1A18' }}
              >
                Ga verder
              </button>
              <button
                type="button"
                onClick={dismissDraft}
                className="w-full inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-medium transition-opacity active:opacity-70"
                style={{ background: ORION.inputBg, color: ORION.ink }}
              >
                Opnieuw starten
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const proceedOk = canProceed(step)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: ORION.bg }}>
      {/* Progress bar — thin lime fill on dark track, persists through overview */}
      {step > 0 && (
        <div className="h-[3px]" style={{ background: 'rgba(26,26,24,0.20)' }}>
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
                  style={{ color: ORION.ink, fontFamily: 'var(--font-display)' }}
                >
                  Welkom bij MŌVE
                </h1>
                <p
                  className="text-[15px] mt-3 leading-[1.55] m-0"
                  style={{ color: ORION.inkMuted }}
                >
                  Laten we je leren kennen zodat we het juiste plan voor jou
                  kunnen maken. Ongeveer 6 minuten — je kan altijd later
                  verdergaan.
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
                    <span className="text-[14px]" style={{ color: ORION.ink }}>
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

          {/* ═══ STEP 1: Over jou ═══ */}
          {step === 1 && (
            <div className="space-y-5">
              <StepHeader step={1} title="Over jou" total={displayTotal} />

              <SectionCard>
                <div>
                  <FieldLabel>Geslacht</FieldLabel>
                  <Hint>Biologisch, voor correcte calorie-berekening.</Hint>
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
                    /* color-scheme: dark zorgt dat iOS Safari de native date-
                     *  picker als dark theme rendert (witte tekst leesbaar). */
                    style={{ colorScheme: 'dark' }}
                    aria-label="Geboortedatum"
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

          {/* ═══ STEP 2: Je doel ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <StepHeader step={2} title="Je doel" total={displayTotal} />

              <SectionCard>
                <div>
                  <FieldLabel>Wat wil je bereiken?</FieldLabel>
                  <Hint>Meerdere keuzes mogelijk — de eerste is je hoofddoel.</Hint>
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

                <div>
                  <FieldLabel>Streefgewicht</FieldLabel>
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <TextInput
                      type="number"
                      inputMode="decimal"
                      value={data.goal_weight_kg}
                      onChange={(e) => update('goal_weight_kg', e.target.value)}
                      placeholder="75"
                    />
                    <span
                      className="text-[13px] px-2"
                      style={{ color: ORION.inkMuted }}
                    >
                      kg
                    </span>
                  </div>
                  <div className="mt-3">
                    <Hint>
                      Geen cijfer in je hoofd? Beschrijf hoe je je wil voelen of
                      eruit wil zien.
                    </Hint>
                    <TextInput
                      type="text"
                      value={data.goal_description}
                      onChange={(e) => update('goal_description', e.target.value)}
                      placeholder="Strakker, meer energie…"
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
                  <FieldLabel>Waarom wil je dit? (optioneel)</FieldLabel>
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
                        placeholder="Wat ging mis? (optioneel)"
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
              <StepHeader step={3} title="Je leefstijl" total={displayTotal} />

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
                  <FieldLabel>Koffie / cafeïne</FieldLabel>
                  <ChipSingle
                    options={['Geen', '1–2 per dag', '3+ per dag']}
                    value={data.caffeine}
                    onChange={(v) => update('caffeine', v)}
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 4: Voeding ═══ */}
          {step === 4 && (
            <div className="space-y-5">
              <StepHeader step={4} title="Je voeding" total={displayTotal} />

              <SectionCard>
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

                <div>
                  <FieldLabel>Wat eet je op een doorsnee dag? (optioneel)</FieldLabel>
                  <Hint>
                    Kort is prima. Ontbijt, lunch, avond, tussendoor.
                  </Hint>
                  <TextArea
                    value={data.typical_daily_eating}
                    onChange={(e) =>
                      update('typical_daily_eating', e.target.value)
                    }
                    placeholder="bv. Ontbijt: boterhammen met kaas. Lunch: broodje. Avond: pasta met kip…"
                    rows={3}
                  />
                </div>

                <div>
                  <FieldLabel>Allergieën of restricties</FieldLabel>
                  <Hint>Kies &quot;Geen&quot; als er niets van toepassing is.</Hint>
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
                  label="Liever niet"
                  placeholder="Wat eet je niet graag?"
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
              </SectionCard>

              {/* Snackgedrag — compacter tweede card */}
              <SectionCard>
                <div>
                  <FieldLabel>Wat snack je nu?</FieldLabel>
                  <Hint>Meerdere keuzes mogelijk</Hint>
                  <ChipMulti
                    options={[
                      'Chips',
                      'Chocolade',
                      'Noten',
                      'Fruit',
                      'Koekjes',
                      'Crackers',
                      'Kaas',
                      'IJs',
                      'Niets',
                    ]}
                    selected={data.current_snacks}
                    onChange={(v) => update('current_snacks', v)}
                  />
                  <div className="mt-3">
                    <TextInput
                      type="text"
                      value={data.snack_other}
                      onChange={(e) => update('snack_other', e.target.value)}
                      placeholder="Iets anders? Typ het hier…"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Waarom snack je vooral?</FieldLabel>
                  <Hint>Meerdere keuzes mogelijk</Hint>
                  <ChipMulti
                    options={['Honger', 'Gewoonte', 'Stress', 'Verveling', 'Sociaal']}
                    selected={data.snack_reason}
                    onChange={(v) => update('snack_reason', v)}
                  />
                </div>

                <div>
                  <FieldLabel>Zoet of hartig?</FieldLabel>
                  <ChipSingle
                    options={['Zoet', 'Hartig', 'Beide']}
                    value={data.snack_preference}
                    onChange={(v) => update('snack_preference', v)}
                  />
                </div>

                <div>
                  <FieldLabel>&apos;s Avonds nog snacken?</FieldLabel>
                  <ChipSingle
                    options={['Ja', 'Soms', 'Nee']}
                    value={data.evening_snacker}
                    onChange={(v) => update('evening_snacker', v)}
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 5: Training ═══ */}
          {step === 5 && (
            <div className="space-y-5">
              <StepHeader step={5} title="Training" total={displayTotal} />

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

                <div>
                  <FieldLabel>Ervaring</FieldLabel>
                  <ChipSingle
                    options={['Beginner', 'Gevorderd', 'Ervaren']}
                    value={
                      data.experience_level === 0
                        ? 'Beginner'
                        : data.experience_level === 1
                          ? 'Gevorderd'
                          : 'Ervaren'
                    }
                    onChange={(v) =>
                      update(
                        'experience_level',
                        v === 'Beginner' ? 0 : v === 'Gevorderd' ? 1 : 2,
                      )
                    }
                  />
                </div>

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

                {data.training_frequency > 0 && (
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
                )}

                <div>
                  <FieldLabel>Type training</FieldLabel>
                  <ChipMulti
                    options={['Kracht', 'Cardio', 'HIIT', 'Yoga / stretching']}
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
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 6: Zachte vraag ═══ */}
          {step === 6 && (
            <div className="space-y-5">
              <StepHeader
                step={6}
                title="Nog één korte check"
                total={displayTotal}
              />

              <div
                className="rounded-[20px] px-[18px] py-[20px]"
                style={{ background: ORION.card }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0"
                    style={{ background: ORION.blueSoft }}
                  >
                    <Heart
                      className="w-5 h-5"
                      strokeWidth={1.75}
                      style={{ color: ORION.blue }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[15px] font-medium m-0 tracking-[-0.005em]"
                      style={{ color: ORION.ink }}
                    >
                      Heeft eten voor jou ooit een moeilijk onderwerp geweest?
                    </p>
                    <p
                      className="text-[13px] mt-1.5 leading-[1.5] m-0"
                      style={{ color: ORION.inkMuted }}
                    >
                      Bv. eetstoornis, extreem diëten of verstoord eetgedrag.
                      Helpt ons je plan zachter te starten.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <ChipSingle
                    options={['Ja', 'Nee', 'Liever niet zeggen']}
                    value={
                      data.has_food_relationship_issues
                        ? 'Ja'
                        : data.has_food_relationship_issues === false &&
                            onSensitive
                          ? 'Nee'
                          : ''
                    }
                    onChange={(v) =>
                      update('has_food_relationship_issues', v === 'Ja')
                    }
                  />
                </div>

                <div
                  className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 mt-5"
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
                    Vertrouwelijk — alleen zichtbaar voor jou en je coach.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 7: Foto's & metingen ═══ */}
          {step === 7 && !showPhotoStep && (
            <div className="space-y-5">
              <StepHeader
                step={7}
                title="Foto's & metingen"
                total={displayTotal}
              />

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
                    <span className="font-medium" style={{ color: ORION.ink }}>
                      alleen voor jou en je coach
                    </span>{' '}
                    zichtbaar. Dienen enkel voor je eigen progress.
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
                    onClick={() => goTo(8)}
                    className="w-full inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-medium transition-opacity active:opacity-70"
                    style={{ background: ORION.inputBg, color: ORION.ink }}
                  >
                    Later doen
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 7 && showPhotoStep && (
            <div className="space-y-5">
              <StepHeader
                step={7}
                title="Foto's & metingen"
                total={displayTotal}
              />
              <p
                className="text-[13px] m-0 -mt-3"
                style={{ color: ORION.inkMuted }}
              >
                Neem een foto van voor, achter, links en rechts.
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

          {/* ═══ STEP 8: Overzicht ═══ */}
          {step === 8 && (
            <OverviewScreen
              data={data}
              tapeMeasurements={tapeMeasurements}
              photos={photos}
              showPhotoStep={showPhotoStep}
              onEdit={(s) => {
                if (s === 7) setShowPhotoStep(false)
                goTo(s)
              }}
            />
          )}
        </div>
      </div>

      {/* Footer */}
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
                if (STEPS[step]?.id === 'photos' && showPhotoStep) {
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

            {onOverview ? (
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
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!proceedOk) {
                    setAttemptedAdvance(true)
                    return
                  }
                  setAttemptedAdvance(false)
                  goTo(step + 1)
                }}
                aria-disabled={!proceedOk}
                className="flex-1 inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70"
                style={{
                  background: ORION.ink,
                  color: '#1A1A18',
                  opacity: proceedOk ? 1 : 0.5,
                }}
              >
                Volgende
              </button>
            )}
          </div>

          {/* Helper hint when blocked */}
          {!proceedOk && !onOverview && (
            <div
              role={attemptedAdvance ? 'alert' : undefined}
              aria-live="polite"
              className="max-w-md mx-auto text-center mt-2 text-[12px]"
              style={{
                color: attemptedAdvance ? ORION.error : ORION.inkFaded,
                fontWeight: attemptedAdvance ? 500 : 400,
              }}
            >
              {attemptedAdvance
                ? 'Vul de gemarkeerde velden in om verder te gaan'
                : 'Vul deze stap aan om verder te gaan'}
            </div>
          )}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div
          className="fixed left-1/2 -translate-x-1/2 px-4 py-3 rounded-[14px] text-[13px] font-medium z-50 shadow-lg max-w-[calc(100%-2rem)]"
          style={{
            bottom: showFooter ? '110px' : '24px',
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

/* ─── Overview screen ───────────────────────────────────── */

function OverviewScreen({
  data,
  tapeMeasurements,
  photos,
  showPhotoStep,
  onEdit,
}: {
  data: OnboardingData
  tapeMeasurements: Record<string, string>
  photos: {
    front: File | null
    back: File | null
    left: File | null
    right: File | null
  }
  showPhotoStep: boolean
  onEdit: (step: number) => void
}) {
  // Pin "now" on mount so the component stays idempotent across re-renders.
  const [nowMs] = useState(() => Date.now())
  const age = data.date_of_birth
    ? Math.floor(
        (nowMs - new Date(data.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null

  const photoCount =
    Number(!!photos.front) +
    Number(!!photos.back) +
    Number(!!photos.left) +
    Number(!!photos.right)

  const tapeCount = Object.values(tapeMeasurements).filter((v) => v).length

  return (
    <div className="space-y-5">
      <StepHeader step={8} title="Alles op een rijtje" total={8} />
      <p
        className="text-[14px] -mt-3 leading-[1.55] m-0"
        style={{ color: ORION.inkMuted }}
      >
        Check of alles klopt. Klik op <span className="font-medium">Wijzigen</span>{' '}
        om iets aan te passen.
      </p>

      <OverviewBlock title="Over jou" onEdit={() => onEdit(1)}>
        {[
          data.sex === 'male' ? 'Man' : data.sex === 'female' ? 'Vrouw' : null,
          age ? `${age} jaar` : null,
          data.height_cm ? `${data.height_cm} cm` : null,
          data.weight_kg ? `${data.weight_kg} kg` : null,
        ]
          .filter(Boolean)
          .join(' · ') || '—'}
      </OverviewBlock>

      <OverviewBlock title="Je doel" onEdit={() => onEdit(2)}>
        <div className="space-y-1">
          <div>{data.goal_type.join(', ') || '—'}</div>
          {data.goal_weight_kg && (
            <div style={{ color: ORION.inkMuted }}>
              Streef: {data.goal_weight_kg} kg
            </div>
          )}
          {data.goal_description && (
            <div style={{ color: ORION.inkMuted }}>
              &ldquo;{data.goal_description}&rdquo;
            </div>
          )}
          {data.goal_pace && (
            <div style={{ color: ORION.inkMuted }}>Tempo: {data.goal_pace}</div>
          )}
        </div>
      </OverviewBlock>

      <OverviewBlock title="Leefstijl" onEdit={() => onEdit(3)}>
        {[
          data.work_type,
          `${data.sleep_hours_avg} u slaap`,
          data.stress_level && `${data.stress_level.toLowerCase()} stress`,
          data.alcohol && `alcohol: ${data.alcohol.toLowerCase()}`,
        ]
          .filter(Boolean)
          .join(' · ') || '—'}
      </OverviewBlock>

      <OverviewBlock title="Voeding" onEdit={() => onEdit(4)}>
        <div className="space-y-1">
          <div>
            {[data.meals_per_day, data.social_context?.toLowerCase()]
              .filter(Boolean)
              .join(' · ') || '—'}
          </div>
          {data.allergies.length > 0 && (
            <div style={{ color: ORION.inkMuted }}>
              Allergieën: {data.allergies.join(', ')}
            </div>
          )}
          {data.favorite_meals.length > 0 && (
            <div style={{ color: ORION.inkMuted }}>
              Favoriet: {data.favorite_meals.slice(0, 4).join(', ')}
              {data.favorite_meals.length > 4 && '…'}
            </div>
          )}
          {data.hated_foods.length > 0 && (
            <div style={{ color: ORION.inkMuted }}>
              Liever niet: {data.hated_foods.slice(0, 4).join(', ')}
              {data.hated_foods.length > 4 && '…'}
            </div>
          )}
        </div>
      </OverviewBlock>

      <OverviewBlock title="Training" onEdit={() => onEdit(5)}>
        <div className="space-y-1">
          <div>
            {[
              data.training_location,
              data.training_frequency > 0 && `${data.training_frequency}× / week`,
              data.session_duration,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </div>
          {data.training_types.length > 0 && (
            <div style={{ color: ORION.inkMuted }}>
              {data.training_types.join(', ')}
            </div>
          )}
          {data.preferred_training_days.length > 0 && (
            <div style={{ color: ORION.inkMuted }}>
              Dagen: {data.preferred_training_days.join(', ')}
            </div>
          )}
          {data.has_injuries && data.injuries_limitations && (
            <div style={{ color: ORION.amber }}>
              Let op: {data.injuries_limitations}
            </div>
          )}
        </div>
      </OverviewBlock>

      <OverviewBlock title="Foto's & metingen" onEdit={() => onEdit(7)}>
        {showPhotoStep ? (
          <>
            {photoCount} {photoCount === 1 ? 'foto' : "foto's"} · {tapeCount}{' '}
            {tapeCount === 1 ? 'meting' : 'metingen'}
          </>
        ) : (
          <span style={{ color: ORION.inkMuted }}>
            Later doen — via je dashboard
          </span>
        )}
      </OverviewBlock>
    </div>
  )
}

function OverviewBlock({
  title,
  children,
  onEdit,
}: {
  title: string
  children: React.ReactNode
  onEdit: () => void
}) {
  return (
    <div
      className="rounded-[18px] px-[16px] py-[14px]"
      style={{ background: ORION.card }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p
          className="text-[10.5px] uppercase tracking-[0.16em] m-0"
          style={{ color: ORION.inkFaded }}
        >
          {title}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70"
          style={{ color: ORION.lime }}
        >
          <Edit3 strokeWidth={2} className="w-3 h-3" />
          Wijzigen
        </button>
      </div>
      <div
        className="text-[13.5px] leading-[1.55]"
        style={{ color: ORION.ink }}
      >
        {children}
      </div>
    </div>
  )
}
