'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { SubPageHeader } from '@/components/layout/SubPageHeader'
import { Camera, Scale, CheckCircle2, Loader2, ChevronRight, X } from 'lucide-react'
import { invalidateCache } from '@/lib/fetcher'
import { optimisticMutate } from '@/lib/optimistic'
import { readDashboardCache, writeDashboardCache } from '@/lib/dashboard-cache'
import type { DashboardData } from '@/app/client/DashboardClient'

const RATING_LABELS: Record<string, string[]> = {
  energy: ['Zeer laag', 'Laag', 'Oké', 'Goed', 'Top'],
  sleep: ['Slecht', 'Matig', 'Oké', 'Goed', 'Uitstekend'],
  nutrition: ['Niet gevolgd', 'Weinig', 'Gemiddeld', 'Goed', 'Perfect'],
}

// v6 Orion — shared card treatment (light surface)
const LIGHT_CARD: React.CSSProperties = {
  background: '#A6ADA7',
  borderRadius: 24,
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'rgba(253,253,254,0.44)',
  fontWeight: 600,
}

export default function WeeklyCheckInPage() {
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

    // Snapshot dashboard-cache + userId vóór optimistic patch — nodig voor rollback.
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? null
    let cacheSnapshot: DashboardData | null = null
    if (userId) {
      const hit = await readDashboardCache<DashboardData>(userId).catch(() => null)
      cacheSnapshot = hit?.data ?? null
    }

    const weightNumeric = parseFloat(weight.replace(',', '.'))
    const todayStr = new Date().toISOString().split('T')[0]
    const hasPhoto = !!photo

    try {
      await optimisticMutate({
        key: 'weekly-check-in',
        apply: () => {
          // UI-voelt-instant: "Check-in verstuurd" verschijnt meteen.
          // Bij een grote foto-upload voorkomt dit dat de user 2-5s naar een
          // spinner kijkt — de server reconcilieert op de achtergrond.
          setSubmitted(true)
          if (userId && cacheSnapshot) {
            const nextData: DashboardData = {
              ...cacheSnapshot,
              weeklyCheckIn: {
                submitted: true,
                date: todayStr,
                weightKg: Number.isFinite(weightNumeric) ? weightNumeric : (cacheSnapshot.weeklyCheckIn?.weightKg ?? null),
              },
              actions: {
                ...cacheSnapshot.actions,
                // Check-in is nu gedaan; nudge op home verdwijnt.
                checkInDue: null,
              },
            }
            writeDashboardCache(userId, nextData).catch(() => {})
          }
        },
        rollback: () => {
          setSubmitted(false)
          if (userId && cacheSnapshot) {
            writeDashboardCache(userId, cacheSnapshot).catch(() => {})
          }
        },
        commit: async () => {
          let photoUrl: string | null = null

          // Upload photo if selected — failure throwen we NIET, we sturen
          // enkel de check-in zonder foto. Zo verlies je je review-data niet
          // door een hiccup in storage.
          if (hasPhoto && photo && user) {
            const fileName = `${user.id}/weekly_${Date.now()}.jpg`
            const { error: uploadErr } = await supabase.storage
              .from('checkin-photos')
              .upload(fileName, photo, { upsert: true })
            if (!uploadErr) {
              const { data: urlData } = supabase.storage
                .from('checkin-photos')
                .getPublicUrl(fileName)
              photoUrl = urlData.publicUrl
            } else {
              console.warn('[weekly-check-in] photo upload failed, continuing without:', uploadErr)
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

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `Check-in submit failed (${res.status})`)
          }
          return res
        },
        onSuccess: () => {
          invalidateCache('/api/dashboard')
        },
        onError: (err) => {
          console.error('[optimistic:weekly-check-in] commit failed:', err)
        },
      })
    } catch {
      // Rollback + error-log zijn al uitgevoerd door optimisticMutate.
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SubPageHeader overline="Wekelijks" title="Check-in" backHref="/client" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-[1.5px] border-[rgba(253,253,254,0.48)] border-t-[#FDFDFE] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ─── Already submitted / just submitted ──────────────────
  if (alreadyDone || submitted) {
    return (
      <div className="space-y-6">
        <SubPageHeader overline="Wekelijks" title="Check-in" backHref="/client" />
        <div className="p-8 text-center" style={LIGHT_CARD}>
          <div className="w-16 h-16 rounded-full bg-[rgba(47,166,90,0.18)] mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 size={32} strokeWidth={1.5} className="text-[#2FA65A]" />
          </div>
          <p className="font-semibold text-[#FDFDFE] text-[18px] tracking-tight">
            {submitted ? 'Check-in verstuurd' : 'Al ingediend deze week'}
          </p>
          <p className="text-[14px] text-[rgba(253,253,254,0.55)] mt-2 leading-relaxed">
            {submitted
              ? 'Goed bezig. Je coach kan je voortgang bekijken.'
              : 'Je hebt deze week al een check-in gedaan. Volgende week weer.'}
          </p>
        </div>
      </div>
    )
  }

  const weightNum = parseFloat(weight.replace(',', '.'))
  const weightDiff = lastWeight && weightNum ? +(weightNum - lastWeight).toFixed(1) : null

  return (
    <div className="space-y-5 pb-28">
      <div className="animate-slide-up">
        <SubPageHeader overline="Wekelijks" title="Check-in" backHref="/client" />
      </div>

      {/* ─── GEWICHT — hero card ─────────────────────────── */}
      <div className="p-6 animate-slide-up stagger-2" style={LIGHT_CARD}>
        <div className="flex items-center gap-2 mb-5">
          <Scale size={14} strokeWidth={1.75} className="text-[rgba(253,253,254,0.55)]" />
          <span style={LABEL_STYLE}>Gewicht</span>
        </div>

        <div className="flex items-baseline gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0.0"
            className="flex-1 min-w-0 text-[44px] leading-none font-semibold text-[#FDFDFE] bg-transparent outline-none tracking-tight placeholder-[rgba(253,253,254,0.28)]"
          />
          <span className="text-[16px] text-[rgba(253,253,254,0.55)] font-medium">kg</span>
        </div>

        <div className="mt-4 pt-3 border-t border-[rgba(253,253,254,0.12)]">
          {lastWeight ? (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[rgba(253,253,254,0.55)]">
                Vorige week · {lastWeight} kg
              </span>
              {weightDiff !== null && weightDiff !== 0 && (
                <span
                  className={`text-[12px] font-semibold tabular-nums ${
                    weightDiff < 0 ? 'text-[#2FA65A]' : 'text-[rgba(253,253,254,0.72)]'
                  }`}
                >
                  {weightDiff > 0 ? '+' : ''}{weightDiff} kg
                </span>
              )}
            </div>
          ) : (
            <span className="text-[12px] text-[rgba(253,253,254,0.44)]">
              Je eerste wekelijkse meting
            </span>
          )}
        </div>
      </div>

      {/* ─── FOTO ──────────────────────────────────────── */}
      <div className="p-5 animate-slide-up stagger-3" style={LIGHT_CARD}>
        <div className="flex items-center gap-2 mb-4">
          <Camera size={14} strokeWidth={1.75} className="text-[rgba(253,253,254,0.55)]" />
          <span style={LABEL_STYLE}>Foto vooraanzicht</span>
          <span className="ml-auto text-[10px] text-[rgba(253,253,254,0.44)] font-medium">Optioneel</span>
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
          <div className="relative overflow-hidden rounded-[18px]">
            <Image
              src={photoPreview}
              alt="Preview"
              width={400}
              height={300}
              className="w-full max-h-[320px] object-cover"
              unoptimized
              loading="lazy"
            />
            <button
              onClick={() => {
                setPhoto(null)
                setPhotoPreview(null)
              }}
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#474B48]/80 text-[#FDFDFE] flex items-center justify-center hover:bg-[#474B48] transition-colors"
              aria-label="Verwijder foto"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-10 rounded-[18px] border border-dashed border-[rgba(253,253,254,0.22)] hover:border-[rgba(253,253,254,0.48)] hover:bg-[rgba(253,253,254,0.04)] transition-all flex flex-col items-center gap-2.5"
          >
            <div className="w-11 h-11 rounded-full bg-[rgba(253,253,254,0.10)] flex items-center justify-center">
              <Camera size={18} strokeWidth={1.75} className="text-[rgba(253,253,254,0.72)]" />
            </div>
            <span className="text-[13px] text-[rgba(253,253,254,0.72)] font-medium">Tik om foto te nemen</span>
          </button>
        )}
      </div>

      {/* ─── HOE WAS JE WEEK ─────────────────────────────── */}
      <div className="p-6 space-y-6 animate-slide-up stagger-4" style={LIGHT_CARD}>
        <div className="flex items-center gap-2">
          <span style={LABEL_STYLE}>Hoe was je week</span>
        </div>

        <RatingRow
          label="Energieniveau"
          value={energy}
          onChange={setEnergy}
          labels={RATING_LABELS.energy}
        />

        <RatingRow
          label="Slaapkwaliteit"
          value={sleep}
          onChange={setSleep}
          labels={RATING_LABELS.sleep}
        />

        <RatingRow
          label="Voeding gevolgd"
          value={nutritionRating}
          onChange={setNutritionRating}
          labels={RATING_LABELS.nutrition}
        />
      </div>

      {/* ─── NOTITIES ────────────────────────────────────── */}
      <div className="p-5 animate-slide-up stagger-5" style={LIGHT_CARD}>
        <div className="flex items-center gap-2 mb-3">
          <span style={LABEL_STYLE}>Iets te melden</span>
          <span className="ml-auto text-[10px] text-[rgba(253,253,254,0.44)] font-medium">Optioneel</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hoe voel je je? Pijnklachten? Vragen voor je coach?"
          rows={3}
          className="w-full px-3.5 py-3 bg-[rgba(253,253,254,0.08)] rounded-[14px] text-[14px] text-[#FDFDFE] placeholder-[rgba(253,253,254,0.44)] focus:outline-none focus:bg-[rgba(253,253,254,0.12)] transition-colors resize-none"
        />
      </div>

      {/* ─── SUBMIT — ink pill ──────────────────────────── */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !weight.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[#FDFDFE] text-[#2A2D2B] font-semibold text-[14px] uppercase tracking-[0.12em] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed animate-slide-up stagger-6"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Versturen
          </>
        ) : (
          <>
            Check-in versturen
            <ChevronRight size={16} strokeWidth={2.25} />
          </>
        )}
      </button>
    </div>
  )
}

// ─── Rating Row Component — v6 segmented pill ─────────────

function RatingRow({
  label,
  value,
  onChange,
  labels,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  labels: string[]
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[14px] text-[#FDFDFE] font-medium">{label}</span>
        <span className="text-[11px] text-[rgba(253,253,254,0.55)] min-h-[16px]">
          {value > 0 ? labels[value - 1] : '—'}
        </span>
      </div>
      <div
        className="flex gap-1 p-1 rounded-full"
        style={{ background: 'rgba(253,253,254,0.08)' }}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value
          const current = n === value
          return (
            <button
              key={n}
              onClick={() => onChange(n === value ? 0 : n)}
              className={`flex-1 py-2 rounded-full text-[13px] font-semibold tabular-nums transition-all ${
                current
                  ? 'bg-[#FDFDFE] text-[#2A2D2B] shadow-sm'
                  : active
                  ? 'text-[#FDFDFE]'
                  : 'text-[rgba(253,253,254,0.44)]'
              }`}
              style={
                active && !current
                  ? { background: 'rgba(253,253,254,0.18)' }
                  : undefined
              }
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
