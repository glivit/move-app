'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Camera, Scale, Ruler, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { SubPageHeader } from '@/components/layout/SubPageHeader'

// ─── Types ──────────────────────────────────────────────────

interface CheckInRecord {
  id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  visceral_fat_level: number | null
  body_water_pct: number | null
  bmi: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  left_calf_cm: number | null
  right_calf_cm: number | null
  photo_front_url: string | null
  photo_back_url: string | null
  photo_left_url: string | null
  photo_right_url: string | null
}

type Tab = 'fotos' | 'metingen' | 'omtrek'

// ─── Sparkline ──────────────────────────────────────────────

function MiniChart({ data, color, height = 60 }: { data: { date: string; value: number }[]; color: string; height?: number }) {
  if (data.length < 2) return <p className="text-[12px] text-[#C0C0C0]">Niet genoeg data</p>

  const width = 280
  const max = Math.max(...data.map(d => d.value))
  const min = Math.min(...data.map(d => d.value))
  const range = max - min || 1
  const padding = 2

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding
    const y = height - ((d.value - min) / range) * (height - padding * 2) - padding
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
    </svg>
  )
}

// ─── Metric Card ────────────────────────────────────────────

function MetricCard({ label, data, unit, color, invertDelta = false }: {
  label: string
  data: { date: string; value: number }[]
  unit: string
  color: string
  invertDelta?: boolean
}) {
  if (data.length === 0) return null
  const current = data[data.length - 1].value
  const previous = data.length > 1 ? data[data.length - 2].value : null
  const delta = previous !== null ? +(current - previous).toFixed(1) : null
  const deltaPositive = delta !== null ? (invertDelta ? delta < 0 : delta > 0) : null

  return (
    <div className="bg-white rounded-2xl border border-[#F0F0EE] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-label">{label}</p>
        {delta !== null && (
          <span className={`text-[12px] font-semibold ${deltaPositive ? 'text-[#3D8B5C]' : delta === 0 ? 'text-[#ACACAC]' : 'text-[#E85D4A]'}`}>
            {delta > 0 ? '+' : ''}{delta} {unit}
          </span>
        )}
      </div>
      <p className="text-[24px] font-bold text-[#1A1917] mb-3">
        {current} <span className="text-[14px] font-medium text-[#ACACAC]">{unit}</span>
      </p>
      <MiniChart data={data} color={color} />
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

export default function MeasurementsPage() {
  const router = useRouter()
  const [checkins, setCheckins] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('fotos')
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('checkins')
          .select('id, date, weight_kg, body_fat_pct, muscle_mass_kg, visceral_fat_level, body_water_pct, bmi, chest_cm, waist_cm, hips_cm, left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm, photo_front_url, photo_back_url, photo_left_url, photo_right_url')
          .eq('client_id', user.id)
          .order('date', { ascending: true })

        if (data) setCheckins(data as CheckInRecord[])
      } catch (err) {
        console.error('Measurements load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Extract data series
  const weightData = checkins.filter(c => c.weight_kg).map(c => ({ date: c.date, value: c.weight_kg! }))
  const bodyFatData = checkins.filter(c => c.body_fat_pct).map(c => ({ date: c.date, value: c.body_fat_pct! }))
  const muscleData = checkins.filter(c => c.muscle_mass_kg).map(c => ({ date: c.date, value: c.muscle_mass_kg! }))
  const waterData = checkins.filter(c => c.body_water_pct).map(c => ({ date: c.date, value: c.body_water_pct! }))
  const bmiData = checkins.filter(c => c.bmi).map(c => ({ date: c.date, value: c.bmi! }))

  const chestData = checkins.filter(c => c.chest_cm).map(c => ({ date: c.date, value: c.chest_cm! }))
  const waistData = checkins.filter(c => c.waist_cm).map(c => ({ date: c.date, value: c.waist_cm! }))
  const hipsData = checkins.filter(c => c.hips_cm).map(c => ({ date: c.date, value: c.hips_cm! }))
  const armLData = checkins.filter(c => c.left_arm_cm).map(c => ({ date: c.date, value: c.left_arm_cm! }))
  const armRData = checkins.filter(c => c.right_arm_cm).map(c => ({ date: c.date, value: c.right_arm_cm! }))
  const thighLData = checkins.filter(c => c.left_thigh_cm).map(c => ({ date: c.date, value: c.left_thigh_cm! }))
  const thighRData = checkins.filter(c => c.right_thigh_cm).map(c => ({ date: c.date, value: c.right_thigh_cm! }))
  const calfLData = checkins.filter(c => c.left_calf_cm).map(c => ({ date: c.date, value: c.left_calf_cm! }))
  const calfRData = checkins.filter(c => c.right_calf_cm).map(c => ({ date: c.date, value: c.right_calf_cm! }))

  // Photo check-ins
  const photosCheckins = checkins.filter(c => c.photo_front_url || c.photo_back_url || c.photo_left_url || c.photo_right_url)
  const selectedPhoto = photosCheckins[selectedPhotoIdx] || null

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'fotos', label: "Foto's", icon: Camera },
    { id: 'metingen', label: 'Metingen', icon: Scale },
    { id: 'omtrek', label: 'Omtrek', icon: Ruler },
  ]

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-24">

      <SubPageHeader
        overline="Lichamelijk"
        title="Metingen"
        backHref="/client/progress"
        action={
          <button
            onClick={() => router.push('/client/check-in')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1917] text-white text-[12px] font-semibold uppercase tracking-[0.08em] rounded-xl"
          >
            <Plus size={14} strokeWidth={2} />
            Meting
          </button>
        }
      />

      {/* ═══ TAB BAR ═════════════════════════════════════════ */}
      <div className="flex border-b border-[#F0F0EE] mb-6 animate-slide-up stagger-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold uppercase tracking-[0.06em] transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#1A1917] text-[#1A1917]'
                  : 'border-transparent text-[#C0C0C0] hover:text-[#ACACAC]'
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ═══ TAB: FOTO'S ═════════════════════════════════════ */}
      {activeTab === 'fotos' && (
        <div className="space-y-4 animate-slide-up stagger-3">
          {photosCheckins.length === 0 ? (
            <div className="text-center py-16">
              <Camera size={32} strokeWidth={1} className="text-[#D5D5D5] mx-auto mb-4" />
              <p className="text-[14px] text-[#ACACAC] mb-4">Nog geen progressiefoto's</p>
              <button
                onClick={() => router.push('/client/check-in')}
                className="px-6 py-3 bg-[#1A1917] text-white text-[13px] font-semibold uppercase tracking-[0.06em] rounded-xl"
              >
                Eerste meting starten
              </button>
            </div>
          ) : (
            <>
              {/* Date navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedPhotoIdx(Math.max(0, selectedPhotoIdx - 1))}
                  disabled={selectedPhotoIdx === 0}
                  className="w-10 h-10 flex items-center justify-center text-[#ACACAC] disabled:text-[#F0F0EE]"
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                <div className="text-center">
                  <p className="text-[16px] font-semibold text-[#1A1917]">
                    {selectedPhoto && new Date(selectedPhoto.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[12px] text-[#C0C0C0]">
                    {selectedPhotoIdx + 1} / {photosCheckins.length}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPhotoIdx(Math.min(photosCheckins.length - 1, selectedPhotoIdx + 1))}
                  disabled={selectedPhotoIdx === photosCheckins.length - 1}
                  className="w-10 h-10 flex items-center justify-center text-[#ACACAC] disabled:text-[#F0F0EE]"
                >
                  <ChevronRight size={20} strokeWidth={1.5} />
                </button>
              </div>

              {/* Photo grid */}
              {selectedPhoto && (
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { url: selectedPhoto.photo_front_url, label: 'Voor' },
                    { url: selectedPhoto.photo_back_url, label: 'Achter' },
                    { url: selectedPhoto.photo_left_url, label: 'Links' },
                    { url: selectedPhoto.photo_right_url, label: 'Rechts' },
                  ].map((photo, i) => (
                    <div key={i} className="aspect-[3/4] bg-[#F0F0EE] relative overflow-hidden">
                      {photo.url ? (
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera size={20} className="text-[#C0C0C0]" />
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white bg-black/40 px-2 py-0.5">
                        {photo.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline dots */}
              <div className="flex justify-center gap-2 mt-4">
                {photosCheckins.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPhotoIdx(i)}
                    className={`w-2 h-2 transition-all ${
                      i === selectedPhotoIdx ? 'bg-[#1A1917] scale-125' : 'bg-[#D5D5D5]'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: METINGEN (InBody) ══════════════════════════ */}
      {activeTab === 'metingen' && (
        <div className="space-y-3 animate-slide-up stagger-3">
          {weightData.length === 0 && bodyFatData.length === 0 ? (
            <div className="text-center py-16">
              <Scale size={32} strokeWidth={1} className="text-[#D5D5D5] mx-auto mb-4" />
              <p className="text-[14px] text-[#ACACAC] mb-4">Nog geen lichaamsmetingen</p>
              <button
                onClick={() => router.push('/client/check-in')}
                className="px-6 py-3 bg-[#1A1917] text-white text-[13px] font-semibold uppercase tracking-[0.06em] rounded-xl"
              >
                Eerste meting starten
              </button>
            </div>
          ) : (
            <>
              <MetricCard label="Gewicht" data={weightData} unit="kg" color="#1A1917" invertDelta={true} />
              <MetricCard label="Vetpercentage" data={bodyFatData} unit="%" color="#E85D4A" invertDelta={true} />
              <MetricCard label="Spiermassa" data={muscleData} unit="kg" color="#3D8B5C" />
              <MetricCard label="Lichaamsvocht" data={waterData} unit="%" color="#3068C4" />
              <MetricCard label="BMI" data={bmiData} unit="" color="#7B5EA7" invertDelta={true} />
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: OMTREK ═════════════════════════════════════ */}
      {activeTab === 'omtrek' && (
        <div className="space-y-3 animate-slide-up stagger-3">
          {chestData.length === 0 && waistData.length === 0 ? (
            <div className="text-center py-16">
              <Ruler size={32} strokeWidth={1} className="text-[#D5D5D5] mx-auto mb-4" />
              <p className="text-[14px] text-[#ACACAC] mb-4">Nog geen omtrekmetingen</p>
              <button
                onClick={() => router.push('/client/check-in')}
                className="px-6 py-3 bg-[#1A1917] text-white text-[13px] font-semibold uppercase tracking-[0.06em] rounded-xl"
              >
                Eerste meting starten
              </button>
            </div>
          ) : (
            <>
              <MetricCard label="Borst" data={chestData} unit="cm" color="#1A1917" />
              <MetricCard label="Taille" data={waistData} unit="cm" color="#E85D4A" invertDelta={true} />
              <MetricCard label="Heupen" data={hipsData} unit="cm" color="#C47D15" />

              {(armLData.length > 0 || armRData.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Arm links" data={armLData} unit="cm" color="#3D8B5C" />
                  <MetricCard label="Arm rechts" data={armRData} unit="cm" color="#3D8B5C" />
                </div>
              )}

              {(thighLData.length > 0 || thighRData.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Dij links" data={thighLData} unit="cm" color="#3068C4" />
                  <MetricCard label="Dij rechts" data={thighRData} unit="cm" color="#3068C4" />
                </div>
              )}

              {(calfLData.length > 0 || calfRData.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Kuit links" data={calfLData} unit="cm" color="#7B5EA7" />
                  <MetricCard label="Kuit rechts" data={calfRData} unit="cm" color="#7B5EA7" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
