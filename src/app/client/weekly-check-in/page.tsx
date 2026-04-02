'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SubPageHeader } from '@/components/layout/SubPageHeader'
import { Camera, Scale, CheckCircle2, Loader2, ChevronRight } from 'lucide-react'

const RATING_LABELS: Record<string, string[]> = {
  energy: ['Zeer laag', 'Laag', 'Oké', 'Goed', 'Top'],
  sleep: ['Slecht', 'Matig', 'Oké', 'Goed', 'Uitstekend'],
  nutrition: ['Niet gevolgd', 'Weinig', 'Gemiddeld', 'Goed', 'Perfect'],
}

export default function WeeklyCheckInPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [lastWeight, setLastWeight] = useState<number | null>(null)

  // Form state
  const [weight, setWeight] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [energy, setEnergy] = useState(0)
  const [sleep, setSleep] = useState(0)
  const [nutritionRating, setNutritionRating] = useState(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/weekly-check-in')
        const data = await res.json()
        if (data.alreadySubmitted) setAlreadyDone(true)
        if (data.lastWeight) setLastWeight(data.lastWeight)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!weight.trim()) return
    setSubmitting(true)

    try {
      let photoUrl: string | null = null

      // Upload photo if selected
      if (photo) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const fileName = `${user.id}/weekly_${Date.now()}.jpg`
          const { error } = await supabase.storage
            .from('checkin-photos')
            .upload(fileName, photo, { upsert: true })
          if (!error) {
            const { data: urlData } = supabase.storage
              .from('checkin-photos')
              .getPublicUrl(fileName)
            photoUrl = urlData.publicUrl
          }
        }
      }

      const res = await fetch('/api/weekly-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: weight,
          photo_url: photoUrl,
          energy_level: energy || null,
          sleep_quality: sleep || null,
          nutrition_adherence: nutritionRating || null,
          notes: notes.trim() || null,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      }
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SubPageHeader overline="Wekelijks" title="Check-in" backHref="/client" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-[1.5px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Already submitted this week
  if (alreadyDone || submitted) {
    return (
      <div className="space-y-6">
        <SubPageHeader overline="Wekelijks" title="Check-in" backHref="/client" />
        <div className="bg-white p-8 border border-[#F0F0EE] text-center">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#34C759] mx-auto mb-3" />
          <p className="font-semibold text-[#1A1917] text-lg">
            {submitted ? 'Check-in verstuurd!' : 'Al ingediend deze week'}
          </p>
          <p className="text-[14px] text-[#ACACAC] mt-2">
            {submitted
              ? 'Goed bezig! Je coach kan je voortgang bekijken.'
              : 'Je hebt deze week al een check-in gedaan. Volgende week weer!'}
          </p>
        </div>
      </div>
    )
  }

  const weightNum = parseFloat(weight.replace(',', '.'))
  const weightDiff = lastWeight && weightNum ? +(weightNum - lastWeight).toFixed(1) : null

  return (
    <div className="space-y-6 pb-28">
      <SubPageHeader overline="Wekelijks" title="Check-in" backHref="/client" />

      {/* ─── GEWICHT ─────────────────────────────────────── */}
      <div className="bg-white border border-[#F0F0EE] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} strokeWidth={1.5} className="text-[#1A1917]" />
          <span className="text-[13px] font-semibold text-[#1A1917] uppercase tracking-[0.06em]">Gewicht</span>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.0"
              className="w-full text-[32px] font-bold text-[#1A1917] bg-transparent border-b-2 border-[#F0F0EE] focus:border-[#1A1917] outline-none pb-1 transition-colors placeholder-[#D5D5D5]"
            />
          </div>
          <span className="text-[16px] text-[#ACACAC] font-medium pb-2">kg</span>
        </div>

        {lastWeight && (
          <p className="text-[13px] text-[#ACACAC] mt-2">
            Vorige: {lastWeight} kg
            {weightDiff !== null && weightDiff !== 0 && (
              <span className={`ml-2 font-semibold ${weightDiff < 0 ? 'text-[#3D8B5C]' : 'text-[#C47D15]'}`}>
                {weightDiff > 0 ? '+' : ''}{weightDiff} kg
              </span>
            )}
          </p>
        )}
      </div>

      {/* ─── FOTO ────────────────────────────────────────── */}
      <div className="bg-white border border-[#F0F0EE] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera size={18} strokeWidth={1.5} className="text-[#1A1917]" />
          <span className="text-[13px] font-semibold text-[#1A1917] uppercase tracking-[0.06em]">Foto vooraanzicht</span>
          <span className="text-[11px] text-[#ACACAC] ml-auto">optioneel</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />

        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="Preview" className="w-full max-h-[300px] object-cover border border-[#F0F0EE]" />
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null) }}
              className="absolute top-2 right-2 w-8 h-8 bg-[#1A1917]/70 text-white flex items-center justify-center text-[14px]"
            >
              &times;
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-[#F0F0EE] hover:border-[#C0C0C0] transition-colors flex flex-col items-center gap-2"
          >
            <Camera size={24} strokeWidth={1.5} className="text-[#ACACAC]" />
            <span className="text-[13px] text-[#ACACAC]">Tik om foto te nemen</span>
          </button>
        )}
      </div>

      {/* ─── HOE GAAT HET ────────────────────────────────── */}
      <div className="bg-white border border-[#F0F0EE] p-5 space-y-6">
        <span className="text-[13px] font-semibold text-[#1A1917] uppercase tracking-[0.06em]">
          Hoe was je week?
        </span>

        {/* Energy */}
        <RatingRow
          label="Energieniveau"
          value={energy}
          onChange={setEnergy}
          labels={RATING_LABELS.energy}
        />

        {/* Sleep */}
        <RatingRow
          label="Slaapkwaliteit"
          value={sleep}
          onChange={setSleep}
          labels={RATING_LABELS.sleep}
        />

        {/* Nutrition adherence */}
        <RatingRow
          label="Voeding gevolgd"
          value={nutritionRating}
          onChange={setNutritionRating}
          labels={RATING_LABELS.nutrition}
        />
      </div>

      {/* ─── NOTITIES ────────────────────────────────────── */}
      <div className="bg-white border border-[#F0F0EE] p-5">
        <label className="block text-[13px] font-semibold text-[#1A1917] uppercase tracking-[0.06em] mb-3">
          Iets te melden?
          <span className="text-[11px] text-[#ACACAC] ml-2 normal-case tracking-normal font-normal">optioneel</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hoe voel je je? Pijnklachten? Vragen voor je coach?"
          rows={3}
          className="w-full px-3 py-2.5 bg-[#F8F8F6] border border-[#F0F0EE] text-[14px] placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none"
        />
      </div>

      {/* ─── SUBMIT ──────────────────────────────────────── */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !weight.trim()}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1A1917] text-white font-semibold uppercase tracking-wider text-[15px] hover:bg-[#2A2A28] transition-colors disabled:opacity-40"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Versturen...
          </>
        ) : (
          <>
            Check-in versturen
            <ChevronRight size={18} strokeWidth={2} />
          </>
        )}
      </button>
    </div>
  )
}

// ─── Rating Row Component ─────────────────────────────────

function RatingRow({ label, value, onChange, labels }: {
  label: string
  value: number
  onChange: (v: number) => void
  labels: string[]
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[14px] text-[#1A1917]">{label}</span>
        {value > 0 && (
          <span className="text-[12px] text-[#ACACAC]">{labels[value - 1]}</span>
        )}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n === value ? 0 : n)}
            className={`flex-1 py-2.5 text-[14px] font-semibold transition-all ${
              n <= value
                ? 'bg-[#1A1917] text-white'
                : 'bg-[#F8F8F6] text-[#ACACAC] hover:bg-[#F0F0EE]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
