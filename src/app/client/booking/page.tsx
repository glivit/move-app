'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Check, Loader2, ChevronLeft, ChevronRight, Video } from 'lucide-react'

interface AvailableSlot {
  date: string
  time: string
  datetime: string
}

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
const MONTH_NAMES = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

export default function BookingPage() {
  const router = useRouter()
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/scheduling/availability')
        if (res.ok) {
          const json = await res.json()
          setSlots(json.data.availableSlots || [])
          // Auto-select first available date
          if (json.data.availableSlots?.length > 0) {
            setSelectedDate(json.data.availableSlots[0].date)
          }
        }
      } catch (error) {
        console.error('Failed to load availability:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map: Record<string, AvailableSlot[]> = {}
    slots.forEach(slot => {
      if (!map[slot.date]) map[slot.date] = []
      map[slot.date].push(slot)
    })
    return map
  }, [slots])

  const availableDates = useMemo(() => Object.keys(slotsByDate).sort(), [slotsByDate])
  const slotsForDate = selectedDate ? (slotsByDate[selectedDate] || []) : []

  // Calendar navigation
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: { date: Date; isCurrentMonth: boolean; hasSlots: boolean }[] = []

    // Pad with previous month
    const startPad = (firstDay.getDay() + 6) % 7 // Monday start
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, isCurrentMonth: false, hasSlots: false })
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i)
      const dateStr = d.toISOString().split('T')[0]
      days.push({ date: d, isCurrentMonth: true, hasSlots: !!slotsByDate[dateStr] })
    }

    // Pad to complete last week
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i)
        days.push({ date: d, isCurrentMonth: false, hasSlots: false })
      }
    }

    return days
  }, [calendarMonth, slotsByDate])

  async function handleBook() {
    if (!selectedSlot) return
    setBooking(true)

    try {
      const res = await fetch('/api/video-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: selectedSlot.datetime,
          duration_minutes: 30,
          notes: notes.trim() || null,
        }),
      })

      if (res.ok) {
        setBooked(true)
        setTimeout(() => router.push('/client/video'), 2000)
      }
    } catch (error) {
      console.error('Booking failed:', error)
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-slide-up">
          <p className="text-label mb-3">Afspraken</p>
          <h1 className="page-title-sm">Boeken</h1>
        </div>
        <div className="bg-white h-64 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (booked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-[#2FA65A] flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-white" strokeWidth={2} />
        </div>
        <h2 className="text-[22px] font-bold text-[#FDFDFE] mb-2">Sessie geboekt!</h2>
        <p className="text-[15px] text-[rgba(253,253,254,0.55)]">
          {selectedSlot && new Date(selectedSlot.datetime).toLocaleDateString('nl-BE', {
            weekday: 'long', day: 'numeric', month: 'long'
          })} om {selectedSlot?.time}
        </p>
        <p className="text-[13px] text-[rgba(253,253,254,0.48)] mt-2">Je wordt doorgestuurd naar je video calls...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <p className="text-label mb-3">Afspraken</p>
        <h1 className="page-title-sm">Boeken</h1>
      </div>

      {slots.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center animate-slide-up stagger-2">
          <Calendar strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-[rgba(253,253,254,0.48)]" />
          <p className="text-[15px] font-semibold text-[#FDFDFE] mb-2">Geen beschikbare tijden</p>
          <p className="text-[13px] text-[rgba(253,253,254,0.55)]">
            Je coach heeft nog geen beschikbaarheid ingesteld. Neem contact op via berichten.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up stagger-2">
          {/* Calendar */}
          <div className="bg-white p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalendarMonth(prev => {
                  const d = new Date(prev.year, prev.month - 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })}
                className="p-2 hover:bg-[rgba(253,253,254,0.10)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[rgba(253,253,254,0.55)]" />
              </button>
              <h3 className="text-[15px] font-semibold text-[#FDFDFE]">
                {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
              </h3>
              <button
                onClick={() => setCalendarMonth(prev => {
                  const d = new Date(prev.year, prev.month + 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })}
                className="p-2 hover:bg-[rgba(253,253,254,0.10)] transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[rgba(253,253,254,0.55)]" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                <div key={day} className="text-center text-[11px] font-semibold text-[rgba(253,253,254,0.48)] py-1">{day}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const dateStr = day.date.toISOString().split('T')[0]
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === new Date().toISOString().split('T')[0]
                const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0))

                return (
                  <button
                    key={i}
                    onClick={() => day.hasSlots && setSelectedDate(dateStr)}
                    disabled={!day.hasSlots || isPast}
                    className={`aspect-square flex flex-col items-center justify-center text-[13px] transition-all relative ${
                      isSelected
                        ? 'bg-[#474B48] text-white font-bold'
                        : day.hasSlots && !isPast
                          ? 'text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.10)] font-medium'
                          : !day.isCurrentMonth
                            ? 'text-[rgba(253,253,254,0.08)]'
                            : 'text-[rgba(253,253,254,0.48)]'
                    }`}
                  >
                    {day.date.getDate()}
                    {day.hasSlots && !isPast && !isSelected && (
                      <div className="w-1 h-1 bg-[#FDFDFE] absolute bottom-1" />
                    )}
                    {isToday && !isSelected && (
                      <div className="w-1 h-1 bg-[#C0FC01] absolute bottom-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-4">
            {selectedDate && (
              <div className="bg-white p-5 rounded-2xl animate-slide-up stagger-3">
                <h3 className="text-[15px] font-semibold text-[#FDFDFE] mb-1">
                  {new Date(selectedDate).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-[12px] text-[rgba(253,253,254,0.55)] mb-4">{slotsForDate.length} beschikbare tijden</p>

                <div className="grid grid-cols-3 gap-2">
                  {slotsForDate.map(slot => (
                    <button
                      key={slot.datetime}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2.5 px-3 text-[14px] font-medium uppercase tracking-wider transition-all border rounded-xl ${
                        selectedSlot?.datetime === slot.datetime
                          ? 'bg-[#474B48] text-white border-[#FDFDFE]'
                          : 'bg-white text-[#FDFDFE] border-[rgba(253,253,254,0.08)] hover:border-[#FDFDFE]/30 hover:bg-[rgba(253,253,254,0.10)]'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Booking confirmation */}
            {selectedSlot && (
              <div className="bg-white p-5 rounded-2xl animate-slide-up stagger-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#FDFDFE]/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#FDFDFE]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#FDFDFE]">Video coaching sessie</p>
                    <p className="text-[13px] text-[rgba(253,253,254,0.55)]">
                      {new Date(selectedSlot.datetime).toLocaleDateString('nl-BE', {
                        weekday: 'long', day: 'numeric', month: 'long'
                      })} om {selectedSlot.time} — 30 min
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-label text-[rgba(253,253,254,0.55)] uppercase tracking-[0.12em] block mb-1.5">
                    Notitie (optioneel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Waar wil je het over hebben?"
                    className="w-full px-3 py-2.5 border border-[rgba(253,253,254,0.08)] rounded-xl text-[13px] text-[#FDFDFE] placeholder-[rgba(253,253,254,0.48)] focus:outline-none focus:border-[#FDFDFE] resize-none h-16"
                  />
                </div>

                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full py-3 bg-[#474B48] text-white font-semibold uppercase tracking-wider text-[14px] hover:bg-[#3A3E3B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {booking ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Boeken...</>
                  ) : (
                    <><Calendar className="w-4 h-4" /> Videocall boeken</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
