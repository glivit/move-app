'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  X,
  GripVertical,
  Loader2,
  Users,
  Link2,
  Unlink,
  Trash2,
  Copy,
  Minus,
  Check,
  AlertCircle,
} from 'lucide-react'
import { ExerciseSearchModal } from '@/components/coach/ExerciseSearchModal'
import { ProgramAssignModal } from '@/components/coach/ProgramAssignModal'

// ─── Types ────────────────────────────────────────────────────────
interface Exercise {
  id: string
  name: string
  name_nl?: string
  body_part: string
  equipment: string
  gif_url?: string
  category?: string
}

interface ExerciseWithPrescription extends Exercise {
  prescription_id: string
  sets: number
  reps_min: number
  reps_max: number | null
  rest_seconds: number
  tempo: string | null
  rpe_target: number | null
  weight_suggestion: string | null
  notes: string | null
  sort_order: number
  superset_group_id: string | null
}

interface ProgramDay {
  id: string
  day_number: number
  name: string
  focus: string | null
  estimated_duration_min: number
  sort_order: number
  exercises: ExerciseWithPrescription[]
}

interface ProgramTemplate {
  id: string
  name: string
  description: string | null
  duration_weeks: number
  days_per_week: number
  difficulty: string
  tags: string[]
  is_archived: boolean
}

// Supabase row shapes for the nested selects
interface RawExerciseRow {
  id: string
  exercise_id: string
  sets: number
  reps_min: number
  reps_max: number | null
  rest_seconds: number
  tempo: string | null
  rpe_target: number | null
  weight_suggestion: string | null
  notes: string | null
  sort_order: number
  superset_group_id: string | null
  exercises: Exercise | Exercise[] | null
}

interface RawDayRow {
  id: string
  day_number: number
  name: string
  focus: string | null
  estimated_duration_min: number
  sort_order: number
  program_template_exercises: RawExerciseRow[] | null
}

// ─── Tokens ───────────────────────────────────────────────────────
const INK = '#FDFDFE'
const INK_MUTED = 'rgba(253,253,254,0.62)'
const INK_DIM = 'rgba(253,253,254,0.44)'
const CARD = '#474B48'
const CARD_SOFT = 'rgba(71,75,72,0.55)'
const HAIR = 'rgba(253,253,254,0.08)'
const LIME = '#C0FC01'
const AMBER = '#E8A93C'
const BLUE = '#A4C7F2'

// ─── Stepper primitive ────────────────────────────────────────────
function Stepper({
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  suffix?: string
}) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(value + step)
  return (
    <div
      className="inline-flex items-center rounded-full"
      style={{ background: 'rgba(253,253,254,0.06)' }}
    >
      <button
        type="button"
        onClick={dec}
        className="w-7 h-7 flex items-center justify-center rounded-full active:bg-[rgba(253,253,254,0.08)] transition-colors"
        style={{ color: INK_MUTED }}
        aria-label="Verlagen"
      >
        <Minus strokeWidth={1.75} className="w-3.5 h-3.5" />
      </button>
      <span
        className="px-2 text-[13px] font-medium tabular-nums select-none"
        style={{ color: INK, minWidth: suffix ? 44 : 28, textAlign: 'center' }}
      >
        {value}
        {suffix && (
          <span className="text-[10.5px] ml-0.5" style={{ color: INK_MUTED }}>
            {suffix}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={inc}
        className="w-7 h-7 flex items-center justify-center rounded-full active:bg-[rgba(253,253,254,0.08)] transition-colors"
        style={{ color: INK_MUTED }}
        aria-label="Verhogen"
      >
        <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Field label + input primitives ───────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[10.5px] font-medium uppercase tracking-[0.08em] mb-1.5"
      style={{ color: INK_DIM }}
    >
      {children}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', style, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full px-3 py-2 rounded-xl text-[13.5px] transition-colors ${className}`}
      style={{
        background: 'rgba(253,253,254,0.05)',
        color: INK,
        border: '1px solid rgba(253,253,254,0.06)',
        outline: 'none',
        ...style,
      }}
    />
  )
}

// ─── SaveStatePill ───────────────────────────────────────────────
// Visuele feedback voor de debounced-save. Geen knop — coach hoeft niets te
// doen, maar wel bevestiging dat zijn wijzigingen gelanden.
function SaveStatePill({ state }: { state: 'idle' | 'pending' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[11.5px] font-medium"
        style={{ background: 'rgba(253,253,254,0.06)', color: INK_DIM }}
        title="Wijzigingen worden automatisch opgeslagen"
      >
        Auto-opslaan
      </span>
    )
  }
  if (state === 'pending' || state === 'saving') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[11.5px] font-medium"
        style={{ background: 'rgba(253,253,254,0.08)', color: INK_MUTED }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Opslaan…
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[11.5px] font-medium transition-opacity"
        style={{ background: 'rgba(192,252,1,0.14)', color: LIME }}
      >
        <Check className="w-3 h-3" strokeWidth={2.25} />
        Opgeslagen
      </span>
    )
  }
  // error
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[11.5px] font-medium"
      style={{ background: 'rgba(232,169,60,0.18)', color: AMBER }}
    >
      <AlertCircle className="w-3 h-3" />
      Niet opgeslagen
    </span>
  )
}

/**
 * Coach · Programma-editor (v3 Orion).
 * Sticky dark-chip header, chip-pill day tabs, dark cards, stepper prescriptions.
 */
export default function ProgramEditorPage() {
  const params = useParams() as unknown as { id: string }
  const router = useRouter()
  const supabase = createClient()

  const [program, setProgram] = useState<ProgramTemplate | null>(null)
  const [days, setDays] = useState<ProgramDay[]>([])
  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [confirmDeleteDay, setConfirmDeleteDay] = useState<string | null>(null)
  const [deletingDay, setDeletingDay] = useState(false)
  const [duplicatingDay, setDuplicatingDay] = useState(false)

  const templateId = params.id

  // ─── Fetch program + days ────────────────────────────────────────
  useEffect(() => {
    const fetchProgram = async () => {
      try {
        setLoading(true)

        const { data: templateData, error: templateError } = await supabase
          .from('program_templates')
          .select('*')
          .eq('id', templateId)
          .single()

        if (templateError) throw templateError
        setProgram(templateData)

        const { data: daysData, error: daysError } = await supabase
          .from('program_template_days')
          .select(
            `
            id,
            day_number,
            name,
            focus,
            estimated_duration_min,
            sort_order,
            program_template_exercises (
              id,
              exercise_id,
              sets,
              reps_min,
              reps_max,
              rest_seconds,
              tempo,
              rpe_target,
              weight_suggestion,
              notes,
              sort_order,
              superset_group_id,
              exercises (
                id,
                name,
                name_nl,
                body_part,
                equipment,
                gif_url,
                category
              )
            )
          `
          )
          .eq('template_id', templateId)
          .order('sort_order', { ascending: true })

        if (daysError) throw daysError

        const formattedDays: ProgramDay[] = ((daysData || []) as RawDayRow[]).map((day) => ({
          id: day.id,
          day_number: day.day_number,
          name: day.name,
          focus: day.focus,
          estimated_duration_min: day.estimated_duration_min,
          sort_order: day.sort_order,
          exercises: (day.program_template_exercises || [])
            .map((exe) => {
              const exerciseData = Array.isArray(exe.exercises) ? exe.exercises[0] : exe.exercises
              if (!exerciseData) return null
              return {
                ...exerciseData,
                prescription_id: exe.id,
                sets: exe.sets,
                reps_min: exe.reps_min,
                reps_max: exe.reps_max,
                rest_seconds: exe.rest_seconds,
                tempo: exe.tempo,
                rpe_target: exe.rpe_target,
                weight_suggestion: exe.weight_suggestion,
                notes: exe.notes,
                sort_order: exe.sort_order,
                superset_group_id: exe.superset_group_id || null,
              }
            })
            .filter((ex): ex is ExerciseWithPrescription => ex !== null && !!ex.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        }))

        setDays(formattedDays)
        if (formattedDays.length > 0) {
          setActiveDayId(formattedDays[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch program:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgram()
  }, [templateId, supabase])

  const activeDay = days.find((d) => d.id === activeDayId)

  // ─── Day handlers ────────────────────────────────────────────────
  const handleAddDay = async () => {
    const newDayNumber = Math.max(0, ...days.map((d) => d.day_number)) + 1
    const newSortOrder = Math.max(0, ...days.map((d) => d.sort_order)) + 1

    try {
      const { data, error } = await supabase
        .from('program_template_days')
        .insert({
          template_id: templateId,
          day_number: newDayNumber,
          name: `Dag ${String.fromCharCode(65 + newDayNumber)}`,
          focus: null,
          estimated_duration_min: 60,
          sort_order: newSortOrder,
        })
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        const newDay: ProgramDay = {
          id: data[0].id,
          day_number: data[0].day_number,
          name: data[0].name,
          focus: data[0].focus,
          estimated_duration_min: data[0].estimated_duration_min,
          sort_order: data[0].sort_order,
          exercises: [],
        }
        setDays([...days, newDay])
        setActiveDayId(newDay.id)
      }
    } catch (error) {
      console.error('Failed to add day:', error)
    }
  }

  const handleRemoveDay = async (dayId: string) => {
    setDeletingDay(true)
    try {
      const { error: exError } = await supabase
        .from('program_template_exercises')
        .delete()
        .eq('template_day_id', dayId)
      if (exError) throw exError

      const { error: dayError } = await supabase
        .from('program_template_days')
        .delete()
        .eq('id', dayId)
      if (dayError) throw dayError

      const remainingDays = days.filter((d) => d.id !== dayId)
      setDays(remainingDays)
      setConfirmDeleteDay(null)

      if (activeDayId === dayId) {
        setActiveDayId(remainingDays.length > 0 ? remainingDays[0].id : null)
      }

      if (program) {
        const newCount = remainingDays.length
        setProgram({ ...program, days_per_week: newCount })
        await supabase
          .from('program_templates')
          .update({ days_per_week: newCount })
          .eq('id', templateId)
      }
    } catch (error) {
      console.error('Failed to remove day:', error)
    } finally {
      setDeletingDay(false)
    }
  }

  const handleDuplicateDay = async (dayId: string) => {
    const sourceDayData = days.find((d) => d.id === dayId)
    if (!sourceDayData) return

    setDuplicatingDay(true)
    try {
      const newDayNumber = Math.max(0, ...days.map((d) => d.day_number)) + 1
      const newSortOrder = Math.max(0, ...days.map((d) => d.sort_order)) + 1

      const { data: newDayRow, error: dayError } = await supabase
        .from('program_template_days')
        .insert({
          template_id: templateId,
          day_number: newDayNumber,
          name: `${sourceDayData.name} (kopie)`,
          focus: sourceDayData.focus,
          estimated_duration_min: sourceDayData.estimated_duration_min,
          sort_order: newSortOrder,
        })
        .select()
        .single()

      if (dayError || !newDayRow) throw dayError

      let newExercises: ExerciseWithPrescription[] = []
      if (sourceDayData.exercises.length > 0) {
        const exerciseInserts = sourceDayData.exercises.map((ex) => ({
          template_day_id: newDayRow.id,
          exercise_id: ex.id,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          rpe_target: ex.rpe_target,
          weight_suggestion: ex.weight_suggestion,
          notes: ex.notes,
          sort_order: ex.sort_order,
          superset_group_id: null,
        }))

        const { data: insertedExercises, error: exError } = await supabase
          .from('program_template_exercises')
          .insert(exerciseInserts)
          .select('*, exercises(*)')

        if (exError) throw exError

        if (insertedExercises) {
          newExercises = (insertedExercises as RawExerciseRow[])
            .map((row) => {
              const exerciseData = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises
              if (!exerciseData) return null
              return {
                ...exerciseData,
                prescription_id: row.id,
                sets: row.sets,
                reps_min: row.reps_min,
                reps_max: row.reps_max,
                rest_seconds: row.rest_seconds,
                tempo: row.tempo,
                rpe_target: row.rpe_target,
                weight_suggestion: row.weight_suggestion,
                notes: row.notes,
                sort_order: row.sort_order,
                superset_group_id: row.superset_group_id,
              }
            })
            .filter((ex): ex is ExerciseWithPrescription => ex !== null)
        }
      }

      const newDay: ProgramDay = {
        id: newDayRow.id,
        day_number: newDayRow.day_number,
        name: newDayRow.name,
        focus: newDayRow.focus,
        estimated_duration_min: newDayRow.estimated_duration_min,
        sort_order: newDayRow.sort_order,
        exercises: newExercises,
      }

      setDays([...days, newDay])
      setActiveDayId(newDay.id)

      if (program) {
        const newCount = days.length + 1
        setProgram({ ...program, days_per_week: newCount })
        await supabase
          .from('program_templates')
          .update({ days_per_week: newCount })
          .eq('id', templateId)
      }
    } catch (error) {
      console.error('Failed to duplicate day:', error)
      alert('Kon dag niet dupliceren. Probeer opnieuw.')
    } finally {
      setDuplicatingDay(false)
    }
  }

  // ─── Exercise handlers ───────────────────────────────────────────
  const handleAddExercise = async (exercise: Exercise) => {
    if (!activeDay) return

    const isCardio = exercise.category === 'cardio'

    try {
      const newSortOrder = Math.max(0, ...activeDay.exercises.map((e) => e.sort_order)) + 1

      const { data, error } = await supabase
        .from('program_template_exercises')
        .insert({
          template_day_id: activeDay.id,
          exercise_id: exercise.id,
          sets: isCardio ? 1 : 3,
          reps_min: isCardio ? 20 : 8,
          reps_max: isCardio ? null : 12,
          rest_seconds: isCardio ? 0 : 90,
          tempo: null,
          rpe_target: null,
          weight_suggestion: null,
          notes: null,
          sort_order: newSortOrder,
        })
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        const newExerciseWithPrescription: ExerciseWithPrescription = {
          ...exercise,
          prescription_id: data[0].id,
          sets: isCardio ? 1 : 3,
          reps_min: isCardio ? 20 : 8,
          reps_max: isCardio ? null : 12,
          rest_seconds: isCardio ? 0 : 90,
          tempo: null,
          rpe_target: null,
          weight_suggestion: null,
          notes: null,
          sort_order: newSortOrder,
          superset_group_id: null,
        }

        setDays(
          days.map((d) =>
            d.id === activeDay.id
              ? { ...d, exercises: [...d.exercises, newExerciseWithPrescription] }
              : d
          )
        )
      }
    } catch (error) {
      console.error('Failed to add exercise:', error)
    }
  }

  const handleRemoveExercise = async (prescriptionId: string) => {
    if (!activeDay) return

    try {
      const { error } = await supabase
        .from('program_template_exercises')
        .delete()
        .eq('id', prescriptionId)

      if (error) throw error

      setDays(
        days.map((d) =>
          d.id === activeDay.id
            ? { ...d, exercises: d.exercises.filter((e) => e.prescription_id !== prescriptionId) }
            : d
        )
      )
    } catch (error) {
      console.error('Failed to remove exercise:', error)
    }
  }

  // ─── Drag & drop ─────────────────────────────────────────────────
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    const dragEl = e.currentTarget as HTMLElement
    e.dataTransfer.setDragImage(dragEl, 20, 20)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === dropIndex || !activeDay) {
        setDraggedIndex(null)
        setDragOverIndex(null)
        return
      }

      const updatedExercises = [...activeDay.exercises]
      const [moved] = updatedExercises.splice(draggedIndex, 1)
      updatedExercises.splice(dropIndex, 0, moved)

      const reordered = updatedExercises.map((ex, i) => ({ ...ex, sort_order: i }))

      setDays(
        days.map((d) => (d.id === activeDay.id ? { ...d, exercises: reordered } : d))
      )

      setDraggedIndex(null)
      setDragOverIndex(null)

      try {
        for (const ex of reordered) {
          await supabase
            .from('program_template_exercises')
            .update({ sort_order: ex.sort_order })
            .eq('id', ex.prescription_id)
        }
      } catch (error) {
        console.error('Failed to reorder exercises:', error)
      }
    },
    [draggedIndex, activeDay, days, supabase]
  )

  // ─── Debounced save ──────────────────────────────────────────────
  // Program-editor slaat per field debounced op (600ms). Er is geen expliciete
  // 'Opslaan'-knop want we wilden geen "dirty state" UI. Coach vroeg terecht:
  // "is er wel een opslaan-knop?" → antwoord: nee, maar we tonen nu wel een
  // visuele save-state pill zodat je weet dat je wijzigingen gelanden.
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const inflightCount = useRef(0)
  const savedTimer = useRef<NodeJS.Timeout | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')

  const debouncedSave = useCallback(
    (key: string, saveFn: () => Promise<void>, delay = 600) => {
      if (saveTimers.current[key]) clearTimeout(saveTimers.current[key])
      setSaveState('pending')
      saveTimers.current[key] = setTimeout(async () => {
        inflightCount.current += 1
        setSaveState('saving')
        try {
          await saveFn()
          inflightCount.current -= 1
          if (inflightCount.current <= 0) {
            inflightCount.current = 0
            setSaveState('saved')
            if (savedTimer.current) clearTimeout(savedTimer.current)
            savedTimer.current = setTimeout(() => setSaveState('idle'), 1800)
          }
        } catch (error) {
          inflightCount.current = Math.max(0, inflightCount.current - 1)
          setSaveState('error')
          console.error('Save failed:', error)
        }
      }, delay)
    },
    []
  )

  const handleUpdateExercisePrescription = (
    prescriptionId: string,
    field: string,
    value: string | number | null
  ) => {
    setDays(
      days.map((d) => {
        if (d.id === activeDay?.id) {
          return {
            ...d,
            exercises: d.exercises.map((e) =>
              e.prescription_id === prescriptionId ? { ...e, [field]: value } : e
            ),
          }
        }
        return d
      })
    )

    debouncedSave(`exercise-${prescriptionId}-${field}`, async () => {
      const { error } = await supabase
        .from('program_template_exercises')
        .update({ [field]: value })
        .eq('id', prescriptionId)
      if (error) throw error
    })
  }

  const handleUpdateDayField = (dayId: string, field: string, value: string | number | null) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, [field]: value } : d)))

    debouncedSave(`day-${dayId}-${field}`, async () => {
      const { error } = await supabase
        .from('program_template_days')
        .update({ [field]: value })
        .eq('id', dayId)
      if (error) throw error
    })
  }

  // ─── Loading / empty states ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: INK_MUTED }} />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="pb-32 text-center">
        <p className="text-[14px]" style={{ color: INK_MUTED }}>
          Programma niet gevonden
        </p>
        <Link
          href="/coach/programs"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium"
          style={{ background: CARD, color: INK }}
        >
          <ArrowLeft strokeWidth={1.75} className="w-4 h-4" />
          Terug
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-32">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={() => router.push('/coach/programs')}
          className="flex items-center gap-1.5 transition-opacity active:opacity-70"
          style={{
            background: CARD,
            color: INK,
            padding: '7px 12px 7px 9px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
          }}
          aria-label="Terug"
        >
          <ArrowLeft strokeWidth={1.75} className="w-[15px] h-[15px]" />
          Terug
        </button>

        <div className="flex-1" />

        <SaveStatePill state={saveState} />

        <button
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium transition-opacity active:opacity-70"
          style={{
            background: LIME,
            color: '#0A0E0B',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          <Users strokeWidth={2} className="w-4 h-4" />
          Toewijzen
        </button>
      </div>

      {/* Title block */}
      <div className="mb-5 px-0.5">
        <h1
          className="text-[28px] font-light tracking-[-0.025em] leading-[1.1]"
          style={{ fontFamily: 'var(--font-display)', color: INK }}
        >
          {program.name}
        </h1>
        <div
          className="mt-1.5 text-[12px] tracking-[0.04em]"
          style={{ color: INK_MUTED }}
        >
          {program.duration_weeks} {program.duration_weeks === 1 ? 'week' : 'weken'}
          {' · '}
          {program.days_per_week} {program.days_per_week === 1 ? 'dag' : 'dagen'}/week
        </div>
      </div>

      {/* ═══ Day tabs (horizontal scroll) ═══ */}
      <div className="-mx-[22px] px-[22px] overflow-x-auto pb-1 mb-4 scrollbar-hide">
        <div className="flex gap-1.5 min-w-max">
          {days.map((day) => {
            const isActive = activeDayId === day.id
            return (
              <button
                key={day.id}
                onClick={() => setActiveDayId(day.id)}
                className="inline-flex items-center rounded-full px-3.5 py-[7px] text-[12.5px] font-medium whitespace-nowrap transition-colors"
                style={
                  isActive
                    ? {
                        background: CARD,
                        color: INK,
                        boxShadow:
                          'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
                      }
                    : {
                        background: 'rgba(253,253,254,0.06)',
                        color: INK_MUTED,
                      }
                }
              >
                {day.name}
              </button>
            )
          })}

          <button
            onClick={handleAddDay}
            className="inline-flex items-center gap-1 rounded-full px-3 py-[7px] text-[12.5px] font-medium whitespace-nowrap transition-colors"
            style={{
              background: 'rgba(192,252,1,0.14)',
              color: LIME,
            }}
          >
            <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
            Dag
          </button>
        </div>
      </div>

      {/* ═══ Active day content ═══ */}
      {activeDay && (
        <div>
          {/* Day details card */}
          <div
            className="rounded-[18px] p-4 mb-4"
            style={{ background: CARD }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Dag naam</FieldLabel>
                <TextInput
                  type="text"
                  value={activeDay.name}
                  onChange={(e) =>
                    handleUpdateDayField(activeDay.id, 'name', e.target.value)
                  }
                />
              </div>
              <div>
                <FieldLabel>Focus (optioneel)</FieldLabel>
                <TextInput
                  type="text"
                  placeholder="bv. Upper Body"
                  value={activeDay.focus || ''}
                  onChange={(e) =>
                    handleUpdateDayField(activeDay.id, 'focus', e.target.value || null)
                  }
                />
              </div>
              <div>
                <FieldLabel>Duur (min)</FieldLabel>
                <TextInput
                  type="number"
                  value={activeDay.estimated_duration_min}
                  onChange={(e) =>
                    handleUpdateDayField(
                      activeDay.id,
                      'estimated_duration_min',
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
            </div>

            {/* Day actions */}
            <div
              className="mt-4 pt-3 flex items-center gap-3"
              style={{ borderTop: `1px solid ${HAIR}` }}
            >
              {confirmDeleteDay === activeDay.id ? (
                <>
                  <p
                    className="text-[12px] font-medium flex-1"
                    style={{ color: AMBER }}
                  >
                    &quot;{activeDay.name}&quot; verwijderen? Alle oefeningen ook.
                  </p>
                  <button
                    onClick={() => setConfirmDeleteDay(null)}
                    className="px-3 py-1.5 rounded-full text-[11.5px] font-medium"
                    style={{ background: 'rgba(253,253,254,0.06)', color: INK_MUTED }}
                  >
                    Annuleer
                  </button>
                  <button
                    onClick={() => handleRemoveDay(activeDay.id)}
                    disabled={deletingDay}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11.5px] font-semibold disabled:opacity-50"
                    style={{ background: 'rgba(232,169,60,0.18)', color: AMBER }}
                  >
                    {deletingDay ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Verwijder
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleDuplicateDay(activeDay.id)}
                    disabled={duplicatingDay}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity active:opacity-70 disabled:opacity-50"
                    style={{ color: INK_MUTED }}
                  >
                    {duplicatingDay ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Copy strokeWidth={1.75} className="w-3.5 h-3.5" />
                    )}
                    Dupliceren
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setConfirmDeleteDay(activeDay.id)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity active:opacity-70"
                    style={{ color: AMBER }}
                  >
                    <Trash2 strokeWidth={1.75} className="w-3.5 h-3.5" />
                    Verwijder dag
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Exercises section */}
          <div className="flex items-baseline justify-between mb-2 px-0.5">
            <h2
              className="text-[13px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: INK_DIM }}
            >
              Oefeningen
            </h2>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: INK_DIM }}
            >
              {activeDay.exercises.length}
            </span>
          </div>

          {activeDay.exercises.length === 0 ? (
            <div
              className="rounded-[18px] px-6 py-10 text-center"
              style={{ background: CARD_SOFT }}
            >
              <p className="text-[14px] mb-4" style={{ color: INK_MUTED }}>
                Nog geen oefeningen
              </p>
              <button
                onClick={() => setShowExerciseModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium"
                style={{ background: 'rgba(192,252,1,0.14)', color: LIME }}
              >
                <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
                Eerste oefening toevoegen
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeDay.exercises.map((exercise, index) => {
                const isInSuperset = !!exercise.superset_group_id
                const nextExercise = activeDay.exercises[index + 1]
                const prevExercise = activeDay.exercises[index - 1]
                const sameGroupAsNext =
                  isInSuperset && nextExercise?.superset_group_id === exercise.superset_group_id
                const sameGroupAsPrev =
                  isInSuperset && prevExercise?.superset_group_id === exercise.superset_group_id
                const isDragged = draggedIndex === index
                const isDragOver = dragOverIndex === index && draggedIndex !== index
                const isCardio = exercise.category === 'cardio'

                return (
                  <div
                    key={exercise.prescription_id}
                    className={`relative transition-all duration-200 ${
                      isDragged ? 'opacity-40 scale-[0.98]' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    {/* Drop indicator */}
                    {isDragOver && draggedIndex !== null && draggedIndex > index && (
                      <div
                        className="absolute -top-1 left-0 right-0 h-[2px] rounded-full z-10"
                        style={{ background: LIME }}
                      />
                    )}
                    {isDragOver && draggedIndex !== null && draggedIndex < index && (
                      <div
                        className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full z-10"
                        style={{ background: LIME }}
                      />
                    )}

                    {/* Superset connector (lime) */}
                    {sameGroupAsPrev && (
                      <div
                        className="absolute -top-2 left-5 w-[2px] h-2 z-10"
                        style={{ background: LIME }}
                      />
                    )}

                    <div
                      className="rounded-[18px] p-4"
                      style={{
                        background: CARD,
                        boxShadow: isInSuperset
                          ? `inset 3px 0 0 ${LIME}, 0 1px 2px rgba(0,0,0,0.10)`
                          : '0 1px 2px rgba(0,0,0,0.10)',
                      }}
                    >
                      {isInSuperset && (
                        <div className="mb-2">
                          <span
                            className="text-[9.5px] font-semibold uppercase tracking-[0.12em] rounded-full px-2 py-[3px]"
                            style={{
                              background: 'rgba(192,252,1,0.14)',
                              color: LIME,
                            }}
                          >
                            {sameGroupAsPrev || sameGroupAsNext ? 'Superset' : 'Superset'}
                          </span>
                        </div>
                      )}

                      {/* Exercise header */}
                      <div className="flex items-start gap-3">
                        <div
                          className="flex-shrink-0 pt-0.5 cursor-grab active:cursor-grabbing touch-none"
                          style={{ color: INK_DIM }}
                        >
                          <GripVertical strokeWidth={1.75} className="w-4 h-4" />
                        </div>

                        <div
                          className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ background: 'rgba(253,253,254,0.08)' }}
                        >
                          {exercise.gif_url ? (
                            <Image
                              src={exercise.gif_url}
                              alt={exercise.name}
                              width={44}
                              height={44}
                              className="w-full h-full object-cover"
                              unoptimized
                              style={{ mixBlendMode: 'luminosity' }}
                            />
                          ) : null}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-[14.5px] font-medium tracking-[-0.005em] truncate"
                            style={{ color: INK }}
                          >
                            {exercise.name_nl || exercise.name}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span
                              className="text-[10.5px] rounded-full px-2 py-[2px] tracking-[0.02em]"
                              style={{
                                background: 'rgba(253,253,254,0.06)',
                                color: INK_MUTED,
                              }}
                            >
                              {exercise.body_part}
                            </span>
                            {exercise.equipment && (
                              <span
                                className="text-[10.5px] rounded-full px-2 py-[2px] tracking-[0.02em]"
                                style={{
                                  background: 'rgba(253,253,254,0.06)',
                                  color: INK_DIM,
                                }}
                              >
                                {exercise.equipment}
                              </span>
                            )}
                            {isCardio && (
                              <span
                                className="text-[10.5px] rounded-full px-2 py-[2px] tracking-[0.02em] font-medium"
                                style={{
                                  background: 'rgba(164,199,242,0.14)',
                                  color: BLUE,
                                }}
                              >
                                Cardio
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          {index > 0 && (
                            <button
                              onClick={() => {
                                if (exercise.superset_group_id) {
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'superset_group_id',
                                    null
                                  )
                                } else {
                                  const prev = activeDay.exercises[index - 1]
                                  const groupId =
                                    prev.superset_group_id || `ss-${Date.now()}`
                                  if (!prev.superset_group_id) {
                                    handleUpdateExercisePrescription(
                                      prev.prescription_id,
                                      'superset_group_id',
                                      groupId
                                    )
                                  }
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'superset_group_id',
                                    groupId
                                  )
                                }
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                              style={{
                                background: exercise.superset_group_id
                                  ? 'rgba(192,252,1,0.14)'
                                  : 'transparent',
                                color: exercise.superset_group_id ? LIME : INK_DIM,
                              }}
                              title={
                                exercise.superset_group_id
                                  ? 'Superset opheffen'
                                  : 'Superset met vorige'
                              }
                            >
                              {exercise.superset_group_id ? (
                                <Unlink strokeWidth={1.75} className="w-4 h-4" />
                              ) : (
                                <Link2 strokeWidth={1.75} className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() =>
                              handleRemoveExercise(exercise.prescription_id)
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                            style={{ color: INK_DIM }}
                          >
                            <X strokeWidth={1.75} className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Prescription rows */}
                      <div
                        className="mt-3 pt-3"
                        style={{ borderTop: `1px solid ${HAIR}` }}
                      >
                        {isCardio ? (
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: INK_MUTED }}
                              >
                                Duur
                              </span>
                              <Stepper
                                value={exercise.reps_min}
                                onChange={(v) =>
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'reps_min',
                                    v
                                  )
                                }
                                min={1}
                                suffix="min"
                              />
                            </div>
                            <div>
                              <FieldLabel>Notities</FieldLabel>
                              <TextInput
                                type="text"
                                placeholder="bv. helling 12%, 5.5 km/u"
                                value={exercise.notes || ''}
                                onChange={(e) =>
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'notes',
                                    e.target.value || null
                                  )
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: INK_MUTED }}
                              >
                                Sets
                              </span>
                              <Stepper
                                value={exercise.sets}
                                onChange={(v) =>
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'sets',
                                    v
                                  )
                                }
                                min={1}
                              />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: INK_MUTED }}
                              >
                                Reps
                              </span>
                              <div className="inline-flex items-center gap-1.5">
                                <Stepper
                                  value={exercise.reps_min}
                                  onChange={(v) =>
                                    handleUpdateExercisePrescription(
                                      exercise.prescription_id,
                                      'reps_min',
                                      v
                                    )
                                  }
                                  min={1}
                                />
                                <span
                                  className="text-[11px]"
                                  style={{ color: INK_DIM }}
                                >
                                  ─
                                </span>
                                <Stepper
                                  value={exercise.reps_max || exercise.reps_min}
                                  onChange={(v) =>
                                    handleUpdateExercisePrescription(
                                      exercise.prescription_id,
                                      'reps_max',
                                      v
                                    )
                                  }
                                  min={1}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: INK_MUTED }}
                              >
                                Rust
                              </span>
                              <Stepper
                                value={exercise.rest_seconds}
                                onChange={(v) =>
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'rest_seconds',
                                    v
                                  )
                                }
                                min={0}
                                step={15}
                                suffix="s"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <FieldLabel>Tempo</FieldLabel>
                                <TextInput
                                  type="text"
                                  placeholder="3-1-1-0"
                                  value={exercise.tempo || ''}
                                  onChange={(e) =>
                                    handleUpdateExercisePrescription(
                                      exercise.prescription_id,
                                      'tempo',
                                      e.target.value || null
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <FieldLabel>RPE</FieldLabel>
                                <TextInput
                                  type="number"
                                  placeholder="6-10"
                                  value={exercise.rpe_target || ''}
                                  onChange={(e) =>
                                    handleUpdateExercisePrescription(
                                      exercise.prescription_id,
                                      'rpe_target',
                                      e.target.value ? parseInt(e.target.value) : null
                                    )
                                  }
                                  min={0}
                                  max={10}
                                />
                              </div>
                            </div>

                            <div>
                              <FieldLabel>Gewicht (optioneel)</FieldLabel>
                              <TextInput
                                type="text"
                                placeholder="50-60 kg"
                                value={exercise.weight_suggestion || ''}
                                onChange={(e) =>
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'weight_suggestion',
                                    e.target.value || null
                                  )
                                }
                              />
                            </div>

                            <div>
                              <FieldLabel>Aantekeningen</FieldLabel>
                              <textarea
                                placeholder="Bijzondere instructies..."
                                value={exercise.notes || ''}
                                onChange={(e) =>
                                  handleUpdateExercisePrescription(
                                    exercise.prescription_id,
                                    'notes',
                                    e.target.value || null
                                  )
                                }
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl text-[13.5px] resize-none transition-colors"
                                style={{
                                  background: 'rgba(253,253,254,0.05)',
                                  color: INK,
                                  border: '1px solid rgba(253,253,254,0.06)',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add exercise CTA */}
              <button
                onClick={() => setShowExerciseModal(true)}
                className="w-full py-3.5 rounded-[18px] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-opacity active:opacity-70"
                style={{
                  background: 'rgba(192,252,1,0.14)',
                  color: LIME,
                }}
              >
                <Plus strokeWidth={1.75} className="w-4 h-4" />
                Oefening toevoegen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ExerciseSearchModal
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSelect={handleAddExercise}
      />

      {program && (
        <ProgramAssignModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          templateId={program.id}
          templateName={program.name}
          durationWeeks={program.duration_weeks}
        />
      )}
    </div>
  )
}
