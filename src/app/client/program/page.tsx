'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { DayPicker } from '@/components/client/DayPicker'
import { ExerciseCard } from '@/components/client/ExerciseCard'
import { PeriodizationBar } from '@/components/client/PeriodizationBar'
import { Dumbbell, Moon } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────
// Deze pagina leest *niet* meer uit de legacy `programs`-tabel, maar
// uit `client_programs` → `program_templates` → `program_template_days`
// → `program_template_exercises` → `exercises`. Dat is de enige bron
// van waarheid sinds de v3 editor en ook wat het dashboard, de
// weekly-plan mail en de coach-app gebruiken.

interface ResolvedExercise {
  name: string
  nameNl?: string
  bodyPart?: string
  targetMuscle?: string
  equipment?: string
  gifUrl?: string
  videoUrl?: string
  sets: number
  reps: string
  rest: number
  notes?: string
}

interface ResolvedDay {
  name: string
  focus?: string | null
  exercises: ResolvedExercise[]
}

interface ProgramSummary {
  id: string
  name: string
  coachNotes: string | null
}

// Replace em/en dashes with "·" (user-preference: email/UI zonder em dashes).
function scrub(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  return s.replace(/\s*[—–]\s*/g, ' · ')
}

function formatReps(min: number, max: number | null): string {
  if (max && max !== min) return `${min}-${max}`
  return `${min}`
}

export default function ClientProgramPage() {
  const [program, setProgram] = useState<ProgramSummary | null>(null)
  const [days, setDays] = useState<ResolvedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(0)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    new Set()
  )
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set())

  useEffect(() => {
    const loadProgram = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // 1. Actief client_program
        const { data: cp, error: cpErr } = await supabase
          .from('client_programs')
          .select('id, name, coach_notes, template_id, schedule')
          .eq('client_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cpErr) {
          console.error('Error loading client_program:', cpErr)
          setLoading(false)
          return
        }
        if (!cp) {
          setLoading(false)
          return
        }

        setProgram({
          id: cp.id,
          name: cp.name,
          coachNotes: cp.coach_notes,
        })

        // 2. Template days
        const { data: tplDays, error: tdErr } = await supabase
          .from('program_template_days')
          .select('id, day_number, name, focus, sort_order')
          .eq('template_id', cp.template_id)
          .order('sort_order', { ascending: true })

        if (tdErr) {
          console.error('Error loading template_days:', tdErr)
          setLoading(false)
          return
        }

        const daysById = new Map<string, typeof tplDays[0]>()
        ;(tplDays ?? []).forEach((d) => daysById.set(d.id, d))

        // 3. Oefeningen — alle template_day_ids in 1 query, geresolvd via
        // de nested join naar `exercises`.
        const dayIds = (tplDays ?? []).map((d) => d.id)
        const exercisesByDay = new Map<string, ResolvedExercise[]>()
        if (dayIds.length > 0) {
          const { data: exRows, error: exErr } = await supabase
            .from('program_template_exercises')
            .select(
              `
              template_day_id, sort_order, sets, reps_min, reps_max, rest_seconds, notes,
              exercises (
                name, name_nl, body_part, target_muscle, equipment, gif_url, video_url
              )
              `,
            )
            .in('template_day_id', dayIds)
            .order('sort_order', { ascending: true })
          if (exErr) {
            console.error('Error loading template_exercises:', exErr)
          }
          ;(exRows ?? []).forEach((row: any) => {
            const list = exercisesByDay.get(row.template_day_id) ?? []
            const ex = row.exercises
            if (ex) {
              list.push({
                name: ex.name,
                nameNl: ex.name_nl ?? undefined,
                bodyPart: ex.body_part ?? undefined,
                targetMuscle: ex.target_muscle ?? undefined,
                equipment: ex.equipment ?? undefined,
                gifUrl: ex.gif_url ?? undefined,
                videoUrl: ex.video_url ?? undefined,
                sets: row.sets ?? 3,
                reps: formatReps(row.reps_min ?? 8, row.reps_max ?? null),
                rest: row.rest_seconds ?? 90,
                notes: scrub(row.notes),
              })
            }
            exercisesByDay.set(row.template_day_id, list)
          })
        }

        // 4. Schedule → 7 weekdagen (Ma..Zo = 1..7)
        const schedule = (cp.schedule ?? {}) as Record<string, string>
        const dutchDowLong = [
          'Maandag',
          'Dinsdag',
          'Woensdag',
          'Donderdag',
          'Vrijdag',
          'Zaterdag',
          'Zondag',
        ]
        const week: ResolvedDay[] = []
        for (let i = 0; i < 7; i++) {
          const weekday = i + 1 // 1..7
          const templateDayId = schedule[String(weekday)]
          const td = templateDayId ? daysById.get(templateDayId) : undefined
          if (td) {
            week.push({
              name: scrub(td.name) ?? td.name,
              focus: scrub(td.focus),
              exercises: exercisesByDay.get(td.id) ?? [],
            })
          } else {
            week.push({
              name: dutchDowLong[i],
              focus: null,
              exercises: [],
            })
          }
        }
        setDays(week)

        // Default active day = vandaag (Ma=0..Zo=6).
        const today = new Date().getDay() // 0=Sun..6=Sat
        const idx = today === 0 ? 6 : today - 1
        setActiveDay(idx)
      } catch (err) {
        console.error('Error loading program:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProgram()
  }, [])

  const toggleExerciseComplete = (exerciseId: string) => {
    const newCompleted = new Set(completedExercises)
    if (newCompleted.has(exerciseId)) {
      newCompleted.delete(exerciseId)
    } else {
      newCompleted.add(exerciseId)
    }
    setCompletedExercises(newCompleted)

    const currentDayExercises = days[activeDay]?.exercises || []
    const allCompleted = currentDayExercises.every((ex) =>
      newCompleted.has(`${activeDay}-${ex.name}`)
    )

    const newCompletedDays = new Set(completedDays)
    if (allCompleted && currentDayExercises.length > 0) {
      newCompletedDays.add(activeDay)
    } else {
      newCompletedDays.delete(activeDay)
    }
    setCompletedDays(newCompletedDays)
  }

  const currentDay = days[activeDay]
  const currentDayExercises = currentDay?.exercises ?? []
  const completedCount = currentDayExercises.filter((ex) =>
    completedExercises.has(`${activeDay}-${ex.name}`)
  ).length
  const isRestDay = currentDayExercises.length === 0

  // DayPicker: een dag met exercises = trainingsdag, leeg = rust.
  // We geven namen door; DayPicker zelf rendert Ma/Di/Wo bolletjes
  // via weekday-index, dus de exacte string maakt enkel uit voor
  // `hasExercises` logic. Lege string = rust, niet-leeg = training.
  const dayNames = days.map((d) => (d.exercises.length > 0 ? d.name : ''))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-slide-up">
          <div className="h-3 w-16 bg-[rgba(28,30,24,0.10)] rounded-full mb-3 animate-shimmer" />
          <div className="h-8 w-32 bg-[rgba(28,30,24,0.10)] rounded-lg mb-2 animate-shimmer" />
          <div className="h-4 w-48 bg-[rgba(28,30,24,0.10)] rounded-full animate-shimmer" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-[rgba(28,30,24,0.10)] rounded-2xl animate-shimmer"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="space-y-6">
        <div className="mb-8 animate-slide-up">
          <p className="text-label mb-3 text-[rgba(28,30,24,0.62)]">Schema</p>
          <h1 className="page-title">Training</h1>
        </div>
        <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-md rounded-2xl p-8 border border-[rgba(28,30,24,0.10)] text-center animate-slide-up stagger-2">
          <Dumbbell
            size={48}
            strokeWidth={1.5}
            className="text-[rgba(253,253,254,0.35)] mx-auto mb-3"
          />
          <p className="font-medium text-[#1C1E18]">
            Je trainingsschema wordt opgesteld
          </p>
          <p className="text-[14px] text-[rgba(28,30,24,0.62)] mt-2">
            Je coach zal binnenkort een trainingsplan voor je opstellen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mb-8 animate-slide-up">
        <p className="text-label mb-3 text-[rgba(28,30,24,0.62)]">Schema</p>
        <h1 className="page-title">Training</h1>
        <p className="text-[15px] text-[rgba(28,30,24,0.62)] mt-1">
          {program.name}
        </p>
      </div>

      {/* Periodization Bar */}
      <div className="animate-slide-up stagger-2">
        <PeriodizationBar />
      </div>

      {/* Day Picker */}
      <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-md rounded-2xl border border-[rgba(28,30,24,0.10)] overflow-hidden animate-slide-up stagger-3">
        <DayPicker
          days={dayNames}
          activeDay={activeDay}
          onDayChange={setActiveDay}
          completedDays={Array.from(completedDays)}
        />
      </div>

      {/* Progress Text */}
      {!isRestDay && (
        <div className="flex items-center justify-between animate-slide-up stagger-4">
          <p className="text-[14px] text-[rgba(28,30,24,0.62)]">
            {completedCount} van {currentDayExercises.length} voltooid
          </p>
          <div className="w-24 h-[2px] bg-[rgba(28,30,24,0.10)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2FA65A] rounded-full transition-all"
              style={{
                width: `${currentDayExercises.length > 0 ? (completedCount / currentDayExercises.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Day Title Hero */}
      <div className="mt-12 animate-slide-up stagger-4">
        <h2 className="page-title">{currentDay?.name}</h2>
        {currentDay?.focus && (
          <p className="text-[14px] text-[rgba(28,30,24,0.62)] mt-1">
            {currentDay.focus}
          </p>
        )}
      </div>

      {/* Rest Day Message */}
      {isRestDay ? (
        <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-md rounded-2xl p-8 border border-[rgba(28,30,24,0.10)] text-center animate-slide-up stagger-5">
          <Moon
            size={48}
            strokeWidth={1.5}
            className="text-[rgba(253,253,254,0.35)] mx-auto mb-3"
          />
          <p className="font-medium text-[#1C1E18]">
            Rustdag · geniet ervan!
          </p>
        </div>
      ) : (
        /* Exercises List */
        <div className="divide-y divide-[rgba(28,30,24,0.10)]">
          {currentDayExercises.map((exercise, index) => (
            <div
              key={`${activeDay}-${exercise.name}-${index}`}
              className="py-5 animate-slide-up"
              style={{ animationDelay: `${260 + index * 40}ms` }}
            >
              <ExerciseCard
                exercise={exercise}
                index={index}
                completed={completedExercises.has(`${activeDay}-${exercise.name}`)}
                onToggle={() =>
                  toggleExerciseComplete(`${activeDay}-${exercise.name}`)
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Coach Notes */}
      {program.coachNotes && (
        <div
          className="mt-12 mb-12 pl-4 border-l-2 border-[#C0FC01] animate-slide-up"
          style={{
            animationDelay: `${isRestDay ? '300ms' : 260 + currentDayExercises.length * 40 + 40}ms`,
          }}
        >
          <p className="text-[13px] text-[#1C1E18] font-medium mb-2">
            Coach notities
          </p>
          <p className="text-[14px] text-[#1C1E18] whitespace-pre-wrap">
            {program.coachNotes}
          </p>
        </div>
      )}
    </div>
  )
}
