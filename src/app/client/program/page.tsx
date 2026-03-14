'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { DayPicker } from '@/components/client/DayPicker'
import { ExerciseCard } from '@/components/client/ExerciseCard'
import { PeriodizationBar } from '@/components/client/PeriodizationBar'
import { Dumbbell, Moon } from 'lucide-react'
import type { Program } from '@/types'

interface ProgramDescription {
  days: Array<{
    name: string
    exercises: Array<{
      name: string
      sets: number
      reps: string
      rest: number
      notes?: string
      videoUrl?: string
    }>
  }>
}

export default function ClientProgramPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [programData, setProgramData] = useState<ProgramDescription | null>(null)
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

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        // Get active program for current user
        const { data: activeProgram, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('client_id', user.id)
          .eq('is_active', true)
          .single()

        if (programError && programError.code !== 'PGRST116') {
          console.error('Error loading program:', programError)
          setLoading(false)
          return
        }

        if (!activeProgram) {
          setLoading(false)
          return
        }

        setProgram(activeProgram as Program)

        // Parse program description if it's not a HEVY program
        if (!activeProgram.hevy_program_id && activeProgram.description) {
          try {
            const parsed = JSON.parse(
              typeof activeProgram.description === 'string'
                ? activeProgram.description
                : JSON.stringify(activeProgram.description)
            ) as ProgramDescription
            if (parsed.days && Array.isArray(parsed.days)) {
              setProgramData(parsed)
            }
          } catch (parseError) {
            console.log('Could not parse program description as JSON')
          }
        }
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

    // Check if all exercises in current day are completed
    const currentDayExercises = programData?.days[activeDay]?.exercises || []
    const allCompleted = currentDayExercises.every((ex) =>
      newCompleted.has(`${activeDay}-${ex.name}`)
    )

    if (allCompleted && currentDayExercises.length > 0) {
      const newCompletedDays = new Set(completedDays)
      newCompletedDays.add(activeDay)
      setCompletedDays(newCompletedDays)
    } else {
      const newCompletedDays = new Set(completedDays)
      newCompletedDays.delete(activeDay)
      setCompletedDays(newCompletedDays)
    }
  }

  const dayNames = programData?.days.map((day) => day.name) || []
  const currentDay = programData?.days[activeDay]
  const currentDayExercises = currentDay?.exercises || []
  const completedCount = currentDayExercises.filter((ex) =>
    completedExercises.has(`${activeDay}-${ex.name}`)
  ).length

  const isRestDay = currentDayExercises.length === 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Training</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-client-surface-muted rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!program || !programData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Training</h1>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-clean text-center">
          <Dumbbell
            size={48}
            strokeWidth={1.5}
            className="text-client-text-secondary opacity-30 mx-auto mb-3"
          />
          <p className="font-medium text-text-primary">
            Je trainingsschema wordt opgesteld
          </p>
          <p className="text-[14px] text-client-text-secondary mt-2">
            Je coach zal binnenkort een trainingsplan voor je opstellen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Training</h1>
        <p className="text-[14px] text-client-text-secondary mt-1">
          {program.title}
        </p>
      </div>

      {/* Periodization Bar */}
      <PeriodizationBar />

      {/* Day Picker */}
      <div className="bg-white rounded-2xl shadow-clean overflow-hidden">
        <DayPicker
          days={dayNames}
          activeDay={activeDay}
          onDayChange={setActiveDay}
          completedDays={Array.from(completedDays)}
        />
      </div>

      {/* Progress Text */}
      {!isRestDay && (
        <p className="text-[14px] text-client-text-secondary">
          {completedCount} van {currentDayExercises.length} oefeningen voltooid
        </p>
      )}

      {/* Day Title */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary">
          {currentDay?.name}
        </h2>
      </div>

      {/* Rest Day Message */}
      {isRestDay ? (
        <div className="bg-white rounded-2xl p-8 shadow-clean text-center">
          <Moon
            size={48}
            strokeWidth={1.5}
            className="text-client-text-secondary opacity-30 mx-auto mb-3"
          />
          <p className="font-medium text-text-primary">
            Rustdag — geniet ervan!
          </p>
        </div>
      ) : (
        /* Exercises List */
        <div className="space-y-3">
          {currentDayExercises.map((exercise, index) => (
            <ExerciseCard
              key={`${activeDay}-${exercise.name}`}
              exercise={exercise}
              index={index}
              completed={completedExercises.has(`${activeDay}-${exercise.name}`)}
              onToggle={() =>
                toggleExerciseComplete(`${activeDay}-${exercise.name}`)
              }
            />
          ))}
        </div>
      )}

      {/* Coach Notes */}
      {program.coach_notes && (
        <div className="bg-accent/5 rounded-2xl p-5 border border-accent/20">
          <p className="text-[13px] text-text-primary font-medium mb-2">
            Coach notities
          </p>
          <p className="text-[14px] text-text-primary whitespace-pre-wrap">
            {program.coach_notes}
          </p>
        </div>
      )}
    </div>
  )
}
