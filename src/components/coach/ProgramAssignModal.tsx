'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Client {
  id: string
  full_name: string
}

interface TemplateDay {
  id: string
  day_number: number
  name: string
  focus: string | null
}

interface ProgramAssignModalProps {
  isOpen: boolean
  onClose: () => void
  templateId: string
  templateName: string
  durationWeeks: number
  preSelectedClientId?: string
}

const WEEKDAYS = [
  { key: '1', label: 'Ma' },
  { key: '2', label: 'Di' },
  { key: '3', label: 'Wo' },
  { key: '4', label: 'Do' },
  { key: '5', label: 'Vr' },
  { key: '6', label: 'Za' },
  { key: '7', label: 'Zo' },
]

export function ProgramAssignModal({
  isOpen,
  onClose,
  templateId,
  templateName,
  durationWeeks,
  preSelectedClientId,
}: ProgramAssignModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [templateDays, setTemplateDays] = useState<TemplateDay[]>([])
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId || '')
  const [programName, setProgramName] = useState(templateName)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [coachNotes, setCoachNotes] = useState('')
  // schedule: { "1": "template-day-id", "3": "template-day-id", ... }
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch clients
        const { data: clientData, error: clientError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'client')
          .order('full_name', { ascending: true })

        if (clientError) throw clientError
        setClients(clientData || [])
        if (preSelectedClientId) {
          setSelectedClientId(preSelectedClientId)
        } else if (clientData && clientData.length > 0) {
          setSelectedClientId(clientData[0].id)
        }

        // Fetch template days
        const { data: dayData } = await supabase
          .from('program_template_days')
          .select('id, day_number, name, focus')
          .eq('template_id', templateId)
          .order('sort_order', { ascending: true })

        if (dayData) {
          setTemplateDays(dayData as TemplateDay[])

          // Try to load default_schedule from template
          const { data: template } = await supabase
            .from('program_templates')
            .select('default_schedule')
            .eq('id', templateId)
            .single()

          if (template?.default_schedule && Object.keys(template.default_schedule).length > 0) {
            setSchedule(template.default_schedule as Record<string, string>)
          } else {
            // Auto-distribute days across weekdays (skip Sun by default)
            const weekdaySlots = ['1', '2', '3', '4', '5', '6'] // Ma-Za
            const auto: Record<string, string> = {}
            dayData.forEach((day, idx) => {
              if (idx < weekdaySlots.length) {
                // Spread evenly
                const slotIdx = Math.round((idx / dayData.length) * weekdaySlots.length)
                const slot = weekdaySlots[Math.min(slotIdx, weekdaySlots.length - 1)]
                if (!auto[slot]) {
                  auto[slot] = day.id
                } else {
                  const free = weekdaySlots.find(s => !auto[s])
                  if (free) auto[free] = day.id
                }
              }
            })
            setSchedule(auto)
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setError('Fout bij het laden van gegevens')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, supabase, templateId])

  const handleWeekdayClick = (weekdayKey: string) => {
    setSchedule(prev => {
      const current = prev[weekdayKey]
      const newSchedule = { ...prev }

      if (current) {
        delete newSchedule[weekdayKey]
      } else {
        const assignedDayIds = new Set(Object.values(newSchedule))
        const unassigned = templateDays.find(d => !assignedDayIds.has(d.id))
        if (unassigned) {
          newSchedule[weekdayKey] = unassigned.id
        }
      }

      return newSchedule
    })
  }

  const handleDaySelect = (weekdayKey: string, dayId: string) => {
    setSchedule(prev => {
      const newSchedule = { ...prev }
      for (const k of Object.keys(newSchedule)) {
        if (newSchedule[k] === dayId && k !== weekdayKey) {
          delete newSchedule[k]
        }
      }
      newSchedule[weekdayKey] = dayId
      return newSchedule
    })
  }

  const handleAssign = async () => {
    if (!selectedClientId || !startDate) {
      setError('Selecteer een cliënt en startdatum')
      return
    }

    if (Object.keys(schedule).length === 0) {
      setError('Wijs minstens één trainingsdag toe aan een weekdag')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const start = new Date(startDate)
      const end = new Date(start)
      end.setDate(end.getDate() + durationWeeks * 7)
      const endDateString = end.toISOString().split('T')[0]

      await supabase
        .from('client_programs')
        .update({ is_active: false })
        .eq('client_id', selectedClientId)
        .eq('is_active', true)

      const { error: insertError } = await supabase.from('client_programs').insert({
        client_id: selectedClientId,
        template_id: templateId,
        name: programName,
        start_date: startDate,
        end_date: endDateString,
        is_active: true,
        coach_notes: coachNotes || null,
        schedule,
      })

      if (insertError) throw insertError

      // Save as default for future assignments
      await supabase
        .from('program_templates')
        .update({ default_schedule: schedule })
        .eq('id', templateId)

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setProgramName(templateName)
        setCoachNotes('')
        setError(null)
        setSchedule({})
      }, 1500)
    } catch (err) {
      console.error('Failed to assign program:', err)
      setError('Fout bij het toewijzen van programma')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const assignedCount = Object.keys(schedule).length

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-5 border-b border-[#E8E4DC] flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
            <h2 className="text-[17px] font-semibold text-[#1A1A18]">
              {success ? 'Gereed!' : 'Programma toewijzen'}
            </h2>
            {!success && (
              <button onClick={onClose} className="text-[#8E8E93] hover:text-[#1A1A18] transition-colors p-1">
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-5 space-y-5">
            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[15px] text-[#1A1A18]">Programma succesvol toegewezen</p>
              </div>
            ) : (
              <>
                {/* Client */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">Cliënt</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <option>Laden...</option>
                    ) : clients.length === 0 ? (
                      <option disabled>Geen cliënten beschikbaar</option>
                    ) : (
                      clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">Startdatum</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
                  />
                </div>

                {/* ══════ TRAININGSSCHEMA ══════ */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Trainingsschema
                    <span className="text-[11px] ml-2 font-normal">
                      ({assignedCount}/{templateDays.length} dagen ingepland)
                    </span>
                  </label>

                  {/* Weekday buttons */}
                  <div className="grid grid-cols-7 gap-1.5 mb-3">
                    {WEEKDAYS.map(wd => {
                      const isActive = !!schedule[wd.key]
                      return (
                        <button
                          key={wd.key}
                          type="button"
                          onClick={() => handleWeekdayClick(wd.key)}
                          className={`py-2.5 rounded-xl text-center transition-all ${
                            isActive
                              ? 'bg-[var(--color-pop)] text-white shadow-sm'
                              : 'bg-[#F5F2EC] text-[#A09D96] hover:bg-[#EBE8E0]'
                          }`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-[0.06em]">{wd.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Day assignments */}
                  <div className="space-y-0">
                    {Object.entries(schedule)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([weekdayKey, dayId]) => {
                        const wd = WEEKDAYS.find(w => w.key === weekdayKey)
                        return (
                          <div key={weekdayKey} className="flex items-center gap-3 py-2.5 border-b border-[#F0EDE8] last:border-0">
                            <span className="w-8 text-[12px] font-bold text-[var(--color-pop)]">{wd?.label}</span>
                            <select
                              value={dayId}
                              onChange={(e) => handleDaySelect(weekdayKey, e.target.value)}
                              className="flex-1 px-3 py-2 bg-[#F5F2EC] border-0 rounded-xl text-[13px] text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[var(--color-pop)]"
                            >
                              {templateDays.map(td => (
                                <option key={td.id} value={td.id}>
                                  D{td.day_number} — {td.name}{td.focus ? ` (${td.focus})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                  </div>

                  {assignedCount === 0 && (
                    <p className="text-[12px] text-[#C5C2BC] text-center py-2">
                      Klik op een weekdag om een trainingsdag in te plannen
                    </p>
                  )}
                </div>

                {/* Program Name */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">Programma naam</label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
                  />
                </div>

                {/* Coach Notes */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">Coach aantekeningen (optioneel)</label>
                  <textarea
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors resize-none"
                    placeholder="Bijzondere opmerkingen..."
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-[13px] text-red-700">{error}</p>
                  </div>
                )}

                <div className="p-3 bg-[#EDEAE4] border border-[#ECEAE3] rounded-2xl">
                  <p className="text-[13px] text-[#1A1917]">
                    <span className="font-semibold">Duur:</span> {durationWeeks} weken
                  </p>
                </div>
              </>
            )}
          </div>

          {!success && (
            <div className="p-5 border-t border-[#E8E4DC] flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
                Annuleren
              </Button>
              <Button
                onClick={handleAssign}
                loading={saving}
                disabled={!selectedClientId || loading || assignedCount === 0}
                className="flex-1"
              >
                {saving ? '' : 'Toewijzen'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
