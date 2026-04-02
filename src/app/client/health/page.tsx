'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Heart, Footprints, Moon, Droplets, Activity, Brain,
  ChevronLeft, ChevronRight, Save, TrendingUp
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface HealthMetric {
  id?: string
  date: string
  steps?: number
  active_calories?: number
  resting_heart_rate?: number
  hrv_ms?: number
  sleep_hours?: number
  sleep_quality?: string
  stress_level?: number
  water_ml?: number
  weight_kg?: number
  notes?: string
  source?: string
}

const SLEEP_QUALITY_OPTIONS = [
  { value: 'poor', label: 'Slecht', emoji: '😴', color: '#C4372A' },
  { value: 'fair', label: 'Matig', emoji: '😐', color: '#C47D15' },
  { value: 'good', label: 'Goed', emoji: '😊', color: '#3D8B5C' },
  { value: 'excellent', label: 'Uitstekend', emoji: '🌟', color: '#3068C4' },
]

export default function HealthPage() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [todayData, setTodayData] = useState<HealthMetric>({
    date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const { data } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('client_id', user.id)
      .gte('date', cutoff.toISOString().split('T')[0])
      .order('date', { ascending: true })

    setMetrics(data || [])

    // Find today's data
    const today = new Date().toISOString().split('T')[0]
    const todayMetric = (data || []).find((m: any) => m.date === today)
    if (todayMetric) {
      setTodayData(todayMetric)
    }

    setLoading(false)
  }

  async function saveMetrics() {
    setSaving(true)
    try {
      const response = await fetch('/api/health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todayData),
      })

      if (response.ok) {
        setSaved(true)
        loadData()
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setTodayData((prev) => ({ ...prev, [field]: value }))
  }

  // Chart data for the last 7 days
  const chartData = useMemo(() => {
    const last7 = metrics.slice(-7)
    return last7.map((m) => ({
      date: new Date(m.date).toLocaleDateString('nl-NL', { weekday: 'short' }),
      slaap: m.sleep_hours || 0,
      stappen: m.steps ? Math.round(m.steps / 1000) : 0,
      water: m.water_ml ? Math.round(m.water_ml / 250) : 0,
    }))
  }, [metrics])

  // Weekly averages
  const weekAvg = useMemo(() => {
    const last7 = metrics.slice(-7).filter((m) => m.steps || m.sleep_hours || m.water_ml)
    if (last7.length === 0) return null
    return {
      steps: Math.round(last7.reduce((s, m) => s + (m.steps || 0), 0) / last7.length),
      sleep: (last7.reduce((s, m) => s + (m.sleep_hours || 0), 0) / last7.length).toFixed(1),
      water: Math.round(last7.reduce((s, m) => s + (m.water_ml || 0), 0) / last7.length),
    }
  }, [metrics])

  // Determine hero metric - priority: sleep_quality emoji, steps count, or default title
  const getHeroMetric = () => {
    if (todayData.sleep_quality) {
      const quality = SLEEP_QUALITY_OPTIONS.find((q) => q.value === todayData.sleep_quality)
      return { type: 'emoji', value: quality?.emoji, label: quality?.label }
    }
    if (todayData.steps) {
      return { type: 'steps', value: todayData.steps, label: 'Stappen' }
    }
    return { type: 'default', value: 'Gezondheid', label: '' }
  }

  const heroMetric = getHeroMetric()

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="page-title-sm">Gezondheid</h1></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-[#F0F0EE] rounded-2xl animate-shimmer" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <h1 className="page-title mb-6">Gezondheid</h1>
      <div className="animate-slide-up text-center">
        {heroMetric.type === 'emoji' && (
          <div className="p-8 bg-white rounded-2xl border border-[#F0F0EE]">
            <div className="text-8xl mb-3">{heroMetric.value}</div>
            <p className="text-[18px] font-semibold text-[#1A1917]">
              {heroMetric.label}
            </p>
            <p className="text-[13px] mt-1 text-[#ACACAC]">
              Slaapkwaliteit vandaag
            </p>
          </div>
        )}
        {heroMetric.type === 'steps' && (
          <div className="p-8 bg-white rounded-2xl border border-[#F0F0EE]">
            <p className="text-[14px] text-[#ACACAC]">Vandaag</p>
            <div className="text-7xl font-bold my-3 text-[#1A1917]">
              {(heroMetric.value as number / 1000).toFixed(1)}k
            </div>
            <p className="text-[16px] font-semibold text-[#C47D15]">
              {heroMetric.label}
            </p>
          </div>
        )}
        {heroMetric.type === 'default' && (
          <div className="p-8 bg-white rounded-2xl border border-[#F0F0EE]">
            <h1 className="text-6xl font-bold text-[#1A1917]">
              {heroMetric.value}
            </h1>
            <p className="text-[13px] mt-2 text-[#ACACAC]">
              Track je dagelijkse gezondheidsdata
            </p>
          </div>
        )}
      </div>

      {/* Weekly Averages */}
      {weekAvg && (
        <div className="grid grid-cols-3 gap-3">
          <div
            className="p-4 text-center bg-white rounded-2xl border border-[#F0F0EE] animate-slide-up hover:bg-[#FAFAF8] transition-colors stagger-2"
          >
            <Footprints size={18} strokeWidth={1.5} className="mx-auto mb-1 text-[#C47D15]" />
            <p className="text-[18px] font-bold text-[#1A1917]">
              {(weekAvg.steps / 1000).toFixed(1)}k
            </p>
            <p className="text-[11px] text-[#ACACAC]">Gem. stappen</p>
          </div>
          <div
            className="p-4 text-center bg-white rounded-2xl border border-[#F0F0EE] animate-slide-up hover:bg-[#FAFAF8] transition-colors stagger-3"
          >
            <Moon size={18} strokeWidth={1.5} className="mx-auto mb-1 text-[#7B5EA7]" />
            <p className="text-[18px] font-bold text-[#1A1917]">
              {weekAvg.sleep}u
            </p>
            <p className="text-[11px] text-[#ACACAC]">Gem. slaap</p>
          </div>
          <div
            className="p-4 text-center bg-white rounded-2xl border border-[#F0F0EE] animate-slide-up hover:bg-[#FAFAF8] transition-colors stagger-4"
          >
            <Droplets size={18} strokeWidth={1.5} className="mx-auto mb-1 text-[#3068C4]" />
            <p className="text-[18px] font-bold text-[#1A1917]">
              {(weekAvg.water / 1000).toFixed(1)}L
            </p>
            <p className="text-[11px] text-[#ACACAC]">Gem. water</p>
          </div>
        </div>
      )}

      {/* Mini Chart */}
      {chartData.length > 2 && (
        <div
          className="p-4 bg-white rounded-2xl border border-[#F0F0EE] animate-slide-up stagger-5"
        >
          <p className="text-[13px] font-semibold mb-3 text-[#1A1917]">
            Laatste 7 dagen
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7B5EA7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7B5EA7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#ACACAC' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="slaap" stroke="#7B5EA7" fill="url(#sleepGrad)" strokeWidth={2} name="Slaap (u)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's Input */}
      <div
        className="p-5 bg-white rounded-2xl border border-[#F0F0EE] animate-slide-up stagger-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#1A1917]">
            Vandaag
          </h2>
          <span className="text-[12px] text-[#ACACAC]">
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="space-y-4">
          {/* Steps */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-white border border-[#C47D15]/20 rounded-xl">
              <Footprints size={16} strokeWidth={1.5} className="text-[#C47D15]" />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#ACACAC]">Stappen</label>
              <input
                type="number"
                value={todayData.steps || ''}
                onChange={(e) => updateField('steps', parseInt(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none text-[#1A1917]"
              />
            </div>
          </div>

          {/* Sleep */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-white border border-[#7B5EA7]/20 rounded-xl">
              <Moon size={16} strokeWidth={1.5} className="text-[#7B5EA7]" />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#ACACAC]">Slaap (uren)</label>
              <input
                type="number"
                step="0.5"
                value={todayData.sleep_hours || ''}
                onChange={(e) => updateField('sleep_hours', parseFloat(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none text-[#1A1917]"
              />
            </div>
          </div>

          {/* Sleep quality */}
          <div>
            <label className="text-[12px] font-medium text-[#ACACAC]">Slaapkwaliteit</label>
            <div className="flex gap-2 mt-1.5">
              {SLEEP_QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateField('sleep_quality', todayData.sleep_quality === opt.value ? undefined : opt.value)}
                  className="flex-1 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] border rounded-xl transition-all hover:bg-[#FAFAF8]"
                  style={{
                    borderColor: todayData.sleep_quality === opt.value ? opt.color : '#F0F0EE',
                    backgroundColor: todayData.sleep_quality === opt.value ? `${opt.color}15` : 'white',
                    color: todayData.sleep_quality === opt.value ? opt.color : '#ACACAC',
                  }}
                >
                  <span className="text-lg block">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Water */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-white border border-[#3068C4]/20 rounded-xl">
              <Droplets size={16} strokeWidth={1.5} className="text-[#3068C4]" />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#ACACAC]">Water (ml)</label>
              <input
                type="number"
                step="250"
                value={todayData.water_ml || ''}
                onChange={(e) => updateField('water_ml', parseInt(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none text-[#1A1917]"
              />
            </div>
            {/* Quick add buttons */}
            <div className="flex gap-1">
              {[250, 500].map((ml) => (
                <button
                  key={ml}
                  onClick={() => updateField('water_ml', (todayData.water_ml || 0) + ml)}
                  className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] bg-white border border-[#3068C4]/20 text-[#3068C4] rounded-xl hover:bg-[#FAFAF8] transition-colors"
                >
                  +{ml}
                </button>
              ))}
            </div>
          </div>

          {/* Heart Rate */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-white border border-[#C4372A]/20 rounded-xl">
              <Heart size={16} strokeWidth={1.5} className="text-[#C4372A]" />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#ACACAC]">Rusthartslag (bpm)</label>
              <input
                type="number"
                value={todayData.resting_heart_rate || ''}
                onChange={(e) => updateField('resting_heart_rate', parseInt(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none text-[#1A1917]"
              />
            </div>
          </div>

          {/* Stress */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 flex items-center justify-center bg-white border border-[#C47D15]/20 rounded-xl">
                <Brain size={16} strokeWidth={1.5} className="text-[#C47D15]" />
              </div>
              <label className="text-[12px] font-medium text-[#ACACAC]">
                Stressniveau: {todayData.stress_level || '–'}/10
              </label>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={todayData.stress_level || 5}
              onChange={(e) => updateField('stress_level', parseInt(e.target.value))}
              className="w-full accent-[#C47D15]"
            />
            <div className="flex justify-between text-[10px] text-[#ACACAC]">
              <span>Ontspannen</span>
              <span>Gestrest</span>
            </div>
          </div>

          {/* Weight */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-white border border-[#3D8B5C]/20 rounded-xl">
              <Activity size={16} strokeWidth={1.5} className="text-[#3D8B5C]" />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#ACACAC]">Gewicht (kg)</label>
              <input
                type="number"
                step="0.1"
                value={todayData.weight_kg || ''}
                onChange={(e) => updateField('weight_kg', parseFloat(e.target.value) || undefined)}
                placeholder="0.0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none text-[#1A1917]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[12px] font-medium text-[#ACACAC]">Notities</label>
            <textarea
              value={todayData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              placeholder="Hoe voel je je vandaag?"
              className="w-full mt-1 p-3 border border-[#F0F0EE] rounded-xl text-[13px] resize-none focus:outline-none focus:border-[#1A1917] text-[#1A1917]"
            />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={saveMetrics}
          disabled={saving}
          className={`w-full mt-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-all disabled:opacity-50 border rounded-xl hover:bg-opacity-90 ${saved ? 'bg-[#3D8B5C] border-[#3D8B5C]' : 'bg-[#1A1917] border-[#1A1917]'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Save size={16} strokeWidth={2} />
            {saved ? 'Opgeslagen!' : saving ? 'Opslaan...' : 'Opslaan'}
          </span>
        </button>
      </div>
    </div>
  )
}
