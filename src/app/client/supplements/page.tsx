'use client'

import { useState, useEffect } from 'react'
import { Pill, Plus, Check, X, Clock, Sun, Moon, Sunset, Zap, Trash2, Loader2 } from 'lucide-react'

interface Supplement {
  id: string
  name: string
  dosage: string | null
  frequency: string
  time_of_day: string
  notes: string | null
  is_active: boolean
}

interface SupplementLog {
  id: string
  supplement_id: string
  date: string
  taken_at: string
}

const TIME_OPTIONS = [
  { value: 'ochtend', label: 'Ochtend', icon: Sun },
  { value: 'middag', label: 'Middag', icon: Clock },
  { value: 'avond', label: 'Avond', icon: Moon },
  { value: 'voor workout', label: 'Pre-workout', icon: Zap },
  { value: 'na workout', label: 'Post-workout', icon: Sunset },
]

const FREQUENCY_OPTIONS = [
  { value: 'dagelijks', label: 'Dagelijks' },
  { value: '2x per dag', label: '2x per dag' },
  { value: '3x per dag', label: '3x per dag' },
  { value: 'wekelijks', label: 'Wekelijks' },
  { value: 'indien nodig', label: 'Indien nodig' },
]

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [todayLogs, setTodayLogs] = useState<SupplementLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // New supplement form
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('dagelijks')
  const [timeOfDay, setTimeOfDay] = useState('ochtend')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/supplements')
      if (res.ok) {
        const json = await res.json()
        setSupplements(json.data.supplements)
        setTodayLogs(json.data.todayLogs)
      }
    } catch (error) {
      console.error('Failed to load supplements:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addSupplement(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), dosage: dosage.trim(), frequency, time_of_day: timeOfDay, notes: notes.trim() }),
      })
      if (res.ok) {
        setShowAdd(false)
        setName('')
        setDosage('')
        setNotes('')
        setFrequency('dagelijks')
        setTimeOfDay('ochtend')
        await loadData()
      }
    } catch (error) {
      console.error('Failed to add supplement:', error)
    } finally {
      setSaving(false)
    }
  }

  async function toggleLog(supplementId: string) {
    setTogglingId(supplementId)
    try {
      const res = await fetch('/api/supplements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log', supplement_id: supplementId }),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Failed to toggle log:', error)
    } finally {
      setTogglingId(null)
    }
  }

  async function deactivate(supplementId: string) {
    try {
      const res = await fetch('/api/supplements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', supplement_id: supplementId }),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Failed to deactivate:', error)
    }
  }

  const isLoggedToday = (supplementId: string) =>
    todayLogs.some(l => l.supplement_id === supplementId)

  const loggedCount = supplements.filter(s => isLoggedToday(s.id)).length
  const totalCount = supplements.length

  // Group by time of day
  const grouped = TIME_OPTIONS.map(time => ({
    ...time,
    items: supplements.filter(s => s.time_of_day === time.value),
  })).filter(g => g.items.length > 0)

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <div className="animate-shimmer bg-[#F0F0EE] h-40 rounded-2xl" />

        {/* Form skeleton */}
        <div className="animate-shimmer bg-[#F0F0EE] h-32 rounded-2xl" />

        {/* Cards skeleton */}
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="animate-shimmer bg-[#F0F0EE] h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero section with stats */}
      <div className="mb-10 animate-slide-up">
        <p className="text-label mb-3">Supplementen</p>
        <p className="stat-number-hero text-[#1A1917]">
          {totalCount > 0 ? Math.round((loggedCount / totalCount) * 100) : 0}<span className="text-[36px]">%</span>
        </p>
        <p className="text-[16px] text-[#ACACAC] mt-2">vandaag ingenomen</p>

        {/* Thin progress bar */}
        {totalCount > 0 && (
          <div className="w-full h-[3px] bg-[#F0F0EE] rounded-full mt-5 overflow-hidden">
            <div className="h-full bg-[#3D8B5C] rounded-full transition-all duration-500" style={{ width: `${totalCount > 0 ? (loggedCount / totalCount) * 100 : 0}%` }} />
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addSupplement} className="bg-white p-5 rounded-2xl border border-[#F0F0EE] space-y-4 animate-slide-up" style={{ animationDelay: '60ms' }}>
          <h3 className="text-[15px] font-semibold text-[#1A1917]">Nieuw supplement toevoegen</h3>

          <div>
            <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] block mb-1.5">Naam *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Creatine, Vitamine D, Omega-3..."
              required
              className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl bg-[#F8F8F6] text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] block mb-1.5">Dosering</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="bijv. 5g, 2000 IU, 1 capsule..."
              className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl bg-[#F8F8F6] text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] block mb-1.5">Frequentie</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl bg-[#F8F8F6] text-[14px] text-[#1A1917] focus:outline-none focus:border-[#1A1917]"
              >
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] block mb-1.5">Tijdstip</label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl bg-[#F8F8F6] text-[14px] text-[#1A1917] focus:outline-none focus:border-[#1A1917]"
              >
                {TIME_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-3 bg-[#1A1917] text-white font-semibold text-[11px] uppercase tracking-[0.12em] hover:bg-[#333330] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Toevoegen
          </button>
        </form>
      )}

      {/* Supplement list grouped by time */}
      {grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map((group, groupIndex) => {
            const GroupIcon = group.icon
            return (
              <div key={group.value} className="animate-slide-up" style={{ animationDelay: `${120 + groupIndex * 60}ms` }}>
                <div className="flex items-center gap-2 mb-3">
                  <GroupIcon className="w-4 h-4 text-[#ACACAC]" strokeWidth={1.5} />
                  <h3 className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em]">{group.label}</h3>
                </div>
                <div className="space-y-2">
                  {group.items.map(supplement => {
                    const logged = isLoggedToday(supplement.id)
                    const toggling = togglingId === supplement.id
                    return (
                      <div
                        key={supplement.id}
                        className={`bg-white p-4 rounded-2xl border transition-colors ${
                          logged ? 'border-[#3D8B5C]/20 hover:bg-[#FAFAF8]' : 'border-[#F0F0EE] hover:bg-[#FAFAF8]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleLog(supplement.id)}
                            disabled={toggling}
                            className="w-8 h-8 border-2 flex items-center justify-center shrink-0 transition-all rounded-md"
                            style={{
                              borderColor: logged ? '#3D8B5C' : '#F0F0EE',
                              backgroundColor: logged ? '#3D8B5C' : 'transparent',
                            }}
                          >
                            {toggling ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#ACACAC]" />
                            ) : logged ? (
                              <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                            ) : null}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[15px] font-semibold ${logged ? 'text-[#ACACAC] line-through' : 'text-[#1A1917]'}`}>
                              {supplement.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {supplement.dosage && (
                                <span className="text-[12px] text-[#ACACAC]">{supplement.dosage}</span>
                              )}
                              <span className="text-[12px] text-[#C0C0C0]">{supplement.frequency}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`${supplement.name} verwijderen?`)) {
                                deactivate(supplement.id)
                              }
                            }}
                            className="p-2 text-[#C0C0C0] hover:text-[#C4372A] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : !showAdd ? (
        <div className="bg-white p-12 rounded-2xl border border-[#F0F0EE] text-center">
          <Pill strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-[#C0C0C0]" />
          <p className="text-[15px] font-semibold text-[#1A1917] mb-2">Nog geen supplementen</p>
          <p className="text-[13px] text-[#ACACAC] mb-4">
            Voeg je supplementen en medicatie toe om ze dagelijks bij te houden.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 bg-[#1A1917] text-white font-semibold text-[11px] uppercase tracking-[0.12em] hover:bg-[#333330] transition-colors rounded-xl"
          >
            Eerste supplement toevoegen
          </button>
        </div>
      ) : null}
    </div>
  )
}
