'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { PhotoUploadStep } from '@/components/client/PhotoUploadStep'
import { TapeMeasurementsStep } from '@/components/client/TapeMeasurementsStep'
import { ChevronLeft, Check, Zap, Heart, Apple, Moon, Ruler, Trophy, Camera } from 'lucide-react'

const steps = [
  { id: 'welcome', title: 'Welkom bij MŌVE', description: 'Laten we je eerst wat beter leren kennen' },
  { id: 'goal', title: 'Hoofddoel', description: 'Wat wil je graag bereiken?' },
  { id: 'activity', title: 'Sportervaring', description: 'Vertel over je trainingsachtergrond' },
  { id: 'health', title: 'Gezondheid', description: 'Zijn er blessures of beperkingen?' },
  { id: 'nutrition', title: 'Voeding', description: 'Wat zijn je voedingsvoorkeuren?' },
  { id: 'lifestyle', title: 'Levensstijl', description: 'Slaap, stress en motivatie' },
  { id: 'measurements', title: 'Startmetingen', description: 'Basis gegevens voor je profiel' },
  { id: 'photos', title: "Startfoto's", description: "Leg je startpunt vast met foto's" },
  { id: 'tape', title: 'Omtrekmaten', description: 'Meet je lichaamsmaten op' },
  { id: 'complete', title: 'Klaar!', description: 'Je profiel is aangemaakt' },
]

const TOTAL_STEPS = steps.length // 10

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animatingOut, setAnimatingOut] = useState(false)

  const [data, setData] = useState({
    primary_goal: '',
    secondary_goals: [] as string[],
    training_experience: '',
    injuries_limitations: '',
    current_activity_level: '',
    preferred_training_days: [] as string[],
    dietary_preferences: '',
    dietary_restrictions: '',
    sleep_hours_avg: '',
    stress_level: 5,
    motivation_statement: '',
    weight_kg: '',
    height_cm: '',
    age: '',
  })

  const [photos, setPhotos] = useState<{
    front: File | null; back: File | null; left: File | null; right: File | null
  }>({ front: null, back: null, left: null, right: null })

  const [tapeMeasurements, setTapeMeasurements] = useState<Record<string, string>>({
    chest_cm: '', waist_cm: '', hips_cm: '',
    left_arm_cm: '', right_arm_cm: '',
    left_thigh_cm: '', right_thigh_cm: '',
    left_calf_cm: '', right_calf_cm: '',
  })

  const days = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
  const daysFull = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
  const goals = ['Afvallen', 'Spiermassa opbouwen', 'Fitter worden', 'Stressvermindering', 'Flexibiliteit', 'Sportprestatie']
  const activityLevels = ['Sedentair', 'Licht actief', 'Matig actief', 'Zeer actief']

  const handleStepChange = (newStep: number) => {
    setAnimatingOut(true)
    setTimeout(() => {
      setStep(newStep)
      setError(null)
      setAnimatingOut(false)
    }, 300)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Gebruiker niet aangemeld')
        setSubmitting(false)
        return
      }

      const parseNum = (v: string) => v ? parseFloat(v.replace(',', '.')) : null

      // Upload photos to storage
      const photoUrls: Record<string, string | null> = { front: null, back: null, left: null, right: null }
      for (const [position, file] of Object.entries(photos)) {
        if (file) {
          const fileName = `${user.id}/onboarding_${position}.jpg`
          const { error: uploadError } = await supabase.storage
            .from('checkin-photos')
            .upload(fileName, file, { upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('checkin-photos')
              .getPublicUrl(fileName)
            photoUrls[position] = urlData.publicUrl
          }
        }
      }

      // Save intake form with all data including measurements and photos
      const { error: insertError } = await supabase.from('intake_forms').insert({
        client_id: user.id,
        primary_goal: data.primary_goal,
        secondary_goals: data.secondary_goals,
        training_experience: data.training_experience,
        injuries_limitations: data.injuries_limitations,
        current_activity_level: data.current_activity_level,
        preferred_training_days: data.preferred_training_days,
        dietary_preferences: data.dietary_preferences,
        dietary_restrictions: data.dietary_restrictions,
        sleep_hours_avg: data.sleep_hours_avg ? parseFloat(data.sleep_hours_avg) : null,
        stress_level: data.stress_level,
        motivation_statement: data.motivation_statement,
        weight_kg: parseNum(data.weight_kg),
        height_cm: parseNum(data.height_cm),
        age: data.age ? parseInt(data.age) : null,
        // Photos
        photo_front_url: photoUrls.front,
        photo_back_url: photoUrls.back,
        photo_left_url: photoUrls.left,
        photo_right_url: photoUrls.right,
        // Tape measurements
        chest_cm: parseNum(tapeMeasurements.chest_cm),
        waist_cm: parseNum(tapeMeasurements.waist_cm),
        hips_cm: parseNum(tapeMeasurements.hips_cm),
        left_arm_cm: parseNum(tapeMeasurements.left_arm_cm),
        right_arm_cm: parseNum(tapeMeasurements.right_arm_cm),
        left_thigh_cm: parseNum(tapeMeasurements.left_thigh_cm),
        right_thigh_cm: parseNum(tapeMeasurements.right_thigh_cm),
        left_calf_cm: parseNum(tapeMeasurements.left_calf_cm),
        right_calf_cm: parseNum(tapeMeasurements.right_calf_cm),
        completed: true,
      })

      if (insertError) {
        setError('Fout bij het opslaan: ' + insertError.message)
        setSubmitting(false)
        return
      }

      // Also create initial health_metrics entry for weight tracking
      if (data.weight_kg) {
        await supabase.from('health_metrics').insert({
          client_id: user.id,
          metric_type: 'weight',
          value: parseNum(data.weight_kg),
          measured_at: new Date().toISOString(),
        }).then(() => {}) // ignore errors
      }

      // Mark intake as completed on profile
      await supabase.from('profiles').update({ intake_completed: true }).eq('id', user.id)

      // Move to success screen
      handleStepChange(TOTAL_STEPS - 1)
    } catch (err) {
      setError('Er is een onverwachte fout opgetreden')
      setSubmitting(false)
    }
  }

  const toggleDay = (day: string) => {
    setData(prev => ({
      ...prev,
      preferred_training_days: prev.preferred_training_days.includes(day)
        ? prev.preferred_training_days.filter(d => d !== day)
        : [...prev.preferred_training_days, day]
    }))
  }

  const toggleGoal = (goal: string) => {
    setData(prev => ({
      ...prev,
      secondary_goals: prev.secondary_goals.includes(goal)
        ? prev.secondary_goals.filter(g => g !== goal)
        : [...prev.secondary_goals, goal]
    }))
  }

  const progressPercent = ((step) / (TOTAL_STEPS - 1)) * 100
  const lastFormStep = TOTAL_STEPS - 2 // step 8 = tape measurements (last before complete)

  return (
    <div className="client-app min-h-screen bg-client-bg flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-client-border/50 w-full">
        <div
          className="h-full bg-gradient-to-r from-accent via-accent-dark to-accent transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <div className={`w-full max-w-md transition-all duration-300 ${animatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <div className="h-16 w-16 bg-gradient-to-br from-accent/20 to-accent-dark/20 rounded-3xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-accent-dark" strokeWidth={1.5} />
                </div>
                <h1 className="text-4xl font-display font-semibold text-black">Welkom bij MŌVE</h1>
                <p className="text-client-text-secondary leading-relaxed">
                  Jouw persoonlijke fitness- en wellness partner. Deze korte intake helpt ons jouw perfecte trainingsprogramma samen te stellen.
                </p>
              </div>

              <div className="space-y-3 pt-6">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent-dark flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span className="text-sm text-client-text-secondary">Gepersonaliseerde trainingsplannen</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent-dark flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span className="text-sm text-client-text-secondary">Voedings- en lifestyle begeleiding</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent-dark flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span className="text-sm text-client-text-secondary">Voortgangsmonitoring en aanpassingen</span>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-xs text-client-text-muted text-center mb-6">Stap 1 van {TOTAL_STEPS} — Ongeveer 8 minuten</p>
                <Button onClick={() => handleStepChange(1)} fullWidth size="lg" className="bg-[#1A1A18] text-white hover:bg-[#333330]">
                  Laten we beginnen
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Primary Goal */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 2 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Wat is je belangrijkste doel?</h2>
                <p className="text-sm text-client-text-secondary mt-1">Dit helpt ons jouw plan te personaliseren</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <textarea
                  value={data.primary_goal}
                  onChange={(e) => setData({ ...data, primary_goal: e.target.value })}
                  placeholder="Bijv. 5 kg afvallen en sterker worden"
                  rows={3}
                  className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-black mb-3">Secundaire doelen (optioneel)</p>
                <div className="flex flex-wrap gap-2">
                  {goals.map(goal => (
                    <button
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      className={`px-4 py-2.5 rounded-full text-sm transition-all ${
                        data.secondary_goals.includes(goal)
                          ? 'bg-accent text-white shadow-clean'
                          : 'bg-client-surface-muted text-client-text-secondary border border-client-border hover:border-client-border-strong'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Activity Level */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 3 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Sportervaring</h2>
                <p className="text-sm text-client-text-secondary mt-1">Vertel over je trainingsachtergrond</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Trainings- en sportachtergrond</label>
                  <input
                    type="text"
                    value={data.training_experience}
                    onChange={(e) => setData({ ...data, training_experience: e.target.value })}
                    placeholder="Bijv. 3 jaar krachttraining, voetbal in de jeugd"
                    className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-black mb-3">Huidig activiteitsniveau</p>
                  <div className="flex flex-wrap gap-2">
                    {activityLevels.map(level => (
                      <button
                        key={level}
                        onClick={() => setData({ ...data, current_activity_level: level })}
                        className={`px-4 py-2.5 rounded-full text-sm transition-all ${
                          data.current_activity_level === level
                            ? 'bg-accent text-white shadow-clean'
                            : 'bg-client-surface-muted text-client-text-secondary border border-client-border hover:border-client-border-strong'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-black mb-3">Voorkeursdagen voor training</p>
                  <div className="grid grid-cols-7 gap-2">
                    {daysFull.map((dayFull, idx) => (
                      <button
                        key={dayFull}
                        onClick={() => toggleDay(dayFull)}
                        className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                          data.preferred_training_days.includes(dayFull)
                            ? 'bg-accent text-white shadow-clean'
                            : 'bg-client-surface-muted text-client-text-secondary border border-client-border'
                        }`}
                      >
                        {days[idx]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Health */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 4 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Gezondheid</h2>
                <p className="text-sm text-client-text-secondary mt-1">Blessures en fysieke beperkingen</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-2">Blessures of beperkingen (optioneel)</label>
                <textarea
                  value={data.injuries_limitations}
                  onChange={(e) => setData({ ...data, injuries_limitations: e.target.value })}
                  placeholder="Bijv. oude knieblessure links, rugpijn bij lang zitten"
                  rows={4}
                  className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Nutrition */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 5 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Voeding</h2>
                <p className="text-sm text-client-text-secondary mt-1">Je voedings- en dieetvoorkeuren</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Voedingsvoorkeuren</label>
                  <input
                    type="text"
                    value={data.dietary_preferences}
                    onChange={(e) => setData({ ...data, dietary_preferences: e.target.value })}
                    placeholder="Bijv. mediterraan, high-protein, vegetarisch"
                    className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Allergiëen of restricties (optioneel)</label>
                  <input
                    type="text"
                    value={data.dietary_restrictions}
                    onChange={(e) => setData({ ...data, dietary_restrictions: e.target.value })}
                    placeholder="Bijv. lactose-intolerant, geen noten"
                    className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Lifestyle */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 6 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Levensstijl</h2>
                <p className="text-sm text-client-text-secondary mt-1">Slaap, stress en motivatie</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Gemiddelde slaap per nacht (uren)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={data.sleep_hours_avg}
                    onChange={(e) => setData({ ...data, sleep_hours_avg: e.target.value })}
                    placeholder="7"
                    className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-black mb-3">Stressniveau</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setData({ ...data, stress_level: n })}
                        className={`py-3 rounded-lg font-medium text-sm transition-all ${
                          data.stress_level === n
                            ? 'bg-accent text-white shadow-clean'
                            : 'bg-client-surface-muted text-client-text-secondary border border-client-border'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-client-text-muted mt-2">
                    <span>Laag</span>
                    <span>Hoog</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Wat motiveert je om te veranderen?</label>
                  <textarea
                    value={data.motivation_statement}
                    onChange={(e) => setData({ ...data, motivation_statement: e.target.value })}
                    placeholder="Waarom wil je nu actie ondernemen?"
                    rows={3}
                    className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Measurements (weight/height/age) */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 7 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Startmetingen</h2>
                <p className="text-sm text-client-text-secondary mt-1">Basis gegevens voor je profiel</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Gewicht (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={data.weight_kg}
                      onChange={(e) => setData({ ...data, weight_kg: e.target.value })}
                      placeholder="80"
                      className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Lengte (cm)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="1"
                      value={data.height_cm}
                      onChange={(e) => setData({ ...data, height_cm: e.target.value })}
                      placeholder="180"
                      className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Leeftijd (jaren)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={data.age}
                    onChange={(e) => setData({ ...data, age: e.target.value })}
                    placeholder="35"
                    className="w-full px-4 py-3 text-sm bg-client-surface-muted border border-client-border rounded-2xl text-black placeholder:text-client-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              <p className="text-xs text-client-text-muted">
                Deze metingen helpen ons om je voortgang te volgen en je plan aan te passen.
              </p>
            </div>
          )}

          {/* Step 7: Photos */}
          {step === 7 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 8 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Startfoto's</h2>
                <p className="text-sm text-client-text-secondary mt-1">
                  Leg je startpunt vast. Zo kunnen we je voortgang visueel bijhouden.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-client-border/50">
                <PhotoUploadStep photos={photos} onChange={setPhotos} />
              </div>

              <p className="text-xs text-client-text-muted">
                Tip: neem de foto's 's ochtends, nuchter, in dezelfde kleding en op dezelfde locatie als bij toekomstige check-ins.
              </p>
            </div>
          )}

          {/* Step 8: Tape Measurements */}
          {step === 8 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-xs text-client-text-secondary uppercase tracking-wide">Stap 9 van {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-body font-semibold text-black mt-2">Omtrekmaten</h2>
                <p className="text-sm text-client-text-secondary mt-1">
                  Meet je lichaamsmaten op met een meetlint. Dit is optioneel maar helpt enorm bij het tracken van je voortgang.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-client-border/50">
                <TapeMeasurementsStep
                  measurements={tapeMeasurements}
                  onChange={setTapeMeasurements}
                />
              </div>

              <p className="text-xs text-client-text-muted">
                Meet elk lichaamsdeel ontspannen en op het breedste punt. Gebruik een flexibel meetlint.
              </p>
            </div>
          )}

          {/* Step 9: Complete */}
          {step === (TOTAL_STEPS - 1) && (
            <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <div className="h-20 w-20 bg-gradient-to-br from-accent/20 to-accent-dark/20 rounded-3xl flex items-center justify-center mx-auto">
                  <Trophy className="w-10 h-10 text-accent-dark" strokeWidth={1.5} />
                </div>
                <h1 className="text-4xl font-display font-semibold text-black">Klaar!</h1>
                <p className="text-client-text-secondary leading-relaxed">
                  Je profiel is aangemaakt. Je trainer zal deze informatie gebruiken om het perfecte programma voor jou op te stellen.
                </p>
              </div>

              <div className="space-y-2 p-4 bg-client-surface-muted rounded-2xl border border-client-border/50">
                <p className="text-sm font-medium text-black">Volgende stappen:</p>
                <ul className="space-y-1 text-xs text-client-text-secondary">
                  <li>• Je trainer zal je binnen 24 uur een bericht sturen</li>
                  <li>• Je eerste training kan snel gepland worden</li>
                  <li>• Volg je voortgang op je dashboard</li>
                </ul>
              </div>

              <Button
                onClick={() => {
                  router.push('/client')
                  router.refresh()
                }}
                fullWidth
                size="lg"
                className="bg-[#1A1A18] text-white hover:bg-[#333330]"
              >
                Naar je dashboard
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-client-border bg-client-surface px-6 py-4 sm:py-5 safe-area-bottom">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 0 && step < (TOTAL_STEPS - 1) && (
            <button
              onClick={() => handleStepChange(step - 1)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-client-text-secondary hover:text-black hover:bg-client-surface-muted rounded-2xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              Terug
            </button>
          )}

          {step < lastFormStep && (
            <Button
              onClick={() => {
                if (step === 0 || (step === 1 && data.primary_goal) || (step > 1 && step < lastFormStep)) {
                  handleStepChange(step + 1)
                }
              }}
              fullWidth
              className="bg-[#1A1A18] text-white hover:bg-[#333330]"
            >
              Volgende
            </Button>
          )}

          {step === lastFormStep && (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              fullWidth
              className="bg-[#1A1A18] text-white hover:bg-[#333330]"
            >
              Afronden
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
