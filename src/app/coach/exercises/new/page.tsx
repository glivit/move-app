'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type ToastType = 'success' | 'error'

interface Toast {
  type: ToastType
  message: string
}

const BODY_PARTS = [
  { value: 'chest', label: 'Borst' },
  { value: 'back', label: 'Rug' },
  { value: 'shoulders', label: 'Schouders' },
  { value: 'arms', label: 'Armen' },
  { value: 'legs', label: 'Benen' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
]

const EQUIPMENT = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Kabel' },
  { value: 'body weight', label: 'Body Weight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'medicine ball', label: 'Medicine Ball' },
  { value: 'resistance band', label: 'Resistance Band' },
  { value: 'smith machine', label: 'Smith Machine' },
  { value: 'trx', label: 'TRX / Suspension' },
  { value: 'foam roller', label: 'Foam Roller' },
  { value: 'ez bar', label: 'EZ Curl Bar' },
  { value: 'trap bar', label: 'Trap Bar / Hex Bar' },
  { value: 'pull up bar', label: 'Pull-up Bar' },
  { value: 'dip station', label: 'Dip Station' },
  { value: 'bench', label: 'Bench' },
  { value: 'box', label: 'Box / Step' },
  { value: 'battle rope', label: 'Battle Rope' },
  { value: 'landmine', label: 'Landmine' },
  { value: 'sled', label: 'Sled' },
]

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

export default function NewExercisePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [nameNl, setNameNl] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [targetMuscle, setTargetMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [category, setCategory] = useState('')
  const [coachTips, setCoachTips] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!name.trim() || !bodyPart || !targetMuscle || !equipment) {
      setToast({ type: 'error', message: 'Vul alle verplichte velden in' })
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          name_nl: nameNl.trim() || null,
          body_part: bodyPart,
          target_muscle: targetMuscle.trim(),
          equipment,
          category: category || null,
          coach_tips: coachTips.trim() || null,
          coach_notes: coachNotes.trim() || null,
          gif_url: gifUrl.trim() || null,
          video_url: videoUrl.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fout bij aanmaken')
      }

      setToast({ type: 'success', message: 'Oefening aangemaakt!' })
      setTimeout(() => {
        router.push('/coach/exercises')
      }, 1500)
    } catch (error) {
      console.error('Failed to create exercise:', error)
      setToast({ type: 'error', message: 'Fout bij aanmaken oefening' })
    } finally {
      setLoading(false)
    }
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

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="font-display text-[32px] font-semibold text-text-primary">
          Nieuwe oefening
        </h1>
        <p className="mt-2 text-[15px] text-client-text-secondary">
          Voeg een aangepaste oefening toe aan de bibliotheek
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 mb-12">
        {/* Name (English) */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            NAAM (Engels) *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. Barbell Bench Press"
            required
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Name (Dutch) */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            NEDERLANDSE NAAM
          </label>
          <input
            type="text"
            value={nameNl}
            onChange={(e) => setNameNl(e.target.value)}
            placeholder="bijv. Barbell Bankdrukken"
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Body Part */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            LICHAAMSDEEL *
          </label>
          <select
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            required
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Selecteer lichaamsdeel...</option>
            {BODY_PARTS.map((part) => (
              <option key={part.value} value={part.value}>
                {part.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target Muscle */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            DOELSPIER *
          </label>
          <input
            type="text"
            value={targetMuscle}
            onChange={(e) => setTargetMuscle(e.target.value)}
            placeholder="bijv. Pectoralis Major"
            required
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Equipment */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            APPARATUUR *
          </label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            required
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Selecteer apparatuur...</option>
            {EQUIPMENT.map((eq) => (
              <option key={eq.value} value={eq.value}>
                {eq.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
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
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            GIF URL (optioneel)
          </label>
          <input
            type="url"
            value={gifUrl}
            onChange={(e) => setGifUrl(e.target.value)}
            placeholder="https://example.com/exercise.gif"
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <p className="text-[13px] text-client-text-secondary mt-2">Voeg een animatie toe aan je oefening</p>
        </div>

        {/* Video URL */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            VIDEO URL (optioneel)
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... of directe video URL"
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <p className="text-[13px] text-client-text-secondary mt-2">YouTube, Vimeo of directe videolink voor uitleg bij de oefening</p>
        </div>

        {/* Coach Tips */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
          <label className="block text-[13px] font-semibold text-client-text-secondary mb-2">
            COACHING TIPS VOOR CLIËNTEN
          </label>
          <textarea
            value={coachTips}
            onChange={(e) => setCoachTips(e.target.value)}
            placeholder="Voeg tips en adviezen voor cliënten toe..."
            rows={5}
            className="w-full px-3 py-2 border border-client-border rounded-lg text-[15px] placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
          <p className="text-[13px] text-client-text-secondary mt-2">Zichtbaar voor cliënten</p>
        </div>

        {/* Coach Notes */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-4">
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

        {/* Submit Button */}
        <div className="flex gap-3">
          <Link href="/coach/exercises" className="flex-1">
            <button
              type="button"
              className="w-full px-6 py-3 bg-[#A6ADA7] border border-client-border rounded-2xl font-semibold text-[15px] text-text-primary hover:bg-client-surface-muted transition-colors"
            >
              Annuleren
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-2xl font-semibold text-[15px] hover:bg-accent-dark transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                Aanmaken...
              </>
            ) : (
              'Oefening aanmaken'
            )}
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  )
}
