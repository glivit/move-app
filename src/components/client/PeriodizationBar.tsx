'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface TrainingPhase {
  id: string
  name: string
  phase_type: string
  week_start: number
  week_end: number
  intensity_pct: number
  notes: string
}

const PHASE_COLORS: Record<string, { color: string; bgColor: string }> = {
  prep: { color: '#007AFF', bgColor: '#EBF5FF' },
  hypertrophy: { color: '#AF52DE', bgColor: '#F5EEFA' },
  strength: { color: '#FF9500', bgColor: '#FFF3E0' },
  power: { color: '#FF3B30', bgColor: '#FFE5E5' },
  deload: { color: '#34C759', bgColor: '#E8FAF0' },
  peaking: { color: '#FF2D55', bgColor: '#FFE5EC' },
  maintenance: { color: '#8E8E93', bgColor: '#F0F0ED' },
}

export function PeriodizationBar() {
  const [currentPhase, setCurrentPhase] = useState<TrainingPhase | null>(null)
  const [totalWeeks, setTotalWeeks] = useState(0)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [phases, setPhases] = useState<TrainingPhase[]>([])

  useEffect(() => {
    loadPeriodization()
  }, [])

  async function loadPeriodization() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get active client program
    const { data: cp } = await supabase
      .from('client_programs')
      .select('id, current_week, template_id, program_templates(duration_weeks)')
      .eq('client_id', user.id)
      .eq('is_active', true)
      .single()

    if (!cp) return

    const week = cp.current_week || 1
    const weeks = (cp as any).program_templates?.duration_weeks || 8
    setCurrentWeek(week)
    setTotalWeeks(weeks)

    // Get phases
    const { data: phasesData } = await supabase
      .from('training_phases')
      .select('*')
      .eq('client_program_id', cp.id)
      .order('week_start')

    if (!phasesData || phasesData.length === 0) return

    setPhases(phasesData)

    // Find current phase
    const active = phasesData.find((p) => week >= p.week_start && week <= p.week_end)
    setCurrentPhase(active || null)
  }

  if (!currentPhase || phases.length === 0) return null

  const config = PHASE_COLORS[currentPhase.phase_type] || PHASE_COLORS.maintenance
  const progressPct = Math.min(((currentWeek - currentPhase.week_start) / (currentPhase.week_end - currentPhase.week_start + 1)) * 100, 100)

  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ backgroundColor: config.bgColor, borderColor: `${config.color}20` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-[13px] font-semibold" style={{ color: config.color }}>
            {currentPhase.name}
          </span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: config.color, opacity: 0.7 }}>
          Week {currentWeek} van {totalWeeks}
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-1.5 rounded-full" style={{ backgroundColor: `${config.color}20` }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progressPct}%`, backgroundColor: config.color }}
        />
      </div>

      {currentPhase.notes && (
        <p className="text-[11px] mt-2" style={{ color: config.color, opacity: 0.8 }}>
          {currentPhase.notes}
        </p>
      )}
    </div>
  )
}
