'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, Loader2, Check } from 'lucide-react'

const DIET_TYPES = [
  { id: 'geen', label: 'Geen specifiek dieet', desc: 'Ik eet alles' },
  { id: 'vegetarisch', label: 'Vegetarisch', desc: 'Geen vlees of vis' },
  { id: 'veganistisch', label: 'Veganistisch', desc: 'Geen dierlijke producten' },
  { id: 'pescotarisch', label: 'Pescotarisch', desc: 'Wel vis, geen vlees' },
  { id: 'keto', label: 'Keto / Low-carb', desc: 'Weinig koolhydraten, veel vetten' },
  { id: 'paleo', label: 'Paleo', desc: 'Natuurlijke, onbewerkte voeding' },
  { id: 'halal', label: 'Halal', desc: 'Volgens islamitische richtlijnen' },
  { id: 'kosher', label: 'Kosher', desc: 'Volgens joodse richtlijnen' },
]

const ALLERGY_OPTIONS = [
  'Gluten', 'Lactose', 'Noten', 'Pinda', 'Schaaldieren',
  'Ei', 'Soja', 'Vis', 'Sesam', 'Selderij', 'Mosterd',
]

export default function DietPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dietType, setDietType] = useState('geen')
  const [allergies, setAllergies] = useState<string[]>([])
  const [otherRestrictions, setOtherRestrictions] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      const { data } = await supabase
        .from('intake_forms')
        .select('dietary_preferences, dietary_restrictions')
        .eq('client_id', user.id)
        .single()

      if (data) {
        setDietType(data.dietary_preferences || 'geen')
        // Parse restrictions: allergies are comma-separated, other text is separate
        if (data.dietary_restrictions) {
          const parts = data.dietary_restrictions.split('|')
          const allergyPart = parts[0] || ''
          const otherPart = parts[1] || ''
          setAllergies(allergyPart.split(',').map((a: string) => a.trim()).filter(Boolean))
          setOtherRestrictions(otherPart.trim())
        }
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const toggleAllergy = (allergy: string) => {
    setAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const restrictions = [
      allergies.join(', '),
      otherRestrictions.trim()
    ].filter(Boolean).join(' | ')

    await supabase
      .from('intake_forms')
      .upsert({
        client_id: user.id,
        dietary_preferences: dietType,
        dietary_restrictions: restrictions || null,
        completed: true,
      }, { onConflict: 'client_id' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#FDFDFE]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#FDFDFE]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-editorial-h2 text-[#FDFDFE]">
          Voedingsvoorkeuren
        </h1>
      </div>

      {/* Diet Type */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(253,253,254,0.55)] uppercase tracking-wide px-1 mb-2">Dieettype</p>
        <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] divide-y divide-[rgba(253,253,254,0.08)]">
          {DIET_TYPES.map((diet) => (
            <button
              key={diet.id}
              onClick={() => setDietType(diet.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
            >
              <div>
                <p className="text-[15px] text-[#FDFDFE] text-left">{diet.label}</p>
                <p className="text-[13px] text-[rgba(253,253,254,0.55)] text-left">{diet.desc}</p>
              </div>
              {dietType === diet.id && (
                <div className="w-6 h-6 rounded-full bg-[#FDFDFE] flex items-center justify-center flex-shrink-0">
                  <Check strokeWidth={2.5} className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(253,253,254,0.55)] uppercase tracking-wide px-1 mb-2">Allergieën & intoleranties</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((allergy) => {
            const selected = allergies.includes(allergy)
            return (
              <button
                key={allergy}
                onClick={() => toggleAllergy(allergy)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  selected
                    ? 'bg-[#B55A4A] text-white'
                    : 'bg-[#A6ADA7] border border-[rgba(253,253,254,0.08)] text-[#FDFDFE] hover:border-[#B55A4A]'
                }`}
              >
                {allergy}
              </button>
            )
          })}
        </div>
      </div>

      {/* Other */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(253,253,254,0.55)] uppercase tracking-wide px-1 mb-2">Overige opmerkingen</p>
        <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] p-5">
          <textarea
            value={otherRestrictions}
            onChange={(e) => setOtherRestrictions(e.target.value)}
            placeholder="Bijv. ik eet niet graag aubergine, intermittent fasting, ..."
            rows={3}
            className="w-full text-[15px] text-[#FDFDFE] bg-transparent placeholder:text-[rgba(253,253,254,0.48)] focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-[#FDFDFE] text-white font-semibold text-[15px] hover:bg-[#7A5C12] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
