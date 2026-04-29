'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, Loader2, Check, AlertTriangle } from 'lucide-react'

const BODY_PARTS = [
  { id: 'schouder', label: 'Schouder' },
  { id: 'nek', label: 'Nek' },
  { id: 'bovenrug', label: 'Bovenrug' },
  { id: 'onderrug', label: 'Onderrug' },
  { id: 'knie', label: 'Knie' },
  { id: 'heup', label: 'Heup' },
  { id: 'enkel', label: 'Enkel' },
  { id: 'pols', label: 'Pols' },
  { id: 'elleboog', label: 'Elleboog' },
  { id: 'hamstring', label: 'Hamstring' },
  { id: 'quadriceps', label: 'Quadriceps' },
  { id: 'borst', label: 'Borst' },
]

const LIMITATION_TYPES = [
  'Hernia',
  'Artrose',
  'Tendinitis',
  'Scoliose',
  'Hoge bloeddruk',
  'Astma',
  'Diabetes',
  'Hartaandoening',
  'Zwangerschap',
  'Revalidatie na operatie',
]

export default function HealthPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [injuredParts, setInjuredParts] = useState<string[]>([])
  const [limitations, setLimitations] = useState<string[]>([])
  const [details, setDetails] = useState('')
  const [activityLevel, setActivityLevel] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      const { data } = await supabase
        .from('intake_forms')
        .select('injuries_limitations, current_activity_level')
        .eq('client_id', user.id)
        .single()

      if (data) {
        setActivityLevel(data.current_activity_level)
        if (data.injuries_limitations) {
          // Parse stored format: "parts:schouder,knie|limits:Hernia|details:extra info"
          const sections = data.injuries_limitations.split('|')
          for (const section of sections) {
            if (section.startsWith('parts:')) {
              setInjuredParts(section.replace('parts:', '').split(',').filter(Boolean))
            } else if (section.startsWith('limits:')) {
              setLimitations(section.replace('limits:', '').split(',').filter(Boolean))
            } else if (section.startsWith('details:')) {
              setDetails(section.replace('details:', ''))
            } else {
              // Legacy format: just plain text
              setDetails(data.injuries_limitations)
            }
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const togglePart = (part: string) => {
    setInjuredParts(prev =>
      prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]
    )
  }

  const toggleLimitation = (limit: string) => {
    setLimitations(prev =>
      prev.includes(limit) ? prev.filter(l => l !== limit) : [...prev, limit]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const parts = injuredParts.length > 0 ? `parts:${injuredParts.join(',')}` : ''
    const limits = limitations.length > 0 ? `limits:${limitations.join(',')}` : ''
    const det = details.trim() ? `details:${details.trim()}` : ''
    const combined = [parts, limits, det].filter(Boolean).join('|') || null

    await supabase
      .from('intake_forms')
      .upsert({
        client_id: user.id,
        injuries_limitations: combined,
        current_activity_level: activityLevel,
        completed: true,
      }, { onConflict: 'client_id' })

    // Also update profiles.medical_notes
    const summary = [
      injuredParts.length > 0 ? `Blessures: ${injuredParts.join(', ')}` : '',
      limitations.length > 0 ? `Beperkingen: ${limitations.join(', ')}` : '',
      details.trim() || '',
    ].filter(Boolean).join('. ')

    await supabase
      .from('profiles')
      .update({ medical_notes: summary || null })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1C1E18]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#1C1E18]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-editorial-h2 text-[#1C1E18]">
          Blessures & beperkingen
        </h1>
      </div>

      {/* Info Banner */}
      <div className="bg-[#FFF3CD] rounded-2xl p-4 flex gap-3">
        <AlertTriangle strokeWidth={1.5} className="w-5 h-5 text-[#1C1E18] flex-shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#1C1E18]">
          Deze informatie helpt je coach om een veilig en aangepast trainingsprogramma op te stellen. Wees eerlijk en volledig.
        </p>
      </div>

      {/* Injured Body Parts */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(28,30,24,0.62)] uppercase tracking-wide px-1 mb-2">Pijnlijke of geblesseerde zones</p>
        <div className="flex flex-wrap gap-2">
          {BODY_PARTS.map((part) => {
            const selected = injuredParts.includes(part.id)
            return (
              <button
                key={part.id}
                onClick={() => togglePart(part.id)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  selected
                    ? 'bg-[#C0FC01] text-white'
                    : 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border border-[rgba(28,30,24,0.10)] text-[#1C1E18] hover:border-[#C0FC01]'
                }`}
              >
                {part.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Medical Limitations */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(28,30,24,0.62)] uppercase tracking-wide px-1 mb-2">Medische aandoeningen</p>
        <div className="flex flex-wrap gap-2">
          {LIMITATION_TYPES.map((limit) => {
            const selected = limitations.includes(limit)
            return (
              <button
                key={limit}
                onClick={() => toggleLimitation(limit)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  selected
                    ? 'bg-[#B55A4A] text-white'
                    : 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border border-[rgba(28,30,24,0.10)] text-[#1C1E18] hover:border-[#B55A4A]'
                }`}
              >
                {limit}
              </button>
            )
          })}
        </div>
      </div>

      {/* Activity Level */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(28,30,24,0.62)] uppercase tracking-wide px-1 mb-2">Huidig activiteitsniveau</p>
        <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.10)] divide-y divide-[rgba(28,30,24,0.10)]">
          {[
            { id: 'sedentair', label: 'Sedentair', desc: 'Weinig tot geen beweging' },
            { id: 'licht', label: 'Licht actief', desc: '1-2 keer per week' },
            { id: 'matig', label: 'Matig actief', desc: '3-4 keer per week' },
            { id: 'actief', label: 'Zeer actief', desc: '5+ keer per week' },
            { id: 'atleet', label: 'Atleet', desc: 'Dagelijkse intensieve training' },
          ].map((level) => (
            <button
              key={level.id}
              onClick={() => setActivityLevel(level.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
            >
              <div>
                <p className="text-[15px] text-[#1C1E18] text-left">{level.label}</p>
                <p className="text-[13px] text-[rgba(28,30,24,0.62)] text-left">{level.desc}</p>
              </div>
              {activityLevel === level.id && (
                <div className="w-6 h-6 rounded-full bg-[#FDFDFE] flex items-center justify-center flex-shrink-0">
                  <Check strokeWidth={2.5} className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(28,30,24,0.62)] uppercase tracking-wide px-1 mb-2">Extra details</p>
        <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.10)] p-5">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Beschrijf eventuele blessures, operaties, of andere relevante gezondheidsinformatie..."
            rows={4}
            className="w-full text-[15px] text-[#1C1E18] bg-transparent placeholder:text-[rgba(28,30,24,0.60)] focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-[#474B48] text-white font-semibold text-[15px] hover:bg-[#3A3E3B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : saved ? (
          <>
            <Check strokeWidth={2} className="w-5 h-5" />
            Opgeslagen
          </>
        ) : (
          'Opslaan'
        )}
      </button>
    </div>
  )
}
