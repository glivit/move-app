'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Search, X } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  name_nl?: string
  body_part: string
  equipment: string
  gif_url?: string
  category?: string
}

interface ExerciseSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

export function ExerciseSearchModal({ isOpen, onClose, onSelect }: ExerciseSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const searchExercises = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([])
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('exercises')
          .select('id, name, name_nl, body_part, equipment, gif_url, category')
          .or(`name.ilike.%${query}%,name_nl.ilike.%${query}%`)
          .limit(20)

        if (error) throw error
        setResults(data || [])
      } catch (error) {
        console.error('Failed to search exercises:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      searchExercises(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchExercises])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#A6ADA7] rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#A6ADA7] flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[#FDFDFE]">Oefening toevoegen</h2>
            <button
              onClick={onClose}
              className="text-[#D6D9D6] hover:text-[#FDFDFE] transition-colors p-1"
            >
              <X strokeWidth={1.5} className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-5 border-b border-[#A6ADA7]">
            <div className="relative">
              <Search
                strokeWidth={1.5}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D6D9D6]"
              />
              <input
                type="text"
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#A6ADA7] border border-[#A6ADA7] rounded-2xl text-[15px] text-[#FDFDFE] placeholder:text-[#D6D9D6] focus:outline-none focus:ring-2 focus:ring-[#FDFDFE] focus:bg-[#A6ADA7] transition-colors"
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-5 text-center text-[#D6D9D6] text-[15px]">
                Laden...
              </div>
            )}

            {!loading && results.length === 0 && searchQuery && (
              <div className="p-5 text-center text-[#D6D9D6] text-[15px]">
                Geen oefeningen gevonden
              </div>
            )}

            {!loading && !searchQuery && (
              <div className="p-5 text-center text-[#D6D9D6] text-[15px]">
                Begin met typen om oefeningen te zoeken
              </div>
            )}

            {results.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => {
                  onSelect(exercise)
                  onClose()
                  setSearchQuery('')
                }}
                className="w-full px-5 py-4 border-b border-[#A6ADA7] hover:bg-[#A6ADA7] transition-colors flex items-start gap-3 text-left group"
              >
                {/* Mini GIF */}
                <div className="w-8 h-8 rounded-lg bg-[#A6ADA7] flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {exercise.gif_url ? (
                    <Image
                      src={exercise.gif_url}
                      alt={exercise.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#A6ADA7]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[#FDFDFE] truncate">
                    {exercise.name_nl || exercise.name}
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[11px] bg-[#A6ADA7] text-[#FDFDFE] px-2 py-0.5 rounded-full">
                      {exercise.body_part}
                    </span>
                    {exercise.equipment && (
                      <span className="text-[11px] bg-[#A6ADA7] text-[#D6D9D6] px-2 py-0.5 rounded-full">
                        {exercise.equipment}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
