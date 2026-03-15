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
        <div>
          <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">Supplementen</h1>
          <p className="text-[#8E8E93] text-[15px]">Laden...</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl h-24 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">Supplementen</h1>
          <p className="text-[#8E8E93] text-[15px]">Track je dagelijkse supplementen en medicatie</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 rounded-xl bg-[#8B6914] text-white flex items-center justify-center hover:bg-[#6B5110] transition-colors"
        >
          {showAdd ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Plus className="w-5 h-5" strokeWidth={1.5} />}
        </button>
      </div>

      {/* Daily progress */}
      {totalCount > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: loggedCount === totalCount ? '#34C759' : '#FF9500', opacity: 0.1 }}>
                <Pill className="w-5 h-5" strokeWidth={1.5}
                  style={{ color: loggedCount === totalCount ? '#34C759' : '#FF9500' }} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1A1A18]">
                  {loggedCount === totalCount ? 'Alles ingenomen!' : `${loggedCount} van ${totalCount} ingenomen`}
                </p>
                <p className="text-[12px] text-[#8E8E93]">Vandaag</p>
              </div>
            </div>
            <span className="text-[20px] font-bold" style={{ color: loggedCount === totalCount ? '#34C759' : '#FF9500' }}>
              {totalCount > 0 ? Math.round((loggedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#F0F0ED] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (loggedCount / totalCount) * 100 : 0}%`,
                backgroundColor: loggedCount === totalCount ? '#34C759' : '#FF9500',
              }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addSupplement} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#8B6914]/20 space-y-4">
          <h3 className="text-[15px] font-semibold text-[#1A1A18]">Nieuw supplement toevoegen</h3>

          <div>
            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Naam *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Creatine, Vitamine D, Omega-3..."
              required
              className="w-full px-3 py-2.5 border border-[#F0F0ED] rounded-xl text-[14px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914]"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Dosering</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="bijv. 5g, 2000 IU, 1 capsule..."
              className="w-full px-3 py-2.5 border border-[#F0F0ED] rounded-xl text-[14px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Frequentie</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#F0F0ED] rounded-xl text-[14px] text-[#1A1A18] focus:outline-none focus:border-[#8B6914]"
              >
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Tijdstip</label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#F0F0ED] rounded-xl text-[14px] text-[#1A1A18] focus:outline-none focus:border-[#8B6914]"
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
            className="w-full py-3 bg-[#8B6914] text-white rounded-xl font-semibold text-[14px] hover:bg-[#6B5110] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Toevoegen
          </button>
        </form>
      )}

      {/* Supplement list grouped by time */}
      {grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(group => {
            const GroupIcon = group.icon
            return (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-3">
                  <GroupIcon className="w-4 h-4 text-[#8E8E93]" strokeWidth={1.5} />
                  <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">{group.label}</h3>
                </div>
                <div className="space-y-2">
                  {group.items.map(supplement => {
                    const logged = isLoggedToday(supplement.id)
                    const toggling = togglingId === supplement.id
                    return (
                      <div
                        key={supplement.id}
                        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border transition-all"
                        style={{ borderColor: logged ? '#34C759' : '#F0F0ED' }}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleLog(supplement.id)}
                            disabled={toggling}
                            className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                            style={{
                              borderColor: logged ? '#34C759' : '#E0DDD8',
                              backgroundColor: logged ? '#34C759' : 'transparent',
                            }}
                          >
                            {toggling ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#8E8E93]" />
                            ) : logged ? (
                              <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                            ) : null}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[15px] font-semibold ${logged ? 'text-[#8E8E93] line-through' : 'text-[#1A1A18]'}`}>
                              {supplement.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {supplement.dosage && (
                                <span className="text-[12px] text-[#8E8E93]">{supplement.dosage}</span>
                              )}
                              <span className="text-[12px] text-[#C7C7CC]">{supplement.frequency}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`${supplement.name} verwijderen?`)) {
                                deactivate(supplement.id)
                              }
                            }}
                            className="p-2 text-[#C7C7CC] hover:text-[#FF3B30] transition-colors"
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
        <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
          <Pill strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-[#C7C7CC]" />
          <p className="text-[15px] font-semibold text-[#1A1A18] mb-2">Nog geen supplementen</p>
          <p className="text-[13px] text-[#8E8E93] mb-4">
            Voeg je supplementen en medicatie toe om ze dagelijks bij te houden.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 bg-[#8B6914] text-white rounded-xl font-semibold text-[14px] hover:bg-[#6B5110] transition-colors"
          >
            Eerste supplement toevoegen
          </button>
        </div>
      ) : null}
    </div>
  )
}
