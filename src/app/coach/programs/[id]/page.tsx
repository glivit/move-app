'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Plus,
  X,
  GripVertical,
  Loader2,
  Users,
  Link2,
  Unlink,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ExerciseSearchModal } from '@/components/coach/ExerciseSearchModal'
import { ProgramAssignModal } from '@/components/coach/ProgramAssignModal'

interface Exercise {
  id: string
  name: string
  name_nl?: string
  body_part: string
  equipment: string
  gif_url?: string
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

export default function ProgramEditorPage() {
  const params = useParams() as unknown as { id: string }
  const router = useRouter()
  const supabase = createClient()

  const [program, setProgram] = useState<ProgramTemplate | null>(null)
  const [days, setDays] = useState<ProgramDay[]>([])
  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)

  const templateId = params.id

  // Fetch program and days
  useEffect(() => {
    const fetchProgram = async () => {
      try {
        setLoading(true)

        // Fetch template
        const { data: templateData, error: templateError } = await supabase
          .from('program_templates')
          .select('*')
          .eq('id', templateId)
          .single()

        if (templateError) throw templateError
        setProgram(templateData)

        // Fetch days with exercises
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
                gif_url
              )
            )
          `
          )
          .eq('template_id', templateId)
          .order('sort_order', { ascending: true })

        if (daysError) throw daysError

        const formattedDays: ProgramDay[] = (daysData || []).map((day: any) => ({
          id: day.id,
          day_number: day.day_number,
          name: day.name,
          focus: day.focus,
          estimated_duration_min: day.estimated_duration_min,
          sort_order: day.sort_order,
          exercises: (day.program_template_exercises || [])
            .map((exe: any) => {
              const exerciseData = Array.isArray(exe.exercises) ? exe.exercises[0] : exe.exercises
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
            }})
            .filter((ex: any) => ex.id)
            .sort((a: ExerciseWithPrescription, b: ExerciseWithPrescription) => a.sort_order - b.sort_order),
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

  const handleAddExercise = async (exercise: Exercise) => {
    if (!activeDay) return

    try {
      const newSortOrder = Math.max(0, ...activeDay.exercises.map((e) => e.sort_order)) + 1

      const { data, error } = await supabase
        .from('program_template_exercises')
        .insert({
          template_day_id: activeDay.id,
          exercise_id: exercise.id,
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 90,
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
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 90,
          tempo: null,
          rpe_target: null,
          weight_suggestion: null,
          notes: null,
          sort_order: newSortOrder,
          superset_group_id: null,
        }

        setDays(
          days.map((d) => {
            if (d.id === activeDay.id) {
              return {
                ...d,
                exercises: [...d.exercises, newExerciseWithPrescription],
              }
            }
            return d
          })
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
        days.map((d) => {
          if (d.id === activeDay.id) {
            return {
              ...d,
              exercises: d.exercises.filter((e) => e.prescription_id !== prescriptionId),
            }
          }
          return d
        })
      )
    } catch (error) {
      console.error('Failed to remove exercise:', error)
    }
  }

  // Drag & drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Set a small transparent drag image
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

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex || !activeDay) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const updatedExercises = [...activeDay.exercises]
    const [moved] = updatedExercises.splice(draggedIndex, 1)
    updatedExercises.splice(dropIndex, 0, moved)

    // Update sort orders for all exercises
    const reordered = updatedExercises.map((ex, i) => ({
      ...ex,
      sort_order: i,
    }))

    // Optimistic UI update
    setDays(
      days.map((d) =>
        d.id === activeDay.id ? { ...d, exercises: reordered } : d
      )
    )

    setDraggedIndex(null)
    setDragOverIndex(null)

    // Persist all sort_orders to DB
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
  }, [draggedIndex, activeDay, days, supabase])

  // Debounce refs for DB saves
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({})

  const debouncedSave = useCallback((key: string, saveFn: () => Promise<void>, delay = 600) => {
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      try { await saveFn() } catch (error) { console.error('Save failed:', error) }
    }, delay)
  }, [])

  const handleUpdateExercisePrescription = (
    prescriptionId: string,
    field: string,
    value: any
  ) => {
    // Update local state immediately (fast UI)
    setDays(
      days.map((d) => {
        if (d.id === activeDay?.id) {
          return {
            ...d,
            exercises: d.exercises.map((e) =>
              e.prescription_id === prescriptionId
                ? { ...e, [field]: value }
                : e
            ),
          }
        }
        return d
      })
    )

    // Debounce DB save
    debouncedSave(`exercise-${prescriptionId}-${field}`, async () => {
      const { error } = await supabase
        .from('program_template_exercises')
        .update({ [field]: value })
        .eq('id', prescriptionId)
      if (error) throw error
    })
  }

  const handleUpdateDayField = (dayId: string, field: string, value: any) => {
    // Update local state immediately
    setDays(
      days.map((d) => (d.id === dayId ? { ...d, [field]: value } : d))
    )

    // Debounce DB save
    debouncedSave(`day-${dayId}-${field}`, async () => {
      const { error } = await supabase
        .from('program_template_days')
        .update({ [field]: value })
        .eq('id', dayId)
      if (error) throw error
    })
  }

  const handleUpdateTemplate = (field: string, value: any) => {
    if (!program) return

    setProgram({ ...program, [field]: value })

    debouncedSave(`template-${field}`, async () => {
      const { error } = await supabase
        .from('program_templates')
        .update({ [field]: value })
        .eq('id', templateId)
      if (error) throw error
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B6914]" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[15px] text-[#8E8E93]">Programma niet gevonden</p>
          <Link href="/coach/programs" className="mt-4 inline-block">
            <Button variant="secondary">Terug naar programma's</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-[#F0F0ED] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Link href="/coach/programs" className="inline-flex items-center gap-2 text-[#8B6914] mb-4 hover:text-[#1A1A18] transition-colors">
            <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
            <span className="text-[15px] font-medium">Terug</span>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1
                className="text-[32px] font-display font-semibold text-[#1A1A18] mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {program.name}
              </h1>
              <p className="text-[13px] text-[#8E8E93]">
                {program.duration_weeks} weken · {program.days_per_week} dagen/week
              </p>
            </div>

            <Button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2"
            >
              <Users strokeWidth={1.5} className="w-5 h-5" />
              <span>Toewijzen</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="bg-white border-b border-[#F0F0ED] overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 py-4">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => setActiveDayId(day.id)}
                className={`px-4 py-2 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors ${
                  activeDayId === day.id
                    ? 'bg-[#8B6914] text-white'
                    : 'bg-[#F5F0E8] text-[#8B6914] hover:bg-[#ECEAE3]'
                }`}
              >
                {day.name}
              </button>
            ))}

            <button
              onClick={handleAddDay}
              className="px-4 py-2 rounded-full text-[15px] font-medium text-[#8B6914] bg-[#F5F0E8] hover:bg-[#ECEAE3] transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <Plus strokeWidth={1.5} className="w-5 h-5" />
              Dag toevoegen
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeDay && (
          <div>
            {/* Day Details */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-6 mb-8">
              <div className="grid grid-cols-3 gap-6">
                {/* Day Name */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Dag naam
                  </label>
                  <input
                    type="text"
                    value={activeDay.name}
                    onChange={(e) =>
                      handleUpdateDayField(activeDay.id, 'name', e.target.value)
                    }
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#F0F0ED] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                  />
                </div>

                {/* Focus Area */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Focus (optioneel)
                  </label>
                  <input
                    type="text"
                    placeholder="bijv. Upper Body"
                    value={activeDay.focus || ''}
                    onChange={(e) =>
                      handleUpdateDayField(activeDay.id, 'focus', e.target.value || null)
                    }
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#F0F0ED] rounded-2xl text-[15px] text-[#1A1A18] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Geschatte duur (min)
                  </label>
                  <input
                    type="number"
                    value={activeDay.estimated_duration_min}
                    onChange={(e) =>
                      handleUpdateDayField(
                        activeDay.id,
                        'estimated_duration_min',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#F0F0ED] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-3">
              <h2 className="text-[17px] font-semibold text-[#1A1A18]">Oefeningen</h2>

              {activeDay.exercises.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-8 text-center">
                  <p className="text-[15px] text-[#8E8E93] mb-4">
                    Voeg oefeningen toe om aan de slag te gaan
                  </p>
                  <Button onClick={() => setShowExerciseModal(true)}>
                    <Plus strokeWidth={1.5} className="w-5 h-5 mr-2" />
                    Oefening toevoegen
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDay.exercises.map((exercise, index) => {
                    const isInSuperset = !!exercise.superset_group_id
                    const nextExercise = activeDay.exercises[index + 1]
                    const prevExercise = activeDay.exercises[index - 1]
                    const sameGroupAsNext = isInSuperset && nextExercise?.superset_group_id === exercise.superset_group_id
                    const sameGroupAsPrev = isInSuperset && prevExercise?.superset_group_id === exercise.superset_group_id
                    const isDragged = draggedIndex === index
                    const isDragOver = dragOverIndex === index && draggedIndex !== index

                    return (
                    <div
                      key={exercise.prescription_id}
                      className={`relative transition-all duration-200 ${isDragged ? 'opacity-40 scale-[0.98]' : ''} ${isDragOver ? 'translate-y-1' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      {/* Drop indicator line */}
                      {isDragOver && draggedIndex !== null && draggedIndex > index && (
                        <div className="absolute -top-1.5 left-0 right-0 h-[3px] bg-[#8B6914] rounded-full z-10" />
                      )}
                      {isDragOver && draggedIndex !== null && draggedIndex < index && (
                        <div className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-[#8B6914] rounded-full z-10" />
                      )}
                      {/* Superset connector line */}
                      {sameGroupAsPrev && (
                        <div className="absolute -top-3 left-6 w-[2px] h-3 bg-[#AF52DE]" />
                      )}
                      {isInSuperset && (
                        <div className="absolute top-0 left-4 bottom-0 w-1 rounded-full bg-[#AF52DE]/20" />
                      )}
                      <div className={`bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border p-5 ${
                        isInSuperset ? 'border-[#AF52DE]/30 ml-3' : 'border-[#F0F0ED]'
                      } ${isDragOver ? 'border-[#8B6914] shadow-[0_0_0_1px_rgba(139,105,20,0.3)]' : ''}`}>
                        {isInSuperset && (
                          <div className="mb-2 -mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#AF52DE] bg-[#AF52DE]/10 px-2 py-0.5 rounded-full">
                              Superset
                            </span>
                          </div>
                        )}
                      {/* Exercise Header */}
                      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-[#F0F0ED]">
                        {/* Drag Handle */}
                        <div className="flex-shrink-0 pt-1 cursor-grab active:cursor-grabbing touch-none">
                          <GripVertical strokeWidth={1.5} className="w-5 h-5 text-[#C7C7CC] hover:text-[#8E8E93] transition-colors" />
                        </div>

                        {/* GIF Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-[#FAFAFA] flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {exercise.gif_url ? (
                            <img
                              src={exercise.gif_url}
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              style={{ mixBlendMode: 'multiply' }}
                            />
                          ) : (
                            <div className="w-full h-full bg-[#F0F0ED]" />
                          )}
                        </div>

                        {/* Exercise Info */}
                        <div className="flex-1">
                          <h3 className="text-[15px] font-semibold text-[#1A1A18]">
                            {exercise.name_nl || exercise.name}
                          </h3>
                          <div className="flex gap-2 mt-2">
                            <span className="text-[11px] bg-[#F5F0E8] text-[#8B6914] px-2 py-0.5 rounded-full">
                              {exercise.body_part}
                            </span>
                            {exercise.equipment && (
                              <span className="text-[11px] bg-[#F0F0ED] text-[#8E8E93] px-2 py-0.5 rounded-full">
                                {exercise.equipment}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          {/* Superset toggle */}
                          {index > 0 && (
                            <button
                              onClick={() => {
                                if (exercise.superset_group_id) {
                                  handleUpdateExercisePrescription(exercise.prescription_id, 'superset_group_id', null)
                                } else {
                                  const prev = activeDay.exercises[index - 1]
                                  const groupId = prev.superset_group_id || `ss-${Date.now()}`
                                  if (!prev.superset_group_id) {
                                    handleUpdateExercisePrescription(prev.prescription_id, 'superset_group_id', groupId)
                                  }
                                  handleUpdateExercisePrescription(exercise.prescription_id, 'superset_group_id', groupId)
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                exercise.superset_group_id
                                  ? 'text-[#AF52DE] bg-[#AF52DE]/10 hover:bg-[#AF52DE]/20'
                                  : 'text-[#8E8E93] hover:text-[#AF52DE] hover:bg-[#F5F0E8]'
                              }`}
                              title={exercise.superset_group_id ? 'Superset opheffen' : 'Superset met vorige'}
                            >
                              {exercise.superset_group_id ? (
                                <Unlink strokeWidth={1.5} className="w-5 h-5" />
                              ) : (
                                <Link2 strokeWidth={1.5} className="w-5 h-5" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveExercise(exercise.prescription_id)}
                            className="p-2 text-[#8E8E93] hover:text-red-600 hover:bg-[#F5F0E8] rounded-lg transition-colors"
                          >
                            <X strokeWidth={1.5} className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Prescription Fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Sets */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#8E8E93] mb-1 uppercase">
                            Sets
                          </label>
                          <input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) =>
                              handleUpdateExercisePrescription(
                                exercise.prescription_id,
                                'sets',
                                parseInt(e.target.value) || 1
                              )
                            }
                            min="1"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                          />
                        </div>

                        {/* Reps */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#8E8E93] mb-1 uppercase">
                            Reps
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={exercise.reps_min}
                              onChange={(e) =>
                                handleUpdateExercisePrescription(
                                  exercise.prescription_id,
                                  'reps_min',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              min="1"
                              className="flex-1 px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                            />
                            <span className="text-[#8E8E93] px-1 py-2">-</span>
                            <input
                              type="number"
                              value={exercise.reps_max || exercise.reps_min}
                              onChange={(e) =>
                                handleUpdateExercisePrescription(
                                  exercise.prescription_id,
                                  'reps_max',
                                  parseInt(e.target.value) || null
                                )
                              }
                              min="1"
                              className="flex-1 px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                            />
                          </div>
                        </div>

                        {/* Rest */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#8E8E93] mb-1 uppercase">
                            Rest (s)
                          </label>
                          <input
                            type="number"
                            value={exercise.rest_seconds}
                            onChange={(e) =>
                              handleUpdateExercisePrescription(
                                exercise.prescription_id,
                                'rest_seconds',
                                parseInt(e.target.value) || 60
                              )
                            }
                            min="0"
                            step="15"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                          />
                        </div>

                        {/* Tempo */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#8E8E93] mb-1 uppercase">
                            Tempo
                          </label>
                          <input
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
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      {/* Additional Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* RPE Target */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#8E8E93] mb-1 uppercase">
                            RPE Target (optioneel)
                          </label>
                          <input
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
                            min="0"
                            max="10"
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                          />
                        </div>

                        {/* Weight Suggestion */}
                        <div>
                          <label className="block text-[11px] font-medium text-[#8E8E93] mb-1 uppercase">
                            Weight Suggestion (optioneel)
                          </label>
                          <input
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
                            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mt-4">
                        <label className="block text-[11px] font-medium text-[#8E8E93] mb-1 uppercase">
                          Aantekeningen (optioneel)
                        </label>
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
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:bg-white transition-colors resize-none"
                        />
                      </div>
                    </div>
                    </div>
                    )
                  })}

                  {/* Add Exercise Button */}
                  <button
                    onClick={() => setShowExerciseModal(true)}
                    className="w-full py-4 border-2 border-dashed border-[#F0F0ED] rounded-2xl text-[15px] font-medium text-[#8B6914] hover:border-[#8B6914] hover:bg-[#F5F0E8] transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus strokeWidth={1.5} className="w-5 h-5" />
                    Oefening toevoegen
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
