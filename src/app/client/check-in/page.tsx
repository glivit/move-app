'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PhotoUploadStep } from '@/components/client/PhotoUploadStep'
import { MetricsInputStep } from '@/components/client/MetricsInputStep'
import { TapeMeasurementsStep } from '@/components/client/TapeMeasurementsStep'
import { NotesStep } from '@/components/client/NotesStep'
import { CheckCircle, Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface CheckInData {
  photos: {
    front: File | null
    back: File | null
    left: File | null
    right: File | null
  }
  metrics: {
    weight_kg: string
    body_fat_pct: string
    muscle_mass_kg: string
    visceral_fat_level: string
    body_water_pct: string
    bmi: string
  }
  measurements: Record<string, string>
  notes: string
  mood_score: number | null
  energy_score: number | null
  sleep_score: number | null
}

// v6 Orion — dark hero card
const DARK_CARD: React.CSSProperties = {
  background: '#474B48',
  borderRadius: 24,
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.18)',
}

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

const steps = [
  { title: "Foto's", description: '4 posities vastleggen' },
  { title: 'InBody metingen', description: 'Lichaamssamenstelling' },
  { title: 'Omtrekmaten', description: 'Meetlint metingen' },
  { title: 'Hoe voel je je', description: 'Optionele notities' },
]

export default function CheckInPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [canSubmit, setCanSubmit] = useState(true)
  const [windowMessage, setWindowMessage] = useState('')

  const [data, setData] = useState<CheckInData>({
    photos: { front: null, back: null, left: null, right: null },
    metrics: { weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', visceral_fat_level: '', body_water_pct: '', bmi: '' },
    measurements: { chest_cm: '', waist_cm: '', hips_cm: '', left_arm_cm: '', right_arm_cm: '', left_thigh_cm: '', right_thigh_cm: '', left_calf_cm: '', right_calf_cm: '' },
    notes: '',
    mood_score: null,
    energy_score: null,
    sleep_score: null,
  })

  // Check if within submission window
  useEffect(() => {
    async function checkWindow() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('start_date')
        .eq('id', user.id)
        .single()

      if (!profile?.start_date) {
        setCanSubmit(true)
        return
      }

      // Check if photos or measurements are still missing → always allow access
      const { data: latestCheckin } = await supabase
        .from('checkins')
        .select('id, photo_front_url, chest_cm')
        .eq('client_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      const missingPhotosOrMeasurements = !latestCheckin
        || !latestCheckin.photo_front_url
        || !latestCheckin.chest_cm

      if (missingPhotosOrMeasurements) {
        setCanSubmit(true)
        return
      }

      // Check if already submitted this month
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const { data: existing } = await supabase
        .from('checkins')
        .select('id')
        .eq('client_id', user.id)
        .gte('date', monthStart.toISOString())
        .limit(1)

      if (existing && existing.length > 0) {
        setCanSubmit(false)
        setWindowMessage('Je hebt deze maand al een check-in ingediend.')
        return
      }

      // Calculate check-in window (3 days around monthly anniversary)
      const startDate = new Date(profile.start_date)
      const checkinDay = startDate.getDate()
      const checkinDate = new Date(now.getFullYear(), now.getMonth(), checkinDay)
      const windowStart = new Date(checkinDate)
      windowStart.setDate(windowStart.getDate() - 1)
      const windowEnd = new Date(checkinDate)
      windowEnd.setDate(windowEnd.getDate() + 2)

      if (now < windowStart) {
        setCanSubmit(false)
        setWindowMessage(`Je check-in is beschikbaar vanaf ${windowStart.toLocaleDateString('nl-BE')}.`)
      } else if (now > windowEnd) {
        setCanSubmit(false)
        setWindowMessage(`De check-in deadline was ${windowEnd.toLocaleDateString('nl-BE')}.`)
      }
    }
    checkWindow()
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd')

      // Upload photos
      const photoUrls: Record<string, string | null> = { front: null, back: null, left: null, right: null }
      for (const [position, file] of Object.entries(data.photos)) {
        if (file) {
          const fileName = `${user.id}/${Date.now()}_${position}.jpg`
          const { error: uploadError } = await supabase.storage
            .from('checkin-photos')
            .upload(fileName, file)
          if (uploadError) throw uploadError

          const { data: urlData } = supabase.storage
            .from('checkin-photos')
            .getPublicUrl(fileName)
          photoUrls[position] = urlData.publicUrl
        }
      }

      // Parse numeric values
      const parseNum = (v: string) => v ? parseFloat(v.replace(',', '.')) : null
      const parseInt_ = (v: string) => v ? parseInt(v) : null

      // Save check-in
      const { error: insertError } = await supabase.from('checkins').insert({
        client_id: user.id,
        date: new Date().toISOString().split('T')[0],
        weight_kg: parseNum(data.metrics.weight_kg),
        body_fat_pct: parseNum(data.metrics.body_fat_pct),
        muscle_mass_kg: parseNum(data.metrics.muscle_mass_kg),
        visceral_fat_level: parseInt_(data.metrics.visceral_fat_level),
        body_water_pct: parseNum(data.metrics.body_water_pct),
        bmi: parseNum(data.metrics.bmi),
        chest_cm: parseNum(data.measurements.chest_cm),
        waist_cm: parseNum(data.measurements.waist_cm),
        hips_cm: parseNum(data.measurements.hips_cm),
        left_arm_cm: parseNum(data.measurements.left_arm_cm),
        right_arm_cm: parseNum(data.measurements.right_arm_cm),
        left_thigh_cm: parseNum(data.measurements.left_thigh_cm),
        right_thigh_cm: parseNum(data.measurements.right_thigh_cm),
        left_calf_cm: parseNum(data.measurements.left_calf_cm),
        right_calf_cm: parseNum(data.measurements.right_calf_cm),
        photo_front_url: photoUrls.front,
        photo_back_url: photoUrls.back,
        photo_left_url: photoUrls.left,
        photo_right_url: photoUrls.right,
        coach_notes: null,
      })

      if (insertError) throw insertError
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── SUBMITTED ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div
          className="p-8 max-w-sm w-full text-center space-y-5 animate-slide-up"
          style={LIGHT_CARD}
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[rgba(47,166,90,0.18)] flex items-center justify-center animate-scale-in">
              <CheckCircle className="h-10 w-10 text-[#2FA65A]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-[22px] font-semibold text-[#FDFDFE] tracking-tight">
              Check-in ingediend
            </h2>
            <p className="text-[14px] text-[rgba(253,253,254,0.55)] leading-relaxed">
              Je coach bekijkt je resultaten binnen 24 uur.
            </p>
          </div>
          <button
            onClick={() => router.push('/client')}
            className="w-full py-3.5 rounded-full bg-[#FDFDFE] text-[#2A2D2B] font-semibold text-[13px] uppercase tracking-[0.12em] hover:bg-[#F5F5F5] transition-colors"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  // ─── WINDOW-LOCKED ─────────────────────────────────────
  if (!canSubmit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div
          className="p-8 max-w-sm w-full text-center space-y-5 animate-slide-up"
          style={LIGHT_CARD}
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[rgba(253,253,254,0.12)] flex items-center justify-center">
              <Calendar className="h-10 w-10 text-[#FDFDFE]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-[22px] font-semibold text-[#FDFDFE] tracking-tight">
              Check-in
            </h2>
            <p className="text-[14px] text-[rgba(253,253,254,0.55)] leading-relaxed">
              {windowMessage}
            </p>
          </div>
          <button
            onClick={() => router.push('/client')}
            className="w-full py-3.5 rounded-full bg-[#FDFDFE] text-[#2A2D2B] font-semibold text-[13px] uppercase tracking-[0.12em] hover:bg-[#F5F5F5] transition-colors"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  // ─── WIZARD ─────────────────────────────────────────────
  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="space-y-6 pb-28">
      {/* Editorial hero — dark card with step title + progress */}
      <div className="p-6 animate-slide-up" style={DARK_CARD}>
        <div className="flex items-center justify-between mb-5">
          <span style={LABEL_STYLE}>Maandelijkse check-in</span>
          <span className="text-[11px] font-semibold text-[rgba(253,253,254,0.72)] tabular-nums">
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        <h1 className="text-[26px] leading-[1.1] font-semibold text-[#FDFDFE] tracking-tight">
          {step.title}
        </h1>
        <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-1.5">
          {step.description}
        </p>

        {/* Progress bar + dots */}
        <div className="mt-6 space-y-3">
          <div className="h-[2px] bg-[rgba(253,253,254,0.12)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FDFDFE] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => i <= currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
                className={`flex-1 text-left transition-colors ${
                  i > currentStep ? 'cursor-default' : 'cursor-pointer'
                }`}
                aria-label={`Ga naar stap ${i + 1}: ${s.title}`}
              >
                <p
                  className={`text-[9px] font-semibold uppercase tracking-[0.12em] truncate ${
                    i === currentStep
                      ? 'text-[#FDFDFE]'
                      : i < currentStep
                      ? 'text-[#2FA65A]'
                      : 'text-[rgba(253,253,254,0.28)]'
                  }`}
                >
                  {s.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-3 rounded-[14px]"
          style={{
            background: 'rgba(196,55,42,0.08)',
            border: '1px solid rgba(196,55,42,0.18)',
          }}
        >
          <p className="text-[13px] text-[#D98B7A]">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="animate-slide-up stagger-2">
        {currentStep === 0 && (
          <PhotoUploadStep
            photos={data.photos}
            onChange={(photos) => setData({ ...data, photos })}
          />
        )}
        {currentStep === 1 && (
          <MetricsInputStep
            metrics={data.metrics}
            onChange={(metrics) => setData({ ...data, metrics })}
          />
        )}
        {currentStep === 2 && (
          <TapeMeasurementsStep
            measurements={data.measurements}
            onChange={(measurements) => setData({ ...data, measurements })}
          />
        )}
        {currentStep === 3 && (
          <NotesStep
            notes={data.notes}
            moodScore={data.mood_score}
            energyScore={data.energy_score}
            sleepScore={data.sleep_score}
            onChange={(updates) => setData({ ...data, ...updates })}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {currentStep > 0 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-full border border-[rgba(253,253,254,0.18)] text-[rgba(253,253,254,0.72)] font-semibold text-[13px] uppercase tracking-[0.08em] hover:border-[rgba(253,253,254,0.48)] hover:text-[#FDFDFE] transition-colors"
            aria-label="Vorige stap"
          >
            <ChevronLeft size={16} strokeWidth={2} />
            Vorige
          </button>
        )}
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#FDFDFE] text-[#2A2D2B] font-semibold text-[13px] uppercase tracking-[0.12em] hover:bg-[#F5F5F5] transition-colors"
          >
            Volgende
            <ChevronRight size={16} strokeWidth={2.25} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#FDFDFE] text-[#2A2D2B] font-semibold text-[13px] uppercase tracking-[0.12em] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Versturen
              </>
            ) : (
              <>
                Check-in indienen
                <ChevronRight size={16} strokeWidth={2.25} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
