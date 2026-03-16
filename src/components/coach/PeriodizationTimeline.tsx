'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, X, Trash2, Zap, TrendingUp, Dumbbell, Timer, Target, Shield, Brain } from 'lucide-react'

interface TrainingPhase {
  id?: string
  client_program_id: string
  name: string
  phase_type: string
  week_start: number
  week_end: number
  intensity_pct: number
  volume_modifier: number
  notes: string
}

interface Props {
  clientProgramId: string
  totalWeeks: number
  currentWeek: number
}

const PHASE_TYPES: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  prep: { label: 'Voorbereiding', color: '#007AFF', bgColor: '#EBF5FF', icon: Timer },
  hypertrophy: { label: 'Hypertrofie', color: '#AF52DE', bgColor: '#F5EEFA', icon: Dumbbell },
  strength: { label: 'Kracht', color: '#FF9500', bgColor: '#FFF3E0', icon: TrendingUp },
  power: { label: 'Power', color: '#FF3B30', bgColor: '#FFE5E5', icon: Zap },
  deload: { label: 'Deload', color: '#34C759', bgColor: '#E8FAF0', icon: Shield },
  peaking: { label: 'Peaking', color: '#FF2D55', bgColor: '#FFE5EC', icon: Target },
  maintenance: { label: 'Onderhoud', color: '#8E8E93', bgColor: '#E8E4DC', icon: Brain },
}

export function PeriodizationTimeline({ clientProgramId, totalWeeks, currentWeek }: Props) {
  const [phases, setPhases] = useState<TrainingPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPhase, setEditingPhase] = useState<TrainingPhase | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadPhases()
  }, [clientProgramId])

  async function loadPhases() {
    setLoading(true)
    const { data } = await supabase
      .from('training_phases')
      .select('*')
      .eq('client_program_id', clientProgramId)
      .order('week_start')
    setPhases(data || [])
    setLoading(false)
  }

  const defaultPhase: TrainingPhase = {
    client_program_id: clientProgramId,
    name: '',
    phase_type: 'hypertrophy',
    week_start: 1,
    week_end: 4,
    intensity_pct: 70,
    volume_modifier: 1.0,
    notes: '',
  }

  async function savePhase(phase: TrainingPhase) {
    if (phase.id) {
      await supabase
        .from('training_phases')
        .update({
          name: phase.name,
          phase_type: phase.phase_type,
          week_start: phase.week_start,
          week_end: phase.week_end,
          intensity_pct: phase.intensity_pct,
          volume_modifier: phase.volume_modifier,
          notes: phase.notes,
        })
        .eq('id', phase.id)
    } else {
      await supabase
        .from('training_phases')
        .insert({
          client_program_id: phase.client_program_id,
          name: phase.name || PHASE_TYPES[phase.phase_type]?.label || phase.phase_type,
          phase_type: phase.phase_type,
          week_start: phase.week_start,
          week_end: phase.week_end,
          intensity_pct: phase.intensity_pct,
          volume_modifier: phase.volume_modifier,
          notes: phase.notes,
        })
    }
    setShowForm(false)
    setEditingPhase(null)
    loadPhases()
  }

  async function deletePhase(id: string) {
    await supabase.from('training_phases').delete().eq('id', id)
    loadPhases()
  }

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  // Build intensity curve data points for SVG
  const intensityCurve = useMemo(() => {
    if (phases.length === 0) return null
    const points: { x: number; y: number; color: string }[] = []
    const svgWidth = totalWeeks * 40

    phases.forEach(p => {
      const config = PHASE_TYPES[p.phase_type] || PHASE_TYPES.maintenance
      // Add start point
      points.push({
        x: ((p.week_start - 1) / totalWeeks) * svgWidth + 20,
        y: 44 - (p.intensity_pct / 100) * 40,
        color: config.color,
      })
      // Add end point
      points.push({
        x: ((p.week_end) / totalWeeks) * svgWidth - 4,
        y: 44 - (p.intensity_pct / 100) * 40,
        color: config.color,
      })
    })

    return points
  }, [phases, totalWeeks])

  if (loading) {
    return (
      <div className="h-32 bg-white rounded-2xl animate-pulse border border-[#E8E4DC]" />
    )
  }

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ backgroundColor: 'white', borderColor: '#E8E4DC', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: '#1A1A18' }}>
            Periodisering
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: '#8E8E93' }}>
            {totalWeeks} weken — week {currentWeek} actief
          </p>
        </div>
        <button
          onClick={() => { setEditingPhase({ ...defaultPhase }); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: '#F5F2EC', color: '#1A1917' }}
        >
          <Plus size={14} strokeWidth={2} />
          Fase toevoegen
        </button>
      </div>

      {/* Timeline visualization */}
      <div className="relative overflow-x-auto">
        <div style={{ minWidth: phases.length > 0 ? Math.max(totalWeeks * 40, 500) : 'auto' }}>
          {/* Week labels */}
          <div className="flex mb-2">
            {weeks.map((w) => (
              <div
                key={w}
                className="flex-1 text-center"
                style={{ minWidth: 0 }}
              >
                <span
                  className={`text-[10px] font-semibold inline-block ${
                    w === currentWeek ? 'text-white bg-[#1A1917] rounded-full px-1.5 py-0.5' : ''
                  }`}
                  style={{ color: w === currentWeek ? 'white' : '#C7C7CC' }}
                >
                  {w}
                </span>
              </div>
            ))}
          </div>

          {/* Phase bars */}
          {phases.length === 0 ? (
            <div
              className="h-12 rounded-xl flex items-center justify-center border border-dashed"
              style={{ borderColor: '#C7C7CC' }}
            >
              <p className="text-[12px]" style={{ color: '#C7C7CC' }}>
                Nog geen fasen gedefinieerd
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {phases.map((phase) => {
                const config = PHASE_TYPES[phase.phase_type] || PHASE_TYPES.maintenance
                const Icon = config.icon
                const startPct = ((phase.week_start - 1) / totalWeeks) * 100
                const widthPct = ((phase.week_end - phase.week_start + 1) / totalWeeks) * 100
                const isCurrentPhase = currentWeek >= phase.week_start && currentWeek <= phase.week_end

                return (
                  <div key={phase.id} className="relative h-11">
                    {/* Background grid lines */}
                    <div className="absolute inset-0 flex">
                      {weeks.map(w => (
                        <div key={w} className="flex-1 border-r border-[#F8F8F6] last:border-0" />
                      ))}
                    </div>
                    <div
                      className="absolute top-0.5 bottom-0.5 rounded-xl flex items-center gap-2 px-3 cursor-pointer transition-all hover:shadow-md"
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: config.bgColor,
                        border: `1.5px solid ${config.color}${isCurrentPhase ? '' : '30'}`,
                        minWidth: 80,
                        boxShadow: isCurrentPhase ? `0 0 0 2px white, 0 0 0 4px ${config.color}` : undefined,
                      }}
                      onClick={() => { setEditingPhase(phase); setShowForm(true) }}
                    >
                      <Icon size={13} strokeWidth={1.8} style={{ color: config.color }} className="shrink-0" />
                      <span className="text-[11px] font-semibold truncate" style={{ color: config.color }}>
                        {phase.name || config.label}
                      </span>
                      <span className="text-[10px] ml-auto flex-shrink-0 pl-1 font-medium" style={{ color: config.color, opacity: 0.7 }}>
                        {phase.intensity_pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Intensity curve */}
          {intensityCurve && intensityCurve.length > 1 && (
            <div className="mt-4 pt-3 border-t border-[#E8E4DC]">
              <p className="text-[10px] font-semibold text-[#C7C7CC] uppercase tracking-wide mb-2">Intensiteitscurve</p>
              <div className="relative" style={{ height: 48 }}>
                <svg className="w-full h-full" viewBox={`0 0 ${totalWeeks * 40} 48`} preserveAspectRatio="none">
                  {/* Horizontal grid */}
                  <line x1="0" y1="12" x2={totalWeeks * 40} y2="12" stroke="#E8E4DC" strokeDasharray="3 2" />
                  <line x1="0" y1="24" x2={totalWeeks * 40} y2="24" stroke="#E8E4DC" strokeDasharray="3 2" />
                  <line x1="0" y1="36" x2={totalWeeks * 40} y2="36" stroke="#E8E4DC" strokeDasharray="3 2" />

                  {/* Fill area */}
                  <polygon
                    points={`${intensityCurve[0].x},44 ${intensityCurve.map(p => `${p.x},${p.y}`).join(' ')} ${intensityCurve[intensityCurve.length - 1].x},44`}
                    fill="url(#intensityGradient)"
                    opacity="0.3"
                  />

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1A1917" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#1A1917" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Line */}
                  <polyline
                    points={intensityCurve.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#1A1917"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dots at phase midpoints */}
                  {phases.map((p, i) => {
                    const config = PHASE_TYPES[p.phase_type] || PHASE_TYPES.maintenance
                    const midWeek = (p.week_start + p.week_end) / 2
                    const x = ((midWeek - 0.5) / totalWeeks) * totalWeeks * 40
                    const y = 44 - (p.intensity_pct / 100) * 40
                    return (
                      <circle key={i} cx={x} cy={y} r="4" fill={config.color} stroke="white" strokeWidth="1.5" />
                    )
                  })}

                  {/* Current week marker */}
                  {currentWeek >= 1 && currentWeek <= totalWeeks && (
                    <line
                      x1={((currentWeek - 0.5) / totalWeeks) * totalWeeks * 40}
                      y1="0"
                      x2={((currentWeek - 0.5) / totalWeeks) * totalWeeks * 40}
                      y2="48"
                      stroke="#1A1917"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      opacity="0.5"
                    />
                  )}
                </svg>
                {/* Labels */}
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-[9px] font-medium text-[#C7C7CC] -mr-6">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                </div>
              </div>
            </div>
          )}

          {/* Current week indicator line on gantt */}
          {currentWeek >= 1 && currentWeek <= totalWeeks && phases.length > 0 && (
            <div
              className="absolute top-8 pointer-events-none"
              style={{
                left: `${((currentWeek - 0.5) / totalWeeks) * 100}%`,
                height: `${phases.length * 46 + 8}px`,
                width: '2px',
                backgroundColor: '#1A1917',
                opacity: 0.4,
                borderRadius: '1px',
              }}
            />
          )}
        </div>
      </div>

      {/* Phase legend */}
      {phases.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#E8E4DC]">
          {phases.map((phase) => {
            const config = PHASE_TYPES[phase.phase_type] || PHASE_TYPES.maintenance
            return (
              <div key={phase.id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                <span className="text-[11px]" style={{ color: '#8E8E93' }}>
                  {phase.name || config.label} (wk {phase.week_start}-{phase.week_end})
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit/Add Form Modal */}
      {showForm && editingPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowForm(false); setEditingPhase(null) }} />
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl p-6"
            style={{ backgroundColor: 'white', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-semibold" style={{ color: '#1A1A18' }}>
                {editingPhase.id ? 'Fase bewerken' : 'Nieuwe fase'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingPhase(null) }}>
                <X size={20} strokeWidth={1.5} style={{ color: '#8E8E93' }} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Phase type */}
              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Type</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {Object.entries(PHASE_TYPES).map(([key, cfg]) => {
                    const TypeIcon = cfg.icon
                    return (
                      <button
                        key={key}
                        onClick={() => setEditingPhase({
                          ...editingPhase,
                          phase_type: key,
                          name: editingPhase.name || cfg.label,
                        })}
                        className="py-2 px-2 rounded-lg text-[10px] font-semibold transition-all border flex flex-col items-center gap-1"
                        style={{
                          backgroundColor: editingPhase.phase_type === key ? cfg.bgColor : 'white',
                          borderColor: editingPhase.phase_type === key ? cfg.color : '#E8E4DC',
                          color: editingPhase.phase_type === key ? cfg.color : '#8E8E93',
                        }}
                      >
                        <TypeIcon size={14} strokeWidth={1.5} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Naam</label>
                <input
                  type="text"
                  value={editingPhase.name}
                  onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                  style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  placeholder={PHASE_TYPES[editingPhase.phase_type]?.label}
                />
              </div>

              {/* Week range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Start (week)</label>
                  <input
                    type="number"
                    min={1}
                    max={totalWeeks}
                    value={editingPhase.week_start}
                    onChange={(e) => setEditingPhase({ ...editingPhase, week_start: parseInt(e.target.value) || 1 })}
                    className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                    style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Einde (week)</label>
                  <input
                    type="number"
                    min={editingPhase.week_start}
                    max={totalWeeks}
                    value={editingPhase.week_end}
                    onChange={(e) => setEditingPhase({ ...editingPhase, week_end: parseInt(e.target.value) || 4 })}
                    className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                    style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  />
                </div>
              </div>

              {/* Intensity + Volume */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>
                    Intensiteit: {editingPhase.intensity_pct}%
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={editingPhase.intensity_pct}
                    onChange={(e) => setEditingPhase({ ...editingPhase, intensity_pct: parseInt(e.target.value) })}
                    className="w-full mt-1 accent-[#1A1917]"
                  />
                  <div className="flex justify-between text-[10px]" style={{ color: '#C7C7CC' }}>
                    <span>30%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>
                    Volume: {editingPhase.volume_modifier}x
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={Math.round(editingPhase.volume_modifier * 10)}
                    onChange={(e) => setEditingPhase({ ...editingPhase, volume_modifier: parseInt(e.target.value) / 10 })}
                    className="w-full mt-1 accent-[#1A1917]"
                  />
                  <div className="flex justify-between text-[10px]" style={{ color: '#C7C7CC' }}>
                    <span>0.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Notities</label>
                <textarea
                  value={editingPhase.notes}
                  onChange={(e) => setEditingPhase({ ...editingPhase, notes: e.target.value })}
                  rows={2}
                  className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917] resize-none"
                  style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  placeholder="Focus punten, richtlijnen..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {editingPhase.id && (
                  <button
                    onClick={() => { deletePhase(editingPhase.id!); setShowForm(false); setEditingPhase(null) }}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-1.5"
                    style={{ color: '#FF3B30', backgroundColor: '#FFE5E5' }}
                  >
                    <Trash2 size={14} />
                    Verwijder
                  </button>
                )}
                <button
                  onClick={() => savePhase(editingPhase)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                  style={{ backgroundColor: '#1A1917' }}
                >
                  {editingPhase.id ? 'Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
