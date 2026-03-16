export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PackageBadge } from '@/components/ui/PackageBadge'
import { ComplianceWidget } from '@/components/coach/ComplianceWidget'
import Link from 'next/link'
import {
  ClipboardCheck,
  MessageSquare,
  Users,
  TrendingUp,
  FileText,
  Dumbbell,
  UtensilsCrossed,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function formatDateDutch(date: Date) {
  return date.toLocaleDateString('nl-BE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function timeSince(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + 'j geleden'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + 'ma geleden'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + 'd geleden'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + 'u geleden'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + 'm geleden'
  return 'zojuist'
}

interface CheckInWithClient {
  id: string; date: string; coach_reviewed: boolean; client_id: string
  profiles: { full_name: string; package: string } | null
}

interface MessageWithClient {
  id: string; content: string; created_at: string; sender_id: string; read_at: string | null
  profiles: { full_name: string } | null
}

export default async function CoachDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-[#EEEBE3] px-5 py-10 flex items-center justify-center">
        <p className="text-[#6B6862]">Niet ingelogd</p>
      </div>
    )
  }

  const [
    { count: pendingCheckinsCount },
    { count: unreadMessagesCount },
    { count: activeClientsCount },
    { data: recentCheckinsData },
    { data: recentMessagesData },
    { data: clientsData },
    { data: feedbackData },
  ] = await Promise.all([
    supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('coach_reviewed', false),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).is('read_at', null),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('checkins').select(`id, date, coach_reviewed, client_id, profiles!checkins_client_id_fkey(full_name, package)`).eq('coach_reviewed', false).order('date', { ascending: false }).limit(5),
    supabase.from('messages').select(`id, content, created_at, sender_id, read_at, profiles!messages_sender_id_fkey(full_name)`).eq('receiver_id', user.id).is('read_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select(`id, full_name, package, client_programs!client_programs_client_id_fkey(id, is_active)`).eq('role', 'client'),
    supabase.from('workout_sessions').select(`id, client_id, completed_at, difficulty_rating, feedback_text, mood_rating, profiles!workout_sessions_client_id_fkey(full_name)`).not('completed_at', 'is', null).eq('coach_seen', false).order('completed_at', { ascending: false }).limit(5),
  ])

  const packagePrices: Record<string, number> = { essential: 297, performance: 497, elite: 797 }
  const mrr = (clientsData || []).reduce((sum, client) => sum + (packagePrices[client.package || 'essential'] || 0), 0)

  const recentCheckinsFormatted = (recentCheckinsData as CheckInWithClient[] | null)?.map((c) => ({
    id: c.id, date: c.date, clientName: c.profiles?.full_name || 'Onbekende cliënt',
    packageTier: (c.profiles?.package || 'essential') as 'essential' | 'performance' | 'elite',
    timeSince: timeSince(c.date),
  })) || []

  const recentMessagesFormatted = (recentMessagesData as MessageWithClient[] | null)?.map((m) => ({
    id: m.id, preview: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
    clientName: m.profiles?.full_name || 'Onbekende cliënt', timeSince: timeSince(m.created_at),
  })) || []

  const feedbackSessions = (feedbackData || []).filter((s: any) => s.difficulty_rating || s.feedback_text || s.mood_rating)
  const difficultyLabels: Record<number, string> = { 1: 'Te makkelijk', 2: 'Makkelijk', 3: 'Perfect', 4: 'Zwaar', 5: 'Te zwaar' }
  const difficultyColors: Record<number, string> = { 1: 'text-[#3068C4]', 2: 'text-[#3D8B5C]', 3: 'text-[#1A1917]', 4: 'text-[#C47D15]', 5: 'text-[#C4372A]' }

  const greeting = getGreeting()
  const dateFormatted = formatDateDutch(new Date())

  const kpiCards = [
    { href: '/coach/check-ins', label: 'Te reviewen', value: pendingCheckinsCount ?? 0, icon: ClipboardCheck, iconBg: 'bg-gradient-to-br from-[#C47D15]/10 to-[#C47D15]/5', iconColor: 'text-[#C47D15]' },
    { href: '/coach/messages', label: 'Ongelezen', value: unreadMessagesCount ?? 0, icon: MessageSquare, iconBg: 'bg-gradient-to-br from-[#3068C4]/10 to-[#3068C4]/5', iconColor: 'text-[#3068C4]' },
    { href: '/coach/clients', label: 'Cliënten', value: activeClientsCount ?? 0, icon: Users, iconBg: 'bg-gradient-to-br from-[#3D8B5C]/10 to-[#3D8B5C]/5', iconColor: 'text-[#3D8B5C]' },
  ]

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-[40px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
          {greeting}, Glenn
        </h1>
        <p className="mt-2.5 text-[15px] text-[#A09D96] tracking-[-0.01em]">{dateFormatted}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, i) => (
          <Link key={card.href} href={card.href}>
            <div className={`card-elevated p-6 cursor-pointer group animate-gentle-rise stagger-${i + 1}`} style={{ animationFillMode: 'both' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#C5C2BC] mb-3 uppercase tracking-[0.08em]">{card.label}</p>
                  <p className="text-[34px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-none">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <card.icon className={`w-[22px] h-[22px] ${card.iconColor}`} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </Link>
        ))}

        <div className="card-elevated p-6 animate-gentle-rise stagger-4" style={{ animationFillMode: 'both' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#C5C2BC] mb-3 uppercase tracking-[0.08em]">MRR</p>
              <p className="text-[34px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-none">€{(mrr / 1000).toFixed(1)}k</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1A1917]/12 to-[#1A1917]/5 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-[22px] h-[22px] text-[#1A1917]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Required */}
      {(recentCheckinsFormatted.length > 0 || recentMessagesFormatted.length > 0 || feedbackSessions.length > 0) && (
        <div>
          <h2 className="text-[22px] font-semibold text-[#1A1917] mb-6 tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
            Actie vereist
          </h2>
          <div className="space-y-5">
            {recentCheckinsFormatted.length > 0 && (
              <div className="card-tactile overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E8E4DC] flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C47D15] shadow-[0_0_6px_rgba(196,125,21,0.3)]" />
                  <p className="text-[14px] font-semibold text-[#1A1917]">Check-ins</p>
                  <span className="text-[12px] text-[#A09D96] ml-auto font-medium">{recentCheckinsFormatted.length} openstaand</span>
                </div>
                {recentCheckinsFormatted.map((checkin, index) => (
                  <Link key={checkin.id} href={`/coach/check-ins/${checkin.id}`}
                    className={`flex items-center justify-between px-6 py-4 hover:bg-[#FAF8F5] transition-all duration-[280ms] group ${index !== recentCheckinsFormatted.length - 1 ? 'border-b border-[#E8E4DC]' : ''}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1A1917] truncate">{checkin.clientName}</p>
                      <PackageBadge tier={checkin.packageTier} size="sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#C5C2BC]">{checkin.timeSince}</span>
                      <ChevronRight className="w-4 h-4 text-[#C5C2BC] group-hover:text-[#1A1917] group-hover:translate-x-0.5 transition-all duration-[280ms]" strokeWidth={1.5} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {recentMessagesFormatted.length > 0 && (
              <div className="card-tactile overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E8E4DC] flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3068C4] shadow-[0_0_6px_rgba(48,104,196,0.3)]" />
                  <p className="text-[14px] font-semibold text-[#1A1917]">Berichten</p>
                  <span className="text-[12px] text-[#A09D96] ml-auto font-medium">{recentMessagesFormatted.length} ongelezen</span>
                </div>
                {recentMessagesFormatted.map((message, index) => (
                  <Link key={message.id} href="/coach/messages"
                    className={`flex items-center justify-between px-6 py-4 hover:bg-[#FAF8F5] transition-all duration-[280ms] group ${index !== recentMessagesFormatted.length - 1 ? 'border-b border-[#E8E4DC]' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1A1917]">{message.clientName}</p>
                      <p className="text-[13px] text-[#A09D96] truncate mt-0.5">{message.preview}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#C5C2BC]">{message.timeSince}</span>
                      <ChevronRight className="w-4 h-4 text-[#C5C2BC] group-hover:text-[#1A1917] group-hover:translate-x-0.5 transition-all duration-[280ms]" strokeWidth={1.5} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {feedbackSessions.length > 0 && (
              <div className="card-tactile overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E8E4DC] flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7B5EA7] shadow-[0_0_6px_rgba(123,94,167,0.3)]" />
                  <p className="text-[14px] font-semibold text-[#1A1917]">Workout Feedback</p>
                  <span className="text-[12px] text-[#A09D96] ml-auto font-medium">{feedbackSessions.length} nieuw</span>
                </div>
                {feedbackSessions.map((session: any, index: number) => (
                  <Link key={session.id} href={`/coach/clients/${session.client_id}`}
                    className={`flex items-center justify-between px-6 py-4 hover:bg-[#FAF8F5] transition-all duration-[280ms] group ${index !== feedbackSessions.length - 1 ? 'border-b border-[#E8E4DC]' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1A1917]">{session.profiles?.full_name || 'Client'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {session.difficulty_rating && <span className={`text-[12px] font-medium ${difficultyColors[session.difficulty_rating] || 'text-[#A09D96]'}`}>{difficultyLabels[session.difficulty_rating]}</span>}
                        {session.feedback_text && <span className="text-[12px] text-[#A09D96] truncate max-w-[200px]">{session.feedback_text.substring(0, 40)}{session.feedback_text.length > 40 ? '...' : ''}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#C5C2BC]">{session.completed_at ? timeSince(session.completed_at) : ''}</span>
                      <ChevronRight className="w-4 h-4 text-[#C5C2BC] group-hover:text-[#1A1917] group-hover:translate-x-0.5 transition-all duration-[280ms]" strokeWidth={1.5} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recentCheckinsFormatted.length === 0 && recentMessagesFormatted.length === 0 && feedbackSessions.length === 0 && (
        <div className="card-elevated p-16 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3D8B5C]/10 to-[#3D8B5C]/5 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-7 h-7 text-[#3D8B5C]" strokeWidth={1.5} />
          </div>
          <h3 className="text-[18px] font-semibold text-[#1A1917] mb-1.5">Alles is in orde</h3>
          <p className="text-[14px] text-[#A09D96]">Geen actie vereist op dit moment.</p>
        </div>
      )}

      <ComplianceWidget />

      {/* Quick Actions */}
      <div>
        <h2 className="text-[22px] font-semibold text-[#1A1917] mb-6 tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
          Snelle acties
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { href: '/coach/programs/new', icon: FileText, label: 'Programma maken', desc: 'Nieuw trainingsprogramma' },
            { href: '/coach/exercises', icon: Dumbbell, label: 'Oefeningen', desc: 'Oefeningenbibliotheek' },
            { href: '/coach/nutrition/new', icon: UtensilsCrossed, label: 'Voedingsplan', desc: 'Plan opstellen' },
            { href: '/coach/messages', icon: MessageSquare, label: 'Berichten', desc: 'Communicatie met cliënten' },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="card-tactile p-5 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EDEAE4] to-[#E5E1D9] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                      <action.icon className="w-[22px] h-[22px] text-[#1A1917]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-[15px] font-medium text-[#1A1917] block">{action.label}</span>
                      <span className="text-[12px] text-[#A09D96] mt-0.5 block">{action.desc}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#C5C2BC] group-hover:text-[#1A1917] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-[280ms]" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
