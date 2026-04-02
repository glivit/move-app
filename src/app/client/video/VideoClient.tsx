'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Video, Calendar, Clock, ArrowRight, Phone, Download, ExternalLink } from 'lucide-react'
import { getGoogleCalendarUrl, downloadICS } from '@/lib/calendar'

interface VideoSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  daily_room_url: string | null
  notes: string | null
}

export default function ClientVideoPage() {
  const [sessions, setSessions] = useState<VideoSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('video_sessions')
        .select('id, scheduled_at, duration_minutes, status, daily_room_url, notes')
        .eq('client_id', user.id)
        .order('scheduled_at', { ascending: false })

      setSessions(data || [])
    } catch (err) {
      console.error('Error loading video sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const upcoming = sessions.filter(
    (s) => new Date(s.scheduled_at) >= now && s.status !== 'completed' && s.status !== 'cancelled'
  )
  const past = sessions.filter(
    (s) => new Date(s.scheduled_at) < now || s.status === 'completed'
  )

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Vandaag'
    if (d.toDateString() === tomorrow.toDateString()) return 'Morgen'
    return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
  }

  function isJoinable(session: VideoSession) {
    const start = new Date(session.scheduled_at)
    const end = new Date(start.getTime() + session.duration_minutes * 60000)
    const joinWindow = new Date(start.getTime() - 5 * 60000) // 5 min before
    return now >= joinWindow && now <= end && session.daily_room_url
  }

  function getCalendarEvent(session: VideoSession) {
    const start = new Date(session.scheduled_at)
    const end = new Date(start.getTime() + session.duration_minutes * 60000)
    return {
      title: 'MŌVE Video Call met je coach',
      description: 'Videocall met je coach via MŌVE Studio.\\nOpen de app om deel te nemen.',
      startDate: start,
      endDate: end,
      location: 'MŌVE Studio (online)',
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'scheduled': return { text: 'Gepland', color: '#007AFF', bg: '#007AFF' }
      case 'in_progress': return { text: 'Bezig', color: '#34C759', bg: '#34C759' }
      case 'completed': return { text: 'Afgerond', color: '#ACACAC', bg: '#ACACAC' }
      case 'cancelled': return { text: 'Geannuleerd', color: '#FF3B30', bg: '#FF3B30' }
      default: return { text: status, color: '#ACACAC', bg: '#ACACAC' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6]">
        <div className="max-w-lg mx-auto px-5 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1A1917] border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-lg mx-auto px-5 py-8 pb-28">
        {/* Header */}
        <h1 className="text-[28px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-1">
          Video Calls
        </h1>
        <p className="text-[13px] text-[#ACACAC] mb-8">
          Je geplande videocalls met je coach
        </p>

        {/* Upcoming Sessions */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <p className="text-[12px] text-[#ACACAC] uppercase font-medium tracking-wide mb-3">
              Aankomend
            </p>
            <div className="space-y-3">
              {upcoming.map((session) => {
                const joinable = isJoinable(session)
                const st = statusLabel(session.status)

                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0EE]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                          <Video strokeWidth={1.5} className="w-5 h-5 text-[#007AFF]" />
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-[#1A1A18]">
                            {formatDate(session.scheduled_at)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock strokeWidth={1.5} className="w-3.5 h-3.5 text-[#ACACAC]" />
                            <span className="text-[13px] text-[#ACACAC]">
                              {formatTime(session.scheduled_at)} · {session.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${st.bg}10`, color: st.color }}
                      >
                        {st.text}
                      </span>
                    </div>

                    {joinable ? (
                      <Link
                        href={`/client/video/${session.id}`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#34C759] text-white text-[14px] font-semibold hover:bg-[#2DB84E] transition-colors"
                      >
                        <Phone strokeWidth={1.5} className="w-4 h-4" />
                        Nu deelnemen
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F5F5F3] text-[13px] text-[#ACACAC]">
                        <Calendar strokeWidth={1.5} className="w-4 h-4" />
                        Je kunt 5 minuten voor de start deelnemen
                      </div>
                    )}

                    {/* Calendar actions */}
                    <div className="flex gap-2 mt-3">
                      <a
                        href={getGoogleCalendarUrl(getCalendarEvent(session))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#D5D5D5] text-[12px] font-medium text-[#ACACAC] hover:bg-[#F8F8F6] transition-colors"
                      >
                        <ExternalLink strokeWidth={1.5} className="w-3.5 h-3.5" />
                        Google Calendar
                      </a>
                      <button
                        onClick={() => downloadICS(getCalendarEvent(session), `move-call-${session.id.slice(0, 8)}.ics`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#D5D5D5] text-[12px] font-medium text-[#ACACAC] hover:bg-[#F8F8F6] transition-colors"
                      >
                        <Download strokeWidth={1.5} className="w-3.5 h-3.5" />
                        Download .ics
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Past Sessions */}
        {past.length > 0 && (
          <div>
            <p className="text-[12px] text-[#ACACAC] uppercase font-medium tracking-wide mb-3">
              Eerdere videocalls
            </p>
            <div className="space-y-2">
              {past.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0EE] flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F8F8F6] flex items-center justify-center">
                    <Video strokeWidth={1.5} className="w-4 h-4 text-[#ACACAC]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1A1A18]">
                      {formatDate(session.scheduled_at)}
                    </p>
                    <p className="text-[12px] text-[#ACACAC]">
                      {formatTime(session.scheduled_at)} · {session.duration_minutes} min
                    </p>
                  </div>
                  <span className="text-[11px] text-[#ACACAC]">
                    {statusLabel(session.status).text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sessions.length === 0 && (
          <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0EE] text-center">
            <div className="w-16 h-16 rounded-full bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-4">
              <Video strokeWidth={1.5} className="w-8 h-8 text-[#007AFF]" />
            </div>
            <h2 className="text-[17px] font-semibold text-[#1A1A18] mb-2">
              Geen video calls gepland
            </h2>
            <p className="text-[13px] text-[#ACACAC] max-w-xs mx-auto">
              Je coach plant videocalls in wanneer nodig. Je ziet ze hier verschijnen.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
