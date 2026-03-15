'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, Save, Loader2, Plus, Trash2, ChevronLeft,
  CalendarOff, CalendarCheck, ToggleLeft, ToggleRight
} from 'lucide-react'

interface AvailabilitySlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_active: boolean
}

interface BlockedDate {
  id: string
  blocked_date: string
  reason: string | null
}

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const DAY_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 22; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

export default function AvailabilityPage() {
  const router = useRouter()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newBlockDate, setNewBlockDate] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const [blockingDate, setBlockingDate] = useState(false)

  useEffect(() => {
    loadAvailability()
  }, [])

  async function loadAvailability() {
    try {
      const res = await fetch('/api/scheduling/availability')
      if (res.ok) {
        const json = await res.json()
        setSlots(json.data.slots || [])
        setBlockedDates(json.data.blockedDates || [])
      }
    } catch (error) {
      console.error('Failed to load availability:', error)
    } finally {
      setLoading(false)
    }
  }

  function addSlot() {
    setSlots(prev => [...prev, {
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      slot_duration_minutes: 30,
      is_active: true,
    }])
  }

  function removeSlot(index: number) {
    setSlots(prev => prev.filter((_, i) => i !== index))
  }

  function updateSlot(index: number, field: keyof AvailabilitySlot, value: any) {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  async function saveSlots() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/scheduling/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_slots',
          slots: slots.filter(s => s.is_active).map(s => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            slot_duration_minutes: s.slot_duration_minutes,
          })),
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  async function blockDate() {
    if (!newBlockDate) return
    setBlockingDate(true)
    try {
      const res = await fetch('/api/scheduling/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block_date',
          date: newBlockDate,
          reason: newBlockReason.trim() || null,
        }),
      })
      if (res.ok) {
        setNewBlockDate('')
        setNewBlockReason('')
        await loadAvailability()
      }
    } catch (error) {
      console.error('Block date failed:', error)
    } finally {
      setBlockingDate(false)
    }
  }

  async function unblockDate(date: string) {
    try {
      await fetch('/api/scheduling/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock_date', date }),
      })
      await loadAvailability()
    } catch (error) {
      console.error('Unblock failed:', error)
    }
  }

  // Group slots by day
  const slotsByDay: Record<number, AvailabilitySlot[]> = {}
  slots.forEach((slot, i) => {
    if (!slotsByDay[slot.day_of_week]) slotsByDay[slot.day_of_week] = []
    slotsByDay[slot.day_of_week].push({ ...slot, id: String(i) })
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="h-8 w-64 bg-white rounded-xl animate-pulse mb-4" />
          <div className="h-64 bg-white rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="border-b border-[#F0F0ED]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <button
            onClick={() => router.push('/coach/schedule')}
            className="flex items-center gap-2 text-[13px] font-medium text-[#8E8E93] hover:text-[#1A1A18] transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug naar planning
          </button>
          <h1 className="text-[32px] font-display text-[#1A1A18]">Beschikbaarheid</h1>
          <p className="text-[15px] text-[#8E8E93] mt-1">
            Stel in wanneer cliënten een sessie kunnen boeken
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Weekly Slots */}
        <div className="bg-white rounded-2xl p-6 border border-[#F0F0ED] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1A1A18]">Wekelijkse beschikbaarheid</h2>
              <p className="text-[13px] text-[#8E8E93] mt-0.5">Terugkerende tijdsloten per dag</p>
            </div>
            <button
              onClick={addSlot}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#F5F0E8] text-[#8B6914] hover:bg-[#EDE5D4] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tijdslot toevoegen
            </button>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-12">
              <Clock strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-[#C7C7CC]" />
              <p className="text-[15px] font-semibold text-[#1A1A18] mb-2">Geen tijdsloten ingesteld</p>
              <p className="text-[13px] text-[#8E8E93]">
                Voeg tijdsloten toe zodat cliënten sessies kunnen boeken
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    slot.is_active
                      ? 'border-[#F0F0ED] bg-white'
                      : 'border-[#F0F0ED] bg-[#FAFAFA] opacity-60'
                  }`}
                >
                  {/* Toggle active */}
                  <button
                    onClick={() => updateSlot(index, 'is_active', !slot.is_active)}
                    className="text-[#8E8E93] hover:text-[#8B6914] transition-colors"
                  >
                    {slot.is_active ? (
                      <ToggleRight className="w-6 h-6 text-[#34C759]" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>

                  {/* Day */}
                  <select
                    value={slot.day_of_week}
                    onChange={(e) => updateSlot(index, 'day_of_week', parseInt(e.target.value))}
                    className="px-3 py-2 border border-[#F0F0ED] rounded-lg text-[13px] font-medium text-[#1A1A18] bg-white focus:outline-none focus:border-[#8B6914]"
                  >
                    {DAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>{name}</option>
                    ))}
                  </select>

                  {/* Start time */}
                  <select
                    value={slot.start_time}
                    onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                    className="px-3 py-2 border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] bg-white focus:outline-none focus:border-[#8B6914]"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <span className="text-[13px] text-[#8E8E93]">tot</span>

                  {/* End time */}
                  <select
                    value={slot.end_time}
                    onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                    className="px-3 py-2 border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] bg-white focus:outline-none focus:border-[#8B6914]"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Duration */}
                  <select
                    value={slot.slot_duration_minutes}
                    onChange={(e) => updateSlot(index, 'slot_duration_minutes', parseInt(e.target.value))}
                    className="px-3 py-2 border border-[#F0F0ED] rounded-lg text-[13px] text-[#1A1A18] bg-white focus:outline-none focus:border-[#8B6914]"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>

                  {/* Delete */}
                  <button
                    onClick={() => removeSlot(index)}
                    className="ml-auto p-2 rounded-lg text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[#F0F0ED]">
            <button
              onClick={saveSlots}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-[#1A1A18] text-white hover:bg-[#2A2A28] transition-colors disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Opslaan...</>
              ) : (
                <><Save className="w-4 h-4" /> Beschikbaarheid opslaan</>
              )}
            </button>
            {saved && (
              <span className="text-[13px] font-medium text-[#34C759]">Opgeslagen!</span>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl p-6 border border-[#F0F0ED] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Weekoverzicht</h2>
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map(day => {
              const daySlots = slots.filter(s => s.day_of_week === day && s.is_active)
              return (
                <div key={day} className="text-center">
                  <p className="text-[11px] font-semibold text-[#8E8E93] mb-2">
                    {DAY_SHORT[day]}
                  </p>
                  {daySlots.length > 0 ? (
                    <div className="space-y-1">
                      {daySlots.map((s, i) => (
                        <div key={i} className="bg-[#F5F0E8] rounded-lg py-1.5 px-1">
                          <p className="text-[10px] font-medium text-[#8B6914]">
                            {s.start_time}
                          </p>
                          <p className="text-[10px] text-[#8B6914]/60">
                            {s.end_time}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#FAFAFA] rounded-lg py-3">
                      <p className="text-[10px] text-[#C7C7CC]">—</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Blocked Dates */}
        <div className="bg-white rounded-2xl p-6 border border-[#F0F0ED] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[17px] font-semibold text-[#1A1A18] mb-1">Geblokkeerde dagen</h2>
          <p className="text-[13px] text-[#8E8E93] mb-6">Vakantie, feestdagen, of andere niet-beschikbare dagen</p>

          {/* Add blocked date */}
          <div className="flex items-end gap-3 mb-6 pb-6 border-b border-[#F0F0ED]">
            <div className="flex-1">
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Datum</label>
              <input
                type="date"
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-[#F0F0ED] rounded-xl text-[13px] text-[#1A1A18] focus:outline-none focus:border-[#8B6914]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Reden (optioneel)</label>
              <input
                type="text"
                value={newBlockReason}
                onChange={(e) => setNewBlockReason(e.target.value)}
                placeholder="bv. Vakantie"
                className="w-full px-3 py-2.5 border border-[#F0F0ED] rounded-xl text-[13px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914]"
              />
            </div>
            <button
              onClick={blockDate}
              disabled={!newBlockDate || blockingDate}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#FF3B30] text-white hover:bg-[#D63228] transition-colors disabled:opacity-50"
            >
              {blockingDate ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Blocked dates list */}
          {blockedDates.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#34C759]" />
              <p className="text-[13px] text-[#8E8E93]">Geen geblokkeerde dagen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((bd) => (
                <div key={bd.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FFF5F5] border border-[#FF3B30]/10">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A18]">
                      {new Date(bd.blocked_date + 'T00:00:00').toLocaleDateString('nl-BE', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                    {bd.reason && (
                      <p className="text-[12px] text-[#8E8E93]">{bd.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => unblockDate(bd.blocked_date)}
                    className="text-[12px] font-medium text-[#FF3B30] hover:underline"
                  >
                    Deblokkeren
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
