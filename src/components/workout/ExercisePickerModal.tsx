'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import Image from 'next/image'
import { Search, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight'
import {
  type Exercise,
  BODY_PART_OPTIONS,
  EQUIPMENT_OPTIONS,
} from '@/types/workout'

/**
 * ExercisePickerModal — slide-up sheet om een oefening te kiezen of aan
 * te maken. Geëxtraheerd uit workout/active/page.tsx als losse lazy-load
 * chunk: pas downloaden + parsen wanneer user op "Oefening toevoegen" tikt.
 */
function ExercisePickerModalComponent({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newExercise, setNewExercise] = useState({
    name_nl: '',
    body_part: '',
    target_muscle: '',
    equipment: 'body weight',
  })

  const viewportHeight = useVisualViewportHeight()

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('exercises')
          .select('id, name, name_nl, body_part, target_muscle, equipment, gif_url, video_url, instructions, coach_tips, category')
          .order('name_nl', { ascending: true })
          .limit(500)
        if (data) {
          setExercises(data as Exercise[])
          setFilteredExercises(data as Exercise[])
        }
      } catch (err) {
        console.error('Error loading exercises:', err)
      } finally {
        setLoading(false)
      }
    }
    loadExercises()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExercises(exercises)
      return
    }
    const q = searchQuery.toLowerCase()
    setFilteredExercises(
      exercises.filter(
        (ex) =>
          (ex.name_nl || '').toLowerCase().includes(q) ||
          (ex.name || '').toLowerCase().includes(q) ||
          (ex.body_part || '').toLowerCase().includes(q) ||
          (ex.target_muscle || '').toLowerCase().includes(q) ||
          (ex.equipment || '').toLowerCase().includes(q)
      )
    )
  }, [searchQuery, exercises])

  const handleSelectExercise = useCallback((exercise: Exercise) => {
    onSelect(exercise)
  }, [onSelect])

  const handleCreateExercise = async () => {
    if (!newExercise.name_nl.trim()) { setCreateError('Vul een naam in'); return }
    if (!newExercise.body_part) { setCreateError('Kies een lichaamsgroep'); return }
    if (!newExercise.target_muscle.trim()) { setCreateError('Vul een doelspier in'); return }

    setCreating(true)
    setCreateError('')

    try {
      const supabase = createClient()
      const { data: { session: authSession } } = await supabase.auth.getSession()

      const res = await fetch('/api/exercises/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({
          name_nl: newExercise.name_nl.trim(),
          body_part: newExercise.body_part,
          target_muscle: newExercise.target_muscle.trim(),
          equipment: newExercise.equipment,
          category: 'strength',
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Kon oefening niet aanmaken')
      if (result.exercise) onSelect(result.exercise as Exercise)
    } catch (err) {
      console.error('Error creating exercise:', err)
      setCreateError(err instanceof Error ? err.message : 'Kon oefening niet aanmaken')
    } finally {
      setCreating(false)
    }
  }

  const handleShowCreateForm = () => {
    if (searchQuery.trim()) {
      setNewExercise(prev => ({ ...prev, name_nl: searchQuery.trim() }))
    }
    setShowCreateForm(true)
  }

  const modalHeight = viewportHeight ? Math.round(viewportHeight * 0.85) : null
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end"
      style={{
        background: 'rgba(28,30,24,0.40)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-t-3xl flex flex-col animate-slide-up dark-surface"
        style={{
          background: 'rgba(28,30,24,0.94)',
          height: modalHeight ? `${modalHeight}px` : '85dvh',
          maxHeight: modalHeight ? `${modalHeight}px` : '85dvh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.30)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.20)' }} />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-3" style={{ borderBottom: '1px solid var(--card-divider)', flexShrink: 0 }}>
          <h3 className="text-[18px] font-semibold" style={{ color: 'var(--card-text)' }}>
            {showCreateForm ? 'Nieuwe oefening' : 'Oefening toevoegen'}
          </h3>
          <button
            onClick={showCreateForm ? () => setShowCreateForm(false) : onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: 'var(--card-bg-tint)' }}
            aria-label="Sluiten"
          >
            <X size={18} strokeWidth={1.5} style={{ color: 'var(--card-text-muted)' }} />
          </button>
        </div>

        {showCreateForm ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'var(--card-text-muted)' }}>
                Naam oefening
              </label>
              <input
                type="text"
                value={newExercise.name_nl}
                onChange={(e) => setNewExercise(prev => ({ ...prev, name_nl: e.target.value }))}
                placeholder="bv. Bulgarian Split Squat"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-[16px] border focus:outline-none"
                style={{ background: 'var(--card-bg-tint)', color: 'var(--card-text)', borderColor: 'var(--card-divider)' }}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'var(--card-text-muted)' }}>
                Lichaamsgroep
              </label>
              <div className="flex flex-wrap gap-2">
                {BODY_PART_OPTIONS.map((bp) => (
                  <button
                    key={bp}
                    onClick={() => setNewExercise(prev => ({ ...prev, body_part: bp }))}
                    className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: newExercise.body_part === bp ? '#C0FC01' : 'rgba(255,255,255,0.10)',
                      color: newExercise.body_part === bp ? '#000' : 'var(--card-text)',
                      border: newExercise.body_part === bp ? 'none' : '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    {bp}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'var(--card-text-muted)' }}>
                Doelspier
              </label>
              <input
                type="text"
                value={newExercise.target_muscle}
                onChange={(e) => setNewExercise(prev => ({ ...prev, target_muscle: e.target.value }))}
                placeholder="bv. quadriceps, glutes"
                className="w-full rounded-xl px-4 py-3 text-[16px] border focus:outline-none focus:ring-2"
                style={{ background: 'var(--card-bg-tint)', color: 'var(--card-text)', borderColor: 'var(--card-divider)' }}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'var(--card-text-muted)' }}>
                Materiaal
              </label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <button
                    key={eq}
                    onClick={() => setNewExercise(prev => ({ ...prev, equipment: eq }))}
                    className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: newExercise.equipment === eq ? '#C0FC01' : 'rgba(255,255,255,0.10)',
                      color: newExercise.equipment === eq ? '#000' : 'var(--card-text)',
                      border: newExercise.equipment === eq ? 'none' : '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {createError && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(196,55,42,0.10)', border: '1px solid rgba(196,55,42,0.20)' }}>
                <p className="text-[13px]" style={{ color: '#B55A4A' }}>{createError}</p>
              </div>
            )}

            <button
              onClick={handleCreateExercise}
              disabled={creating}
              className="w-full font-semibold text-[13px] uppercase tracking-[0.08em] rounded-2xl py-4 transition-colors active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{ background: '#C0FC01', color: '#000' }}
            >
              {creating ? (
                <div className="w-5 h-5 border-2 border-[#C0FC01]/30 border-t-[#000] rounded-full animate-spin mx-auto" />
              ) : 'Oefening aanmaken & toevoegen'}
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 py-3" style={{ flexShrink: 0, borderBottom: '1px solid var(--card-divider)' }}>
              <div
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <Search size={16} strokeWidth={1.8} style={{ color: 'var(--card-text-muted)' }} className="flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek oefening…"
                  enterKeyHint="search"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="flex-1 bg-transparent text-[16px] border-none focus:outline-none"
                  style={{ color: 'var(--card-text)' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.10)' }}
                    aria-label="Wis zoekopdracht"
                  >
                    <X size={12} strokeWidth={2} style={{ color: 'var(--card-text-muted)' }} />
                  </button>
                )}
              </div>
              {searchQuery && filteredExercises.length > 0 && (
                <p className="text-[11px] mt-2 px-1" style={{ color: 'var(--card-text-faint)' }}>
                  {filteredExercises.length} {filteredExercises.length === 1 ? 'resultaat' : 'resultaten'}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-[1.5px] rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.20)', borderTopColor: 'var(--card-text)' }} />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[280px] space-y-4 text-center px-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Search size={22} strokeWidth={1.5} style={{ color: 'var(--card-text-muted)' }} />
                  </div>
                  <p className="text-[14px]" style={{ color: 'var(--card-text-soft)' }}>
                    Geen oefeningen gevonden voor<br />
                    <span style={{ color: 'var(--card-text)', fontWeight: 500 }}>&ldquo;{searchQuery}&rdquo;</span>
                  </p>
                  <button
                    onClick={handleShowCreateForm}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold transition-transform active:scale-[0.98]"
                    style={{ background: '#C0FC01', color: '#000', boxShadow: '0 4px 14px rgba(192,252,1,0.30)' }}
                  >
                    <Plus size={16} strokeWidth={2.2} />
                    Maak &ldquo;{searchQuery.trim()}&rdquo; aan
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectExercise(ex)}
                      className="w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 active:scale-[0.99]"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'var(--card-text)',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {ex.gif_url ? (
                          <Image src={ex.gif_url} alt="" width={44} height={44} className="w-full h-full object-cover" unoptimized loading="lazy" style={{ filter: 'saturate(0.4)' }} />
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--card-text-muted)' }}>{ex.target_muscle?.slice(0, 3)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate leading-tight" style={{ color: 'var(--card-text)' }}>{ex.name_nl || ex.name}</p>
                        <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--card-text-muted)' }}>
                          {ex.target_muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(192,252,1,0.14)' }}>
                        <Plus size={15} strokeWidth={2.2} style={{ color: '#C0FC01' }} />
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={handleShowCreateForm}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 border border-dashed mt-3 active:scale-[0.99]"
                    style={{ borderColor: 'rgba(192,252,1,0.30)', background: 'rgba(192,252,1,0.04)', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(192,252,1,0.10)' }}>
                      <Plus size={16} strokeWidth={2} style={{ color: '#C0FC01' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium" style={{ color: '#C0FC01' }}>Maak nieuwe oefening</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--card-text-muted)' }}>Staat je oefening er niet bij?</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const ExercisePickerModal = memo(ExercisePickerModalComponent)
export default ExercisePickerModal
