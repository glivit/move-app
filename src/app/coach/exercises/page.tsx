'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ExerciseCard } from '@/components/coach/ExerciseCard'
import { Search, Plus, Loader2 } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  name_nl?: string
  body_part: string
  target_muscle: string
  equipment: string
  gif_url?: string
}

const BODY_PARTS = [
  { value: 'all', label: 'Alle' },
  { value: 'chest', label: 'Borst' },
  { value: 'back', label: 'Rug' },
  { value: 'shoulders', label: 'Schouders' },
  { value: 'arms', label: 'Armen' },
  { value: 'legs', label: 'Benen' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
]

const EQUIPMENT = [
  { value: 'all', label: 'Alle' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Kabel' },
  { value: 'body weight', label: 'Body Weight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'medicine ball', label: 'Medicine Ball' },
  { value: 'resistance band', label: 'Resistance Band' },
]

function ExerciseCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-clean border border-client-border overflow-hidden animate-shimmer">
      <div className="aspect-video bg-[#F5F5F3]" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#F5F5F3] rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-6 bg-[#F5F5F3] rounded-full w-16" />
          <div className="h-6 bg-[#F5F5F3] rounded-full w-20" />
        </div>
        <div className="h-3 bg-[#F5F5F3] rounded w-1/2" />
      </div>
    </div>
  )
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBodyPart, setSelectedBodyPart] = useState('all')
  const [selectedEquipment, setSelectedEquipment] = useState('all')
  const [displayedCount, setDisplayedCount] = useState(50)

  const supabase = createClient()

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('exercises')
        .select('id, name, name_nl, body_part, target_muscle, equipment, gif_url', {
          count: 'exact',
        })
        .is('is_custom', false)
        .eq('is_visible', true)

      // Apply body part filter
      if (selectedBodyPart !== 'all') {
        query = query.eq('body_part', selectedBodyPart)
      }

      // Apply equipment filter
      if (selectedEquipment !== 'all') {
        query = query.eq('equipment', selectedEquipment)
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,name_nl.ilike.%${searchQuery}%`)
      }

      const { data, count, error } = await query
        .order('name', { ascending: true })
        .limit(displayedCount)

      if (error) throw error

      setExercises((data as Exercise[]) || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, searchQuery, selectedBodyPart, selectedEquipment, displayedCount])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const handleLoadMore = () => {
    setDisplayedCount((prev) => prev + 50)
  }

  return (
    <div className="min-h-screen bg-client-bg">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="font-display text-[32px] font-semibold text-text-primary">
          Oefeningen
        </h1>
        <p className="mt-2 text-[15px] text-client-text-secondary">
          {totalCount} oefeningen
        </p>
      </div>

      {/* Controls Section */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-client-text-secondary" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Zoek op naam..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setDisplayedCount(50)
            }}
            className="w-full pl-12 pr-4 py-3 bg-white border border-client-border rounded-2xl text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Filter Tabs */}
        <div className="space-y-3">
          {/* Body Part Tabs */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-min">
              {BODY_PARTS.map((part) => (
                <button
                  key={part.value}
                  onClick={() => {
                    setSelectedBodyPart(part.value)
                    setDisplayedCount(50)
                  }}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-[13px] font-medium transition-colors ${
                    selectedBodyPart === part.value
                      ? 'bg-accent text-white'
                      : 'bg-white border border-client-border text-text-primary hover:bg-client-surface-muted'
                  }`}
                >
                  {part.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Dropdown */}
          <select
            value={selectedEquipment}
            onChange={(e) => {
              setSelectedEquipment(e.target.value)
              setDisplayedCount(50)
            }}
            className="w-full px-4 py-2.5 bg-white border border-client-border rounded-2xl text-[13px] font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {EQUIPMENT.map((eq) => (
              <option key={eq.value} value={eq.value}>
                Equipment: {eq.label}
              </option>
            ))}
          </select>
        </div>

        {/* New Exercise Button */}
        <Link href="/coach/exercises/new">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-2xl font-semibold text-[15px] hover:bg-accent-dark transition-colors">
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            Nieuwe oefening
          </button>
        </Link>
      </div>

      {/* Exercises Grid */}
      {loading && exercises.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <ExerciseCardSkeleton key={i} />
          ))}
        </div>
      ) : exercises.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                id={exercise.id}
                name={exercise.name}
                name_nl={exercise.name_nl}
                body_part={exercise.body_part}
                target_muscle={exercise.target_muscle}
                equipment={exercise.equipment}
                gif_url={exercise.gif_url}
              />
            ))}
          </div>

          {/* Load More Button */}
          {displayedCount < totalCount && (
            <div className="flex justify-center mb-12">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-client-border rounded-2xl font-semibold text-[15px] text-text-primary hover:bg-client-surface-muted transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                    Laden...
                  </>
                ) : (
                  `Meer laden (${Math.min(50, totalCount - displayedCount)} meer)`
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-clean p-12 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-data-orange/10 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-data-orange" strokeWidth={1.5} />
          </div>
          <h3 className="text-[15px] font-semibold text-text-primary mb-1">Geen oefeningen gevonden</h3>
          <p className="text-[13px] text-client-text-secondary">Probeer andere filters of zoekwoorden.</p>
        </div>
      )}
    </div>
  )
}
