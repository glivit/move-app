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
  { value: 'poor', label: 'Slecht', emoji: '😴', color: '#FF3B30' },
  { value: 'fair', label: 'Matig', emoji: '😐', color: '#FF9500' },
  { value: 'good', label: 'Goed', emoji: '😊', color: '#34C759' },
  { value: 'excellent', label: 'Uitstekend', emoji: '🌟', color: '#007AFF' },
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-semibold" style={{ color: '#1A1A18' }}>Gezondheid</h1></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#1A1A18' }}>Gezondheid</h1>
        <p className="text-[14px] mt-1" style={{ color: '#8E8E93' }}>
          Track je dagelijkse gezondheidsdata
        </p>
      </div>

      {/* Weekly Averages */}
      {weekAvg && (
        <div className="grid grid-cols-3 gap-3">
          <div
            className="p-4 rounded-2xl text-center"
            style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <Footprints size={18} strokeWidth={1.5} className="mx-auto mb-1" style={{ color: '#FF9500' }} />
            <p className="text-[18px] font-bold" style={{ color: '#1A1A18' }}>
              {(weekAvg.steps / 1000).toFixed(1)}k
            </p>
            <p className="text-[11px]" style={{ color: '#8E8E93' }}>Gem. stappen</p>
          </div>
          <div
            className="p-4 rounded-2xl text-center"
            style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <Moon size={18} strokeWidth={1.5} className="mx-auto mb-1" style={{ color: '#AF52DE' }} />
            <p className="text-[18px] font-bold" style={{ color: '#1A1A18' }}>
              {weekAvg.sleep}u
            </p>
            <p className="text-[11px]" style={{ color: '#8E8E93' }}>Gem. slaap</p>
          </div>
          <div
            className="p-4 rounded-2xl text-center"
            style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <Droplets size={18} strokeWidth={1.5} className="mx-auto mb-1" style={{ color: '#007AFF' }} />
            <p className="text-[18px] font-bold" style={{ color: '#1A1A18' }}>
              {(weekAvg.water / 1000).toFixed(1)}L
            </p>
            <p className="text-[11px]" style={{ color: '#8E8E93' }}>Gem. water</p>
          </div>
        </div>
      )}

      {/* Mini Chart */}
      {chartData.length > 2 && (
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <p className="text-[13px] font-semibold mb-3" style={{ color: '#1A1A18' }}>
            Laatste 7 dagen
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#AF52DE" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#AF52DE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#C7C7CC' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="slaap" stroke="#AF52DE" fill="url(#sleepGrad)" strokeWidth={2} name="Slaap (u)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's Input */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold" style={{ color: '#1A1A18' }}>
            Vandaag
          </h2>
          <span className="text-[12px]" style={{ color: '#8E8E93' }}>
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="space-y-4">
          {/* Steps */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFF3E0' }}>
              <Footprints size={16} strokeWidth={1.5} style={{ color: '#FF9500' }} />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Stappen</label>
              <input
                type="number"
                value={todayData.steps || ''}
                onChange={(e) => updateField('steps', parseInt(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none"
                style={{ color: '#1A1A18' }}
              />
            </div>
          </div>

          {/* Sleep */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EEFA' }}>
              <Moon size={16} strokeWidth={1.5} style={{ color: '#AF52DE' }} />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Slaap (uren)</label>
              <input
                type="number"
                step="0.5"
                value={todayData.sleep_hours || ''}
                onChange={(e) => updateField('sleep_hours', parseFloat(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none"
                style={{ color: '#1A1A18' }}
              />
            </div>
          </div>

          {/* Sleep quality */}
          <div>
            <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Slaapkwaliteit</label>
            <div className="flex gap-2 mt-1.5">
              {SLEEP_QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateField('sleep_quality', todayData.sleep_quality === opt.value ? undefined : opt.value)}
                  className="flex-1 py-2 rounded-xl text-center text-[11px] font-semibold border transition-all"
                  style={{
                    borderColor: todayData.sleep_quality === opt.value ? opt.color : '#E8E4DC',
                    backgroundColor: todayData.sleep_quality === opt.value ? `${opt.color}15` : 'white',
                    color: todayData.sleep_quality === opt.value ? opt.color : '#8E8E93',
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EBF5FF' }}>
              <Droplets size={16} strokeWidth={1.5} style={{ color: '#007AFF' }} />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Water (ml)</label>
              <input
                type="number"
                step="250"
                value={todayData.water_ml || ''}
                onChange={(e) => updateField('water_ml', parseInt(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none"
                style={{ color: '#1A1A18' }}
              />
            </div>
            {/* Quick add buttons */}
            <div className="flex gap-1">
              {[250, 500].map((ml) => (
                <button
                  key={ml}
                  onClick={() => updateField('water_ml', (todayData.water_ml || 0) + ml)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ backgroundColor: '#EBF5FF', color: '#007AFF' }}
                >
                  +{ml}
                </button>
              ))}
            </div>
          </div>

          {/* Heart Rate */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFE5E5' }}>
              <Heart size={16} strokeWidth={1.5} style={{ color: '#FF3B30' }} />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Rusthartslag (bpm)</label>
              <input
                type="number"
                value={todayData.resting_heart_rate || ''}
                onChange={(e) => updateField('resting_heart_rate', parseInt(e.target.value) || undefined)}
                placeholder="0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none"
                style={{ color: '#1A1A18' }}
              />
            </div>
          </div>

          {/* Stress */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFF3E0' }}>
                <Brain size={16} strokeWidth={1.5} style={{ color: '#FF9500' }} />
              </div>
              <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>
                Stressniveau: {todayData.stress_level || '–'}/10
              </label>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={todayData.stress_level || 5}
              onChange={(e) => updateField('stress_level', parseInt(e.target.value))}
              className="w-full accent-[#FF9500]"
            />
            <div className="flex justify-between text-[10px]" style={{ color: '#C7C7CC' }}>
              <span>Ontspannen</span>
              <span>Gestrest</span>
            </div>
          </div>

          {/* Weight */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E8FAF0' }}>
              <Activity size={16} strokeWidth={1.5} style={{ color: '#34C759' }} />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Gewicht (kg)</label>
              <input
                type="number"
                step="0.1"
                value={todayData.weight_kg || ''}
                onChange={(e) => updateField('weight_kg', parseFloat(e.target.value) || undefined)}
                placeholder="0.0"
                className="w-full text-[15px] font-semibold bg-transparent outline-none"
                style={{ color: '#1A1A18' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Notities</label>
            <textarea
              value={todayData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              placeholder="Hoe voel je je vandaag?"
              className="w-full mt-1 p-3 rounded-xl border text-[13px] resize-none focus:outline-none focus:border-[#1A1917]"
              style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
            />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={saveMetrics}
          disabled={saving}
          className="w-full mt-4 py-3 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: saved ? '#34C759' : '#1A1917' }}
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
