'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Heart, Footprints, Moon, Droplets, Brain, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface HealthMetric {
  date: string
  steps?: number
  sleep_hours?: number
  sleep_quality?: string
  resting_heart_rate?: number
  stress_level?: number
  water_ml?: number
  weight_kg?: number
}

interface Props {
  clientId: string
}

export function ClientHealthSummary({ clientId }: Props) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [clientId])

  async function loadMetrics() {
    const supabase = createClient()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 14)

    const { data } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('client_id', clientId)
      .gte('date', cutoff.toISOString().split('T')[0])
      .order('date', { ascending: true })

    setMetrics(data || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="h-32 bg-white rounded-2xl animate-pulse border border-[#F0F0ED]" />
  }

  if (metrics.length === 0) {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <Heart size={24} strokeWidth={1.5} className="mx-auto mb-2" style={{ color: '#C7C7CC' }} />
        <p className="text-[13px]" style={{ color: '#8E8E93' }}>
          Nog geen gezondheidsdata beschikbaar
        </p>
      </div>
    )
  }

  // Calculate averages
  const withSteps = metrics.filter((m) => m.steps)
  const withSleep = metrics.filter((m) => m.sleep_hours)
  const withWater = metrics.filter((m) => m.water_ml)
  const withHR = metrics.filter((m) => m.resting_heart_rate)
  const withWeight = metrics.filter((m) => m.weight_kg)

  const avg = {
    steps: withSteps.length ? Math.round(withSteps.reduce((s, m) => s + (m.steps || 0), 0) / withSteps.length) : null,
    sleep: withSleep.length ? (withSleep.reduce((s, m) => s + (m.sleep_hours || 0), 0) / withSleep.length).toFixed(1) : null,
    water: withWater.length ? Math.round(withWater.reduce((s, m) => s + (m.water_ml || 0), 0) / withWater.length) : null,
    hr: withHR.length ? Math.round(withHR.reduce((s, m) => s + (m.resting_heart_rate || 0), 0) / withHR.length) : null,
  }

  // Weight trend
  const weightTrend = withWeight.length >= 2
    ? (withWeight[withWeight.length - 1].weight_kg || 0) - (withWeight[0].weight_kg || 0)
    : null

  // Chart data
  const chartData = metrics.slice(-7).map((m) => ({
    date: new Date(m.date).toLocaleDateString('nl-NL', { weekday: 'short' }),
    slaap: m.sleep_hours || 0,
    stappen: m.steps ? Math.round(m.steps / 1000) : 0,
    stress: m.stress_level || 0,
  }))

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <h3 className="text-[15px] font-semibold mb-4" style={{ color: '#1A1A18' }}>
        Gezondheidsoverzicht (14d)
      </h3>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {avg.steps !== null && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFF3E0' }}>
            <Footprints size={14} strokeWidth={1.5} style={{ color: '#FF9500' }} />
            <p className="text-[16px] font-bold mt-1" style={{ color: '#1A1A18' }}>
              {(avg.steps / 1000).toFixed(1)}k
            </p>
            <p className="text-[10px]" style={{ color: '#8E8E93' }}>Gem. stappen</p>
          </div>
        )}
        {avg.sleep !== null && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#F5EEFA' }}>
            <Moon size={14} strokeWidth={1.5} style={{ color: '#AF52DE' }} />
            <p className="text-[16px] font-bold mt-1" style={{ color: '#1A1A18' }}>
              {avg.sleep}u
            </p>
            <p className="text-[10px]" style={{ color: '#8E8E93' }}>Gem. slaap</p>
          </div>
        )}
        {avg.water !== null && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#EBF5FF' }}>
            <Droplets size={14} strokeWidth={1.5} style={{ color: '#007AFF' }} />
            <p className="text-[16px] font-bold mt-1" style={{ color: '#1A1A18' }}>
              {(avg.water / 1000).toFixed(1)}L
            </p>
            <p className="text-[10px]" style={{ color: '#8E8E93' }}>Gem. water</p>
          </div>
        )}
        {avg.hr !== null && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFE5E5' }}>
            <Heart size={14} strokeWidth={1.5} style={{ color: '#FF3B30' }} />
            <p className="text-[16px] font-bold mt-1" style={{ color: '#1A1A18' }}>
              {avg.hr}
            </p>
            <p className="text-[10px]" style={{ color: '#8E8E93' }}>Gem. BPM</p>
          </div>
        )}
      </div>

      {/* Weight trend */}
      {weightTrend !== null && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ backgroundColor: '#FAFAFA' }}>
          <Activity size={14} strokeWidth={1.5} style={{ color: '#34C759' }} />
          <span className="text-[12px]" style={{ color: '#8E8E93' }}>Gewichtstrend:</span>
          <span className="flex items-center gap-1 text-[12px] font-semibold" style={{
            color: weightTrend > 0 ? '#FF9500' : weightTrend < 0 ? '#34C759' : '#8E8E93'
          }}>
            {weightTrend > 0 ? (
              <TrendingUp size={12} strokeWidth={2} />
            ) : weightTrend < 0 ? (
              <TrendingDown size={12} strokeWidth={2} />
            ) : (
              <Minus size={12} strokeWidth={2} />
            )}
            {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg
          </span>
        </div>
      )}

      {/* Mini chart */}
      {chartData.length > 2 && (
        <div>
          <p className="text-[11px] font-medium mb-2" style={{ color: '#8E8E93' }}>Slaap afgelopen 7 dagen</p>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#C7C7CC' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 10]} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="slaap" fill="#AF52DE" radius={[4, 4, 0, 0]} name="Slaap (u)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
