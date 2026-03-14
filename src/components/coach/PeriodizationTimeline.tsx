'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, X, ChevronDown } from 'lucide-react'

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

const PHASE_TYPES: Record<string, { label: string; color: string; bgColor: string }> = {
  prep: { label: 'Voorbereiding', color: '#007AFF', bgColor: '#EBF5FF' },
  hypertrophy: { label: 'Hypertrofie', color: '#AF52DE', bgColor: '#F5EEFA' },
  strength: { label: 'Kracht', color: '#FF9500', bgColor: '#FFF3E0' },
  power: { label: 'Power', color: '#FF3B30', bgColor: '#FFE5E5' },
  deload: { label: 'Deload', color: '#34C759', bgColor: '#E8FAF0' },
  peaking: { label: 'Peaking', color: '#FF2D55', bgColor: '#FFE5EC' },
  maintenance: { label: 'Onderhoud', color: '#8E8E93', bgColor: '#F0F0ED' },
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

  // Generate week labels
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  if (loading) {
    return (
      <div className="h-32 bg-white rounded-2xl animate-pulse border border-[#F0F0ED]" />
    )
  }

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold" style={{ color: '#1A1A18' }}>
          Periodisering
        </h3>
        <button
          onClick={() => { setEditingPhase({ ...defaultPhase }); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: '#FFF8ED', color: '#8B6914' }}
        >
          <Plus size={14} strokeWidth={2} />
          Fase toevoegen
        </button>
      </div>

      {/* Timeline visualization */}
      <div className="relative">
        {/* Week labels */}
        <div className="flex mb-2">
          {weeks.map((w) => (
            <div
              key={w}
              className="flex-1 text-center"
              style={{ minWidth: 0 }}
            >
              <span
                className={`text-[10px] font-semibold ${
                  w === currentWeek ? 'text-white bg-[#8B6914] rounded-full px-1.5 py-0.5' : ''
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
          <div className="space-y-2">
            {phases.map((phase) => {
              const config = PHASE_TYPES[phase.phase_type] || PHASE_TYPES.maintenance
              const startPct = ((phase.week_start - 1) / totalWeeks) * 100
              const widthPct = ((phase.week_end - phase.week_start + 1) / totalWeeks) * 100

              return (
                <div key={phase.id} className="relative h-10">
                  <div
                    className="absolute top-0 h-full rounded-xl flex items-center px-3 cursor-pointer transition-all hover:opacity-90"
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: config.bgColor,
                      border: `1px solid ${config.color}20`,
                      minWidth: 60,
                    }}
                    onClick={() => { setEditingPhase(phase); setShowForm(true) }}
                  >
                    <span className="text-[11px] font-semibold truncate" style={{ color: config.color }}>
                      {phase.name || config.label}
                    </span>
                    <span className="text-[10px] ml-auto flex-shrink-0 pl-2" style={{ color: config.color, opacity: 0.7 }}>
                      {phase.intensity_pct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Current week indicator */}
        {currentWeek >= 1 && currentWeek <= totalWeeks && (
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${((currentWeek - 0.5) / totalWeeks) * 100}%`,
              backgroundColor: '#8B6914',
              opacity: 0.5,
            }}
          />
        )}
      </div>

      {/* Phase legend */}
      {phases.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#F0F0ED]">
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
                  {Object.entries(PHASE_TYPES).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setEditingPhase({
                        ...editingPhase,
                        phase_type: key,
                        name: editingPhase.name || cfg.label,
                      })}
                      className="py-2 px-2 rounded-lg text-[11px] font-semibold transition-all border"
                      style={{
                        backgroundColor: editingPhase.phase_type === key ? cfg.bgColor : 'white',
                        borderColor: editingPhase.phase_type === key ? cfg.color : '#F0F0ED',
                        color: editingPhase.phase_type === key ? cfg.color : '#8E8E93',
                      }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Naam</label>
                <input
                  type="text"
                  value={editingPhase.name}
                  onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#8B6914]"
                  style={{ borderColor: '#F0F0ED', color: '#1A1A18' }}
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
                    className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#8B6914]"
                    style={{ borderColor: '#F0F0ED', color: '#1A1A18' }}
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
                    className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#8B6914]"
                    style={{ borderColor: '#F0F0ED', color: '#1A1A18' }}
                  />
                </div>
              </div>

              {/* Intensity */}
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
                  className="w-full mt-1 accent-[#8B6914]"
                />
                <div className="flex justify-between text-[10px]" style={{ color: '#C7C7CC' }}>
                  <span>30%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Notities</label>
                <textarea
                  value={editingPhase.notes}
                  onChange={(e) => setEditingPhase({ ...editingPhase, notes: e.target.value })}
                  rows={2}
                  className="w-full mt-1 p-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#8B6914] resize-none"
                  style={{ borderColor: '#F0F0ED', color: '#1A1A18' }}
                  placeholder="Focus punten, richtlijnen..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {editingPhase.id && (
                  <button
                    onClick={() => { deletePhase(editingPhase.id!); setShowForm(false); setEditingPhase(null) }}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                    style={{ color: '#FF3B30', backgroundColor: '#FFE5E5' }}
                  >
                    Verwijder
                  </button>
                )}
                <button
                  onClick={() => savePhase(editingPhase)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                  style={{ backgroundColor: '#8B6914' }}
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
