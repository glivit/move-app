'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PhotoUploadStep } from '@/components/client/PhotoUploadStep'
import { MetricsInputStep } from '@/components/client/MetricsInputStep'
import { TapeMeasurementsStep } from '@/components/client/TapeMeasurementsStep'
import { NotesStep } from '@/components/client/NotesStep'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CheckCircle, Camera, Scale, Ruler, Heart, Calendar } from 'lucide-react'

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

const steps = [
  { title: "Foto's", description: '4 posities vastleggen', icon: Camera },
  { title: 'InBody metingen', description: 'Lichaamssamenstelling', icon: Scale },
  { title: 'Omtrekmaten', description: 'Meetlint metingen', icon: Ruler },
  { title: 'Hoe voel je je?', description: 'Optionele notities', icon: Heart },
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

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div className="card-v2 p-8 max-w-sm w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[rgba(61,139,92,0.08)] flex items-center justify-center animate-scale-in">
              <CheckCircle className="h-10 w-10 text-[#3D8B5C]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h2
              className="text-[28px] leading-[1.15] tracking-[-0.02em] text-[#1A1917]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Check-in ingediend
            </h2>
            <p className="text-[14px] text-[#6B6862] leading-relaxed">
              Je coach bekijkt je resultaten binnen 24 uur.
            </p>
          </div>
          <button onClick={() => router.push('/client')} className="btn-pop w-full py-4 text-[13px]">
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!canSubmit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div className="card-v2 p-8 max-w-sm w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[rgba(196,125,21,0.08)] flex items-center justify-center">
              <Calendar className="h-10 w-10 text-[#C47D15]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h2
              className="text-[28px] leading-[1.15] tracking-[-0.02em] text-[#1A1917]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Check-in
            </h2>
            <p className="text-[14px] text-[#6B6862] leading-relaxed">{windowMessage}</p>
          </div>
          <button onClick={() => router.push('/client')} className="btn-primary w-full py-4 text-[13px]">
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header — Cormorant serif */}
      <div className="animate-fade-in">
        <p className="text-label mb-3">Stap {currentStep + 1} van {steps.length}</p>
        <h1
          className="text-[32px] leading-[1.12] tracking-[-0.025em] text-[#1A1917]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          {steps[currentStep].title}
        </h1>
        <p className="text-[14px] text-[#6B6862] mt-1">{steps[currentStep].description}</p>
      </div>

      {/* Progress bar — clean thin bar */}
      <div className="w-full h-[3px] bg-[#E5E1D9] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D46A3A] rounded-full transition-all duration-500 animate-progress-fill"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-3">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i < currentStep
                ? 'bg-[#3D8B5C]'
                : i === currentStep
                  ? 'bg-[#D46A3A] scale-125'
                  : 'bg-[#E5E1D9]'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-[rgba(196,55,42,0.06)] border border-[rgba(196,55,42,0.1)] rounded-xl px-4 py-3">
          <p className="text-[13px] text-[#C4372A]">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="card-v2 p-6 transition-all duration-300 animate-slide-up">
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
      <div className="flex gap-3">
        {currentStep > 0 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex-1 px-6 py-4 text-[#6B6862] font-semibold text-[13px] uppercase tracking-[0.06em] border border-[#E8E4DC] rounded-2xl hover:border-[#CCC7BC] transition-all"
          >
            Vorige
          </button>
        )}
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex-1 btn-pop py-4 text-[13px]"
          >
            Volgende
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 btn-pop py-4 text-[13px] disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : 'Check-in indienen'}
          </button>
        )}
      </div>
    </div>
  )
}
