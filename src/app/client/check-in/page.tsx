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
        <div className="bg-white p-8 max-w-sm w-full text-center space-y-6 border border-[#E8E4DC]">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-[#E8F5E9] flex items-center justify-center animate-[scale-in_0.5s_ease-out]">
              <CheckCircle className="h-12 w-12 text-[#34C759]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-editorial-h2 font-display font-semibold text-[#1A1917]">Check-in ingediend!</h2>
            <p className="text-[#A09D96] text-sm leading-relaxed">
              Je coach bekijkt je resultaten binnen 24 uur. Je krijgt een melding zodra de review klaar is.
            </p>
          </div>
          <button
            onClick={() => router.push('/client')}
            className="w-full bg-[#1A1917] text-white py-3.5 font-medium uppercase tracking-wider transition-all duration-300 hover:bg-[#2A2A28]"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!canSubmit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div className="bg-white p-8 max-w-sm w-full text-center space-y-6 border border-[#E8E4DC]">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-[#FFF3E0] flex items-center justify-center">
              <Calendar className="h-10 w-10 text-[#FF9800]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-semibold text-[#1A1917]">Check-in</h2>
            <p className="text-[#A09D96] text-sm leading-relaxed">{windowMessage}</p>
          </div>
          <button
            onClick={() => router.push('/client')}
            className="w-full bg-[#1A1917] text-white py-3.5 font-medium uppercase tracking-wider transition-all duration-300 hover:bg-[#2A2A28]"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-editorial-h2 font-display font-semibold text-[#1A1917]">Maandelijkse check-in</h1>
        <p className="text-[#A09D96] mt-2">Stap {currentStep + 1} van {steps.length}</p>
      </div>

      {/* Progress Bar with Icons */}
      <div className="space-y-6">
        {/* Gradient progress bar */}
        <div className="relative h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B9D] via-[#FFC97F] to-[#FF6B9D] transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between items-center">
          {steps.map((step, i) => {
            const Icon = step.icon
            const isCompleted = i < currentStep
            const isCurrent = i === currentStep
            const isFuture = i > currentStep

            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#34C759]'
                      : isCurrent
                      ? 'bg-[#1A1A18]'
                      : 'bg-[#F0F0F0] border-2 border-[#E0E0E0]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white" strokeWidth={2} />
                  ) : (
                    <Icon
                      className={`w-5 h-5 ${
                        isCurrent ? 'text-white' : 'text-[#999]'
                      }`}
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                <span className={`text-xs font-medium text-center ${
                  isCurrent ? 'text-[#1A1A18]' : 'text-[#999]'
                }`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step Header with Icon and Description */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
            {(() => { const Icon = steps[currentStep].icon; return Icon ? <Icon className="w-7 h-7 text-[#1A1917]" strokeWidth={1.5} /> : null })()}
          </div>
          <div>
            <h2 className="text-editorial-h3 font-display font-semibold text-[#1A1917]">{steps[currentStep].title}</h2>
            <p className="text-[#A09D96] text-sm mt-1">{steps[currentStep].description}</p>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white p-6 transition-all duration-300 border border-[#E8E4DC]">
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
            className="flex-1 px-6 py-3.5 text-[#C5C2BC] font-medium uppercase tracking-wider hover:bg-[#F5F5F5] transition-all duration-300 border border-[#E8E4DC]"
          >
            Vorige
          </button>
        )}
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex-1 bg-[#1A1917] text-white py-3.5 font-medium uppercase tracking-wider transition-all duration-300 hover:bg-[#2A2A28]"
          >
            Volgende
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#1A1917] text-white py-3.5 font-medium uppercase tracking-wider transition-all duration-300 hover:bg-[#2A2A28] disabled:opacity-50"
          >
            {submitting ? 'Bezig met indienen...' : 'Check-in indienen'}
          </button>
        )}
      </div>
    </div>
  )
}
