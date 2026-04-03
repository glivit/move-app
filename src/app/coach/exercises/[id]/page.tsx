'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  name_nl?: string
  body_part: string
  target_muscle: string
  secondary_muscles?: string
  equipment: string
  gif_url?: string
  video_url?: string
  instructions?: string | string[]
  coach_tips?: string
  coach_notes?: string
  category?: string
  is_visible: boolean
  exercisedb_id?: string
}

type ToastType = 'success' | 'error'

interface Toast {
  type: ToastType
  message: string
}

const CATEGORIES = [
  { value: 'strength', label: 'Kracht' },
  { value: 'hypertrophy', label: 'Hypertrofie' },
  { value: 'endurance', label: 'Uithoudingsvermogen' },
  { value: 'mobility', label: 'Mobiliteit' },
  { value: 'flexibility', label: 'Flexibiliteit' },
  { value: 'balance', label: 'Balans' },
  { value: 'power', label: 'Kracht/Snelheid' },
  { value: 'stability', label: 'Stabiliteit' },
]

function Toast({ type, message }: Toast) {
  return (
    <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-2xl text-white ${
      type === 'success' ? 'bg-data-green' : 'bg-data-red'
    }`}>
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
      ) : (
        <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
      )}
      <span className="text-[14px] font-medium">{message}</span>
    </div>
  )
}

export default function ExerciseDetailPage() {
  const params = useParams() as unknown as { id: string }
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  // Form state
  const [nameNl, setNameNl] = useState('')
  const [coachTips, setCoachTips] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [category, setCategory] = useState('')
  const [instructions, setInstructions] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error

        const ex = data as Exercise
        setExercise(ex)
        setNameNl(ex.name_nl || '')
        setCoachTips(ex.coach_tips || '')
        setCoachNotes(ex.coach_notes || '')
        setIsVisible(ex.is_visible)
        setCategory(ex.category || '')
        setGifUrl(ex.gif_url || '')
        setVideoUrl(ex.video_url || '')
        setInstructions(
          Array.isArray(ex.instructions)
            ? ex.instructions.join('\n')
            : ex.instructions || ''
        )
      } catch (error) {
        console.error('Failed to fetch exercise:', error)
        setToast({ type: 'error', message: 'Fout bij laden oefening' })
      } finally {
        setLoading(false)
      }
    }

    fetchExercise()
  }, [params.id, supabase])

  const handleSave = async () => {
    if (!exercise) return

    try {
      setSaving(true)
      const res = await fetch(`/api/exercises/${exercise.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_nl: nameNl,
          coach_tips: coachTips,
          coach_notes: coachNotes,
          instructions: instructions,
          is_visible: isVisible,
          category: category,
          gif_url: gifUrl,
          video_url: videoUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fout bij opslaan')
      }

      setToast({ type: 'success', message: 'Oefening opgeslagen' })
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Failed to save exercise:', error)
      setToast({ type: 'error', message: 'Fout bij opslaan oefening' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-client-bg">
        <Loader2 className="w-8 h-8 animate-spin text-accent" strokeWidth={1.5} />
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-client-bg px-4 py-8">
        <Link
          href="/coach/exercises"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dark mb-6 font-medium text-[15px]"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          Terug
        </Link>
        <div className="bg-white rounded-2xl shadow-clean p-12 flex flex-col items-center justify-center">
          <h3 className="text-[15px] font-semibold text-text-primary mb-1">Oefening niet gevonden</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-client-bg">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/coach/exercises"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dark font-medium text-[15px]"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          Terug
        </Link>
      </div>

      {/* Exercise Header */}
      <div className="mb-8">
        <h1 className="font-display text-[32px] font-semibold text-text-primary">
          {exercise.name_nl || exercise.name}
        </h1>
        {exercise.name_nl !== exercise.name && (
          <p className="text-[15px] text-client-text-secondary mt-1">{exercise.name}</p>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - GIF and Basic Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* GIF Display */}
          <div className="bg-white rounded-2xl shadow-clean overflow-hidden">
            <div className="aspect-video bg-[#FAFAFA] flex items-center justify-center">
              {exercise.gif_url ? (
                <Image
                  src={exercise.gif_url}
                  alt={exercise.name}
                  width={500}
                  height={375}
                  className="w-full h-full object-cover"
                  unoptimized
                  style={{ mixBlendMode: 'multiply' }}
                />
              ) : (
                <div className="text-center text-client-text-secondary">
                  <p className="text-[13px]">Geen afbeelding</p>
                </div>
              )}
            </div>
          </div>

          {/* Video Display */}
          {exercise.video_url && (
            <div className="bg-white rounded-2xl shadow-clean overflow-hidden">
              <div className="p-3 border-b border-client-border">
                <p className="text-[12px] font-semibold text-client-text-secondary">VIDEO</p>
              </div>
              <div className="aspect-video">
                {exercise.video_url.includes('youtube.com') || exercise.video_url.includes('youtu.be') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${
                      exercise.video_url.includes('youtu.be')
                        ? exercise.video_url.split('/').pop()?.split('?')[0]
                        : new URL(exercise.video_url).searchParams.get('v')
                    }`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : exercise.video_url.includes('vimeo.com') ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${exercise.video_url.split('/').pop()}`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={exercise.video_url}
                    controls
                    className="w-full h-full object-contain bg-black"
                  />
                )}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-clean p-4 space-y-4">
            <div>
              <p className="text-[13px] font-semibold text-client-text-secondary mb-1">LICHAAMSDEEL</p>
              <p className="text-[15px] font-medium text-text-primary">{exercise.body_part}</p>
            </div>
            <div className="border-t border-client-border pt-4">
              <p className="text-[13px] font-semibold text-client-text-secondary mb-1">DOELSPIER</p>
              <p className="text-[15px] font-medium text-text-primary">{exercise.target_muscle}</p>
            </div>
            {exercise.secondary_muscles && (
              <div className="border-t border-client-border pt-4">
                <p className="text-[13px] font-semibold text-client-text-secondary mb-1">SECUNDAIRE SPIEREN</p>
                <p className="text-[15px] font-medium text-text-primary">{exercise.secondary_muscles}</p>
              </div>
            )}
            <div className="border-t border-client-border pt-4">
              <p className="text-[13px] font-semibold text-client-text-secondary mb-1">APPARATUUR</p>
              <p className="text-[15px] font-medium text-text-primary">{exercise.equipment}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Editable Fields */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dutch Name */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
              NEDERLANDSE NAAM
            </label>
            <input
              type="text"
              value={nameNl}
              onChange={(e) => setNameNl(e.target.value)}
              placeholder="Vul Nederlandse naam in..."
              className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
              CATEGORIE
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Selecteer categorie...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* GIF URL */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
              GIF URL
            </label>
            <input
              type="url"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="https://example.com/exercise.gif"
              className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Video URL */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
              VIDEO URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... of directe video URL"
              className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p className="text-[13px] text-client-text-secondary mt-2">YouTube, Vimeo of directe videolink</p>
          </div>

          {/* Coach Tips */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
              JOUW COACHING TIPS VOOR CLIËNTEN
            </label>
            <textarea
              value={coachTips}
              onChange={(e) => setCoachTips(e.target.value)}
              placeholder="Voeg coaching tips toe..."
              rows={5}
              className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
            <p className="text-[13px] text-client-text-secondary mt-2">Zichtbaar voor cliënten in de bibliotheek</p>
          </div>

          {/* Coach Notes */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
              INTERNE NOTITIES
            </label>
            <textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="Voeg interne notities toe..."
              rows={5}
              className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
            <p className="text-[13px] text-client-text-secondary mt-2">Niet zichtbaar voor cliënten</p>
          </div>

          {/* Visibility Toggle */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-text-primary">Zichtbaar in bibliotheek</span>
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
              />
            </label>
            <p className="text-[13px] text-client-text-secondary mt-2">Verberg deze oefening voor cliënten</p>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-2xl shadow-clean p-4">
            <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
              INSTRUCTIES
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Voeg uitvoeringsinstructies toe..."
              rows={6}
              className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
            <p className="text-[13px] text-client-text-secondary mt-2">Zichtbaar voor cliënten bij de oefening</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-2xl font-semibold text-[15px] hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
              Opslaan...
            </>
          ) : (
            'Opslaan'
          )}
        </button>
      </div>

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  )
}
