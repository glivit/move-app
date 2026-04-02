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
        <div className="animate-slide-up">
          <div className="h-3 w-16 bg-[#F0F0EE] rounded-full mb-3 animate-shimmer" />
          <div className="h-8 w-32 bg-[#F0F0EE] rounded-lg mb-2 animate-shimmer" />
          <div className="h-4 w-48 bg-[#F0F0EE] rounded-full animate-shimmer" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-[#F0F0EE] rounded-2xl animate-shimmer"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!program || !programData) {
    return (
      <div className="space-y-6">
        <div className="mb-8 animate-slide-up">
          <p className="text-label mb-3 text-[#ACACAC]">Schema</p>
          <h1
            className="page-title"
          >
            Training
          </h1>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-[#F0F0EE] text-center animate-slide-up stagger-2">
          <Dumbbell
            size={48}
            strokeWidth={1.5}
            className="text-[#D5D5D5] mx-auto mb-3"
          />
          <p className="font-medium text-[#1A1917]">
            Je trainingsschema wordt opgesteld
          </p>
          <p className="text-[14px] text-[#ACACAC] mt-2">
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
        <p className="text-label mb-3 text-[#ACACAC]">Schema</p>
        <h1
          className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1917]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Training
        </h1>
        {program && (
          <p className="text-[15px] text-[#ACACAC] mt-1">{program.title}</p>
        )}
      </div>

      {/* Periodization Bar */}
      <div className="animate-slide-up stagger-2">
        <PeriodizationBar />
      </div>

      {/* Day Picker */}
      <div className="bg-white rounded-2xl border border-[#F0F0EE] overflow-hidden animate-slide-up stagger-3">
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
          <p className="text-[14px] text-[#ACACAC]">
            {completedCount} van {currentDayExercises.length} voltooid
          </p>
          <div className="w-24 h-[3px] bg-[#F0F0EE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3D8B5C] rounded-full transition-all"
              style={{
                width: `${currentDayExercises.length > 0 ? (completedCount / currentDayExercises.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Day Title */}
      <div className="animate-slide-up stagger-4">
        <h2 className="text-[20px] font-semibold text-[#1A1917]">
          {currentDay?.name}
        </h2>
      </div>

      {/* Rest Day Message */}
      {isRestDay ? (
        <div className="bg-white rounded-2xl p-8 border border-[#F0F0EE] text-center animate-slide-up stagger-5">
          <Moon
            size={48}
            strokeWidth={1.5}
            className="text-[#D5D5D5] mx-auto mb-3"
          />
          <p className="font-medium text-[#1A1917]">
            Rustdag — geniet ervan!
          </p>
        </div>
      ) : (
        /* Exercises List */
        <div className="space-y-3">
          {currentDayExercises.map((exercise, index) => (
            <div
              key={`${activeDay}-${exercise.name}`}
              className="animate-slide-up"
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
      {program.coach_notes && (
        <div className="rounded-2xl p-5 border animate-slide-up" style={{ animationDelay: `${isRestDay ? '300ms' : 260 + currentDayExercises.length * 40 + 40}ms`, backgroundColor: 'rgba(212,106,58,0.04)', borderColor: 'rgba(212,106,58,0.12)' }}>
          <p className="text-[13px] text-[#1A1917] font-medium mb-2">
            Coach notities
          </p>
          <p className="text-[14px] text-[#1A1917] whitespace-pre-wrap">
            {program.coach_notes}
          </p>
        </div>
      )}
    </div>
  )
}
