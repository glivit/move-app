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
  prep: { color: '#3068C4', bgColor: 'rgba(48,104,196,0.06)' },
  hypertrophy: { color: '#AF52DE', bgColor: '#F5EEFA' },
  strength: { color: '#C0FC01', bgColor: 'rgba(196,125,21,0.06)' },
  power: { color: '#B55A4A', bgColor: 'rgba(196,55,42,0.06)' },
  deload: { color: '#2FA65A', bgColor: 'rgba(61,139,92,0.06)' },
  peaking: { color: '#B55A4A', bgColor: '#FFE5EC' },
  maintenance: { color: 'rgba(253,253,254,0.55)', bgColor: 'rgba(253,253,254,0.14)' },
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
