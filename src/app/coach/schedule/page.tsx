'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  Plus, Video, Clock, Calendar, ChevronLeft, ChevronRight,
  Dumbbell, CheckCircle, AlertTriangle, Flame
} from 'lucide-react'
import { ScheduleCallForm } from '@/components/coach/ScheduleCallForm'

interface VideoSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled'
  client_id: string
  profiles?: { full_name: string; email: string }
}

interface ClientSchedule {
  id: string
  full_name: string
  package: string
  preferred_training_days: number[]
  lastWorkout: string | null
  workoutsThisWeek: number
  targetPerWeek: number
  hasProgram: boolean
}

interface ClientOption {
  id: string
  full_name: string
}

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function getWeekDates(offset: number): Date[] {
  const today = new Date()
  const currentDay = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getPackageTarget(pkg: string): number {
  if (pkg === 'elite') return 5
  if (pkg === 'performance') return 4
  return 3
}

const statusColors: Record<string, string> = {
  on_track: '#34C759',
  at_risk: '#FF9500',
  behind: '#FF3B30',
}

export default function SchedulePage() {
  const [sessions, setSessions] = useState<VideoSession[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSchedules, setClientSchedules] = useState<ClientSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeView, setActiveView] = useState<'overview' | 'calls'>('overview')

  const supabase = createClient()
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  const weekStart = weekDates[0].toISOString()
  const weekEndDate = new Date(weekDates[6])
  weekEndDate.setHours(23, 59, 59, 999)
  const weekEnd = weekEndDate.toISOString()

  useEffect(() => {
    fetchAll()
  }, [weekOffset])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchSessions(), fetchClients(), fetchClientSchedules()])
    setLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'client')
      .order('full_name')
    setClients(data || [])
  }

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('video_sessions')
      .select('*, profiles!video_sessions_client_id_fkey(full_name, email)')
      .gte('scheduled_at', weekStart)
      .lte('scheduled_at', weekEnd)
      .order('scheduled_at', { ascending: true })
    setSessions(data || [])
  }

  const fetchClientSchedules = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, package, preferred_training_days')
      .eq('role', 'client')
      .order('full_name')

    if (!profilesData) return

    const { data: workoutsData } = await supabase
      .from('workout_sessions')
      .select('client_id, started_at, completed_at')
      .gte('started_at', weekStart)
      .lte('started_at', weekEnd)
      .not('completed_at', 'is', null)

    const { data: latestWorkouts } = await supabase
      .from('workout_sessions')
      .select('client_id, completed_at')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    const { data: activePrograms } = await supabase
      .from('client_programs')
      .select('client_id')
      .eq('is_active', true)

    const activeProgramMap = new Set((activePrograms || []).map((p: any) => p.client_id))

    const schedules: ClientSchedule[] = profilesData.map((profile: any) => {
      const weekWorkouts = (workoutsData || []).filter((w: any) => w.client_id === profile.id)
      const lastWo = (latestWorkouts || []).find((w: any) => w.client_id === profile.id)

      return {
        id: profile.id,
        full_name: profile.full_name,
        package: profile.package || 'essential',
        preferred_training_days: profile.preferred_training_days || [1, 3, 5],
        lastWorkout: lastWo?.completed_at || null,
        workoutsThisWeek: weekWorkouts.length,
        targetPerWeek: getPackageTarget(profile.package || 'essential'),
        hasProgram: activeProgramMap.has(profile.id),
      }
    })

    setClientSchedules(schedules)
  }

  const getClientStatus = (client: ClientSchedule) => {
    const today = new Date()
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay()

    if (weekOffset === 0) {
      const expectedByNow = client.preferred_training_days.filter((d) => d <= dayOfWeek).length
      const ratio = expectedByNow > 0 ? client.workoutsThisWeek / expectedByNow : 1
      if (ratio >= 0.8) return 'on_track'
      if (ratio >= 0.5) return 'at_risk'
      return 'behind'
    }

    const ratio = client.workoutsThisWeek / client.targetPerWeek
    if (ratio >= 0.8) return 'on_track'
    if (ratio >= 0.5) return 'at_risk'
    return 'behind'
  }

  const formatWeekLabel = () => {
    const start = weekDates[0]
    const end = weekDates[6]
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    if (weekOffset === 0) return `Deze week (${start.toLocaleDateString('nl-NL', opts)} — ${end.toLocaleDateString('nl-NL', opts)})`
    return `${start.toLocaleDateString('nl-NL', opts)} — ${end.toLocaleDateString('nl-NL', opts)}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const timeSince = (dateString: string | null) => {
    if (!dateString) return 'Nog nooit'
    const diff = Date.now() - new Date(dateString).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Vandaag'
    if (days === 1) return 'Gisteren'
    return `${days}d geleden`
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="border-b border-[#F0F0ED]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[32px] font-display" style={{ color: '#1A1A18' }}>
                Planning
              </h1>
              <p className="text-[15px] mt-1" style={{ color: '#8E8E93' }}>
                Smart scheduling & overzicht
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/coach/schedule/availability"
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all hover:opacity-90 text-[14px] border border-[#F0F0ED] bg-white text-[#1A1A18] hover:bg-[#F5F0E8]"
              >
                <Clock size={18} strokeWidth={1.5} />
                Beschikbaarheid
              </Link>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all hover:opacity-90 text-white"
                style={{ backgroundColor: '#1A1A18' }}
              >
                <Plus size={20} strokeWidth={1.5} />
                Nieuwe afspraak
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mt-8 p-1 rounded-xl inline-flex" style={{ backgroundColor: '#F0F0ED' }}>
            <button
              onClick={() => setActiveView('overview')}
              className={`py-2 px-4 rounded-lg text-[13px] font-semibold transition-all ${
                activeView === 'overview' ? 'bg-white text-[#1A1A18] shadow-sm' : 'text-[#8E8E93]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar size={14} strokeWidth={1.5} />
                Weekoverzicht
              </span>
            </button>
            <button
              onClick={() => setActiveView('calls')}
              className={`py-2 px-4 rounded-lg text-[13px] font-semibold transition-all ${
                activeView === 'calls' ? 'bg-white text-[#1A1A18] shadow-sm' : 'text-[#8E8E93]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Video size={14} strokeWidth={1.5} />
                Video calls
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Schedule Call Form */}
        {showForm && (
          <div
            className="mb-8 p-8 rounded-2xl border"
            style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <h2 className="text-[17px] font-display mb-6" style={{ color: '#1A1A18' }}>
              Nieuwe afspraak inplannen
            </h2>
            {!selectedClient ? (
              <div className="space-y-2">
                <p className="text-[13px] font-medium mb-3" style={{ color: '#8E8E93' }}>Selecteer een cliënt:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      className="text-left px-4 py-3 rounded-xl border transition-all hover:border-[#8B6914]"
                      style={{ borderColor: '#F0F0ED', color: '#1A1A18' }}
                    >
                      {c.full_name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <p className="text-[13px] mb-4" style={{ color: '#8E8E93' }}>
                  Afspraak voor: <strong style={{ color: '#1A1A18' }}>{selectedClient.full_name}</strong>
                  <button onClick={() => setSelectedClient(null)} className="ml-2 underline" style={{ color: '#8B6914' }}>wijzig</button>
                </p>
                <ScheduleCallForm clientId={selectedClient.id} clientName={selectedClient.full_name} onSuccess={() => { fetchAll(); setShowForm(false); setSelectedClient(null); }} />
              </>
            )}
          </div>
        )}

        {activeView === 'overview' ? (
          <>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="p-2 rounded-xl hover:bg-white transition-all"
              >
                <ChevronLeft strokeWidth={1.5} className="w-5 h-5" style={{ color: '#8E8E93' }} />
              </button>
              <div className="text-center">
                <p className="text-[15px] font-semibold" style={{ color: '#1A1A18' }}>
                  {formatWeekLabel()}
                </p>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="text-[12px] font-medium mt-1"
                    style={{ color: '#8B6914' }}
                  >
                    Terug naar deze week
                  </button>
                )}
              </div>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-2 rounded-xl hover:bg-white transition-all"
              >
                <ChevronRight strokeWidth={1.5} className="w-5 h-5" style={{ color: '#8E8E93' }} />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 mb-2">
              <div />
              {weekDates.map((date, i) => (
                <div
                  key={i}
                  className={`text-center py-2 rounded-xl ${isToday(date) ? 'bg-[#8B6914] text-white' : ''}`}
                >
                  <p className={`text-[11px] font-semibold ${isToday(date) ? 'text-white/80' : 'text-[#8E8E93]'}`}>
                    {DAY_LABELS[i]}
                  </p>
                  <p className={`text-[14px] font-bold ${isToday(date) ? 'text-white' : 'text-[#1A1A18]'}`}>
                    {date.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* Client Rows */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
                ))}
              </div>
            ) : clientSchedules.length === 0 ? (
              <div
                className="text-center py-12 rounded-2xl border"
                style={{ backgroundColor: 'white', borderColor: '#F0F0ED' }}
              >
                <Calendar size={40} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: '#C7C7CC' }} />
                <p className="text-[15px]" style={{ color: '#8E8E93' }}>Geen cliënten gevonden</p>
              </div>
            ) : (
              <div className="space-y-1">
                {clientSchedules.map((client) => {
                  const status = getClientStatus(client)
                  return (
                    <div
                      key={client.id}
                      className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 items-center"
                    >
                      {/* Client info */}
                      <Link href={`/coach/clients/${client.id}`}>
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white transition-all cursor-pointer">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusColors[status] }}
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: '#1A1A18' }}>
                              {client.full_name}
                            </p>
                            <p className="text-[11px]" style={{ color: '#8E8E93' }}>
                              {client.workoutsThisWeek}/{client.targetPerWeek} • {timeSince(client.lastWorkout)}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {/* Day cells */}
                      {weekDates.map((date, dayIndex) => {
                        const dayNum = dayIndex + 1
                        const isPreferred = client.preferred_training_days?.includes(dayNum)
                        const isPast = date < new Date() && !isToday(date)

                        const hasCall = sessions.some(
                          (s) => s.client_id === client.id &&
                            new Date(s.scheduled_at).toDateString() === date.toDateString()
                        )

                        return (
                          <div
                            key={dayIndex}
                            className="flex items-center justify-center py-3 rounded-xl"
                            style={{
                              backgroundColor: isPreferred
                                ? isPast ? '#F0F0ED' : '#FFF8ED'
                                : 'transparent',
                            }}
                          >
                            {hasCall ? (
                              <Video size={14} strokeWidth={1.5} style={{ color: '#007AFF' }} />
                            ) : isPreferred ? (
                              <Dumbbell size={14} strokeWidth={1.5} style={{ color: isPast ? '#C7C7CC' : '#8B6914', opacity: isPast ? 0.5 : 0.6 }} />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Summary Cards */}
            {!loading && clientSchedules.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                <div
                  className="p-5 rounded-2xl border"
                  style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8FAF0' }}>
                      <CheckCircle size={16} strokeWidth={1.5} style={{ color: '#34C759' }} />
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: '#8E8E93' }}>Op schema</p>
                  </div>
                  <p className="text-[28px] font-bold" style={{ color: '#1A1A18' }}>
                    {clientSchedules.filter((c) => getClientStatus(c) === 'on_track').length}
                  </p>
                </div>

                <div
                  className="p-5 rounded-2xl border"
                  style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFF3E0' }}>
                      <AlertTriangle size={16} strokeWidth={1.5} style={{ color: '#FF9500' }} />
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: '#8E8E93' }}>Risico</p>
                  </div>
                  <p className="text-[28px] font-bold" style={{ color: '#1A1A18' }}>
                    {clientSchedules.filter((c) => getClientStatus(c) === 'at_risk').length}
                  </p>
                </div>

                <div
                  className="p-5 rounded-2xl border"
                  style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFE5E5' }}>
                      <Flame size={16} strokeWidth={1.5} style={{ color: '#FF3B30' }} />
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: '#8E8E93' }}>Achter</p>
                  </div>
                  <p className="text-[28px] font-bold" style={{ color: '#1A1A18' }}>
                    {clientSchedules.filter((c) => getClientStatus(c) === 'behind').length}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Video Calls View */
          <>
            {loading ? (
              <div className="text-center py-12" style={{ color: '#8E8E93' }}>
                <p>Planning laden...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div
                className="p-12 text-center rounded-2xl border"
                style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <Video size={40} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: '#C7C7CC' }} />
                <p className="text-[15px]" style={{ color: '#8E8E93' }}>
                  Geen video calls deze week
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-5 rounded-2xl border flex items-center justify-between"
                    style={{ backgroundColor: 'white', borderColor: '#F0F0ED', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EBF5FF' }}>
                        <Video size={18} strokeWidth={1.5} style={{ color: '#007AFF' }} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: '#1A1A18' }}>
                          {session.profiles?.full_name || 'Onbekend'}
                        </p>
                        <p className="text-[12px]" style={{ color: '#8E8E93' }}>
                          {formatDate(session.scheduled_at)} om {formatTime(session.scheduled_at)} • {session.duration_minutes} min
                        </p>
                      </div>
                    </div>

                    {session.status === 'scheduled' && (
                      <Link href={`/coach/video/${session.id}`}>
                        <button
                          className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: '#007AFF' }}
                        >
                          Deelnemen
                        </button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
