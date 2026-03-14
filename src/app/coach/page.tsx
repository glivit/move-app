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
  AlertTriangle,
} from 'lucide-react'

// Helper function to get time-based greeting
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

// Helper function to format date in Dutch
function formatDateDutch(date: Date) {
  return date.toLocaleDateString('nl-BE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Helper function to calculate time since
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

// Helper to get start of current week
function getWeekStart() {
  const today = new Date()
  const first = today.getDate() - today.getDay() + 1
  return new Date(today.setDate(first))
}

interface CheckInWithClient {
  id: string
  date: string
  coach_reviewed: boolean
  client_id: string
  profiles: {
    full_name: string
    package: string
  } | null
}

interface MessageWithClient {
  id: string
  content: string
  created_at: string
  sender_id: string
  read_at: string | null
  profiles: {
    full_name: string
  } | null
}

interface ClientWithCompliance {
  id: string
  full_name: string
  package: string | null
  client_programs: Array<{
    id: string
    is_active: boolean
  }> | null
}

export default async function CoachDashboard() {
  const supabase = await createServerSupabaseClient()

  // Get authenticated coach user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F8F5] px-5 py-10 flex items-center justify-center">
        <p className="text-[#6E6E73]">Niet ingelogd</p>
      </div>
    )
  }

  // Fetch all required data
  const [
    { count: pendingCheckinsCount },
    { count: unreadMessagesCount },
    { count: activeClientsCount },
    { data: recentCheckinsData },
    { data: recentMessagesData },
    { data: clientsData },
    { data: feedbackData },
  ] = await Promise.all([
    // Pending check-ins
    supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('coach_reviewed', false),

    // Unread messages for coach
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null),

    // Active clients
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client'),

    // Recent pending check-ins with client info
    supabase
      .from('checkins')
      .select(
        `
        id,
        date,
        coach_reviewed,
        client_id,
        profiles!checkins_client_id_fkey(full_name, package)
      `
      )
      .eq('coach_reviewed', false)
      .order('date', { ascending: false })
      .limit(5),

    // Recent unread messages with client info
    supabase
      .from('messages')
      .select(
        `
        id,
        content,
        created_at,
        sender_id,
        read_at,
        profiles!messages_sender_id_fkey(full_name)
      `
      )
      .eq('receiver_id', user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(5),

    // All clients for MRR calculation and compliance
    supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        package,
        client_programs!client_programs_client_id_fkey(id, is_active)
      `
      )
      .eq('role', 'client'),

    // Unreviewed workout feedback
    supabase
      .from('workout_sessions')
      .select(`
        id, client_id, completed_at, difficulty_rating, feedback_text, mood_rating,
        profiles!workout_sessions_client_id_fkey(full_name)
      `)
      .not('completed_at', 'is', null)
      .eq('coach_seen', false)
      .order('completed_at', { ascending: false })
      .limit(5),
  ])

  // Calculate MRR
  const packagePrices: Record<string, number> = {
    essential: 297,
    performance: 497,
    elite: 797,
  }

  const mrr = (clientsData || []).reduce(
    (sum, client) => sum + (packagePrices[client.package || 'essential'] || 0),
    0
  )

  // Format recent check-ins
  const recentCheckinsFormatted = (recentCheckinsData as CheckInWithClient[] | null)?.map((checkin) => ({
    id: checkin.id,
    date: checkin.date,
    clientName: checkin.profiles?.full_name || 'Onbekende cliënt',
    packageTier: (checkin.profiles?.package || 'essential') as 'essential' | 'performance' | 'elite',
    timeSince: timeSince(checkin.date),
  })) || []

  // Format recent messages
  const recentMessagesFormatted = (recentMessagesData as MessageWithClient[] | null)?.map((message) => ({
    id: message.id,
    preview: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
    clientName: message.profiles?.full_name || 'Onbekende cliënt',
    timeSince: timeSince(message.created_at),
  })) || []

  // Filter feedback sessions that actually have content
  const feedbackSessions = (feedbackData || []).filter((s: any) =>
    s.difficulty_rating || s.feedback_text || s.mood_rating
  )

  const difficultyLabels: Record<number, string> = {
    1: 'Te makkelijk', 2: 'Makkelijk', 3: 'Perfect', 4: 'Zwaar', 5: 'Te zwaar'
  }
  const difficultyColors: Record<number, string> = {
    1: 'text-[#3478F6]', 2: 'text-[#2D9D4E]', 3: 'text-[#8B6914]', 4: 'text-[#E68A00]', 5: 'text-[#D93025]'
  }

  const today = new Date()
  const greeting = getGreeting()
  const dateFormatted = formatDateDutch(today)

  return (
    <div className="space-y-10">
      {/* Greeting Section — editorial, generous spacing */}
      <div className="pt-2">
        <h1
          className="text-[36px] font-semibold text-[#1A1A18] tracking-[-0.03em] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {greeting}, Glenn
        </h1>
        <p className="mt-2 text-[15px] text-[#6E6E73] tracking-[-0.01em]">{dateFormatted}</p>
      </div>

      {/* KPI Cards Grid — refined, subtle */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Te reviewen */}
        <Link href="/coach/check-ins">
          <div className="group bg-white rounded-2xl p-6 border border-[#ECEAE5] hover:border-[#E0DDD7] transition-all duration-[280ms] cursor-pointer hover:shadow-[0_4px_16px_rgba(26,26,24,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#AEAEB2] mb-3 uppercase tracking-[0.06em]">Te reviewen</p>
                <p className="text-[32px] font-semibold text-[#1A1A18] tracking-[-0.02em] leading-none">
                  {pendingCheckinsCount ?? 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#E68A00]/8 flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-5 h-5 text-[#E68A00]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Link>

        {/* Ongelezen berichten */}
        <Link href="/coach/messages">
          <div className="group bg-white rounded-2xl p-6 border border-[#ECEAE5] hover:border-[#E0DDD7] transition-all duration-[280ms] cursor-pointer hover:shadow-[0_4px_16px_rgba(26,26,24,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#AEAEB2] mb-3 uppercase tracking-[0.06em]">Ongelezen</p>
                <p className="text-[32px] font-semibold text-[#1A1A18] tracking-[-0.02em] leading-none">
                  {unreadMessagesCount ?? 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#3478F6]/8 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-[#3478F6]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Link>

        {/* Actieve cliënten */}
        <Link href="/coach/clients">
          <div className="group bg-white rounded-2xl p-6 border border-[#ECEAE5] hover:border-[#E0DDD7] transition-all duration-[280ms] cursor-pointer hover:shadow-[0_4px_16px_rgba(26,26,24,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#AEAEB2] mb-3 uppercase tracking-[0.06em]">Cliënten</p>
                <p className="text-[32px] font-semibold text-[#1A1A18] tracking-[-0.02em] leading-none">
                  {activeClientsCount ?? 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#2D9D4E]/8 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-[#2D9D4E]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Link>

        {/* MRR */}
        <div className="bg-white rounded-2xl p-6 border border-[#ECEAE5]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#AEAEB2] mb-3 uppercase tracking-[0.06em]">MRR</p>
              <p className="text-[32px] font-semibold text-[#1A1A18] tracking-[-0.02em] leading-none">
                €{(mrr / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#F8F5ED] flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#8B6914]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Required Section */}
      {(recentCheckinsFormatted.length > 0 || recentMessagesFormatted.length > 0 || feedbackSessions.length > 0) && (
        <div>
          <h2
            className="text-[20px] font-semibold text-[#1A1A18] mb-5 tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Actie vereist
          </h2>

          <div className="space-y-5">
            {/* Pending Check-ins */}
            {recentCheckinsFormatted.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#ECEAE5] overflow-hidden">
                <div className="px-6 py-3.5 border-b border-[#ECEAE5] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#E68A00]" />
                  <p className="text-[13px] font-semibold text-[#1A1A18] tracking-[-0.01em]">Check-ins</p>
                  <span className="text-[12px] text-[#AEAEB2] ml-auto">{recentCheckinsFormatted.length} openstaand</span>
                </div>
                {recentCheckinsFormatted.map((checkin, index) => (
                  <Link
                    key={checkin.id}
                    href={`/coach/check-ins/${checkin.id}`}
                    className={`flex items-center justify-between px-6 py-4 hover:bg-[#F9F8F5] transition-colors duration-[280ms] group ${
                      index !== recentCheckinsFormatted.length - 1 ? 'border-b border-[#ECEAE5]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1A1A18] truncate tracking-[-0.01em]">{checkin.clientName}</p>
                      <PackageBadge tier={checkin.packageTier} size="sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#AEAEB2]">{checkin.timeSince}</span>
                      <ChevronRight className="w-4 h-4 text-[#AEAEB2] group-hover:text-[#8B6914] transition-colors duration-[280ms] flex-shrink-0" strokeWidth={1.5} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Unread Messages */}
            {recentMessagesFormatted.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#ECEAE5] overflow-hidden">
                <div className="px-6 py-3.5 border-b border-[#ECEAE5] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3478F6]" />
                  <p className="text-[13px] font-semibold text-[#1A1A18] tracking-[-0.01em]">Berichten</p>
                  <span className="text-[12px] text-[#AEAEB2] ml-auto">{recentMessagesFormatted.length} ongelezen</span>
                </div>
                {recentMessagesFormatted.map((message, index) => (
                  <Link
                    key={message.id}
                    href="/coach/messages"
                    className={`flex items-center justify-between px-6 py-4 hover:bg-[#F9F8F5] transition-colors duration-[280ms] group ${
                      index !== recentMessagesFormatted.length - 1 ? 'border-b border-[#ECEAE5]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-[#1A1A18] tracking-[-0.01em]">{message.clientName}</p>
                        <p className="text-[13px] text-[#AEAEB2] truncate mt-0.5">{message.preview}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#AEAEB2]">{message.timeSince}</span>
                      <ChevronRight className="w-4 h-4 text-[#AEAEB2] group-hover:text-[#8B6914] transition-colors duration-[280ms] flex-shrink-0" strokeWidth={1.5} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Workout Feedback */}
            {feedbackSessions.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#ECEAE5] overflow-hidden">
                <div className="px-6 py-3.5 border-b border-[#ECEAE5] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#9B59B6]" />
                  <p className="text-[13px] font-semibold text-[#1A1A18] tracking-[-0.01em]">Workout Feedback</p>
                  <span className="text-[12px] text-[#AEAEB2] ml-auto">{feedbackSessions.length} nieuw</span>
                </div>
                {feedbackSessions.map((session: any, index: number) => (
                  <Link
                    key={session.id}
                    href={`/coach/clients/${session.client_id}`}
                    className={`flex items-center justify-between px-6 py-4 hover:bg-[#F9F8F5] transition-colors duration-[280ms] group ${
                      index !== feedbackSessions.length - 1 ? 'border-b border-[#ECEAE5]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-[#1A1A18] tracking-[-0.01em]">{session.profiles?.full_name || 'Client'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {session.difficulty_rating && (
                            <span className={`text-[12px] font-medium ${difficultyColors[session.difficulty_rating] || 'text-[#AEAEB2]'}`}>
                              {difficultyLabels[session.difficulty_rating]}
                            </span>
                          )}
                          {session.feedback_text && (
                            <span className="text-[12px] text-[#AEAEB2] truncate max-w-[200px]">
                              {session.feedback_text.substring(0, 40)}{session.feedback_text.length > 40 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#AEAEB2]">{session.completed_at ? timeSince(session.completed_at) : ''}</span>
                      <ChevronRight className="w-4 h-4 text-[#AEAEB2] group-hover:text-[#8B6914] transition-colors duration-[280ms] flex-shrink-0" strokeWidth={1.5} />
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
        <div className="bg-white rounded-2xl p-14 border border-[#ECEAE5] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#2D9D4E]/8 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-6 h-6 text-[#2D9D4E]" strokeWidth={1.5} />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-1.5 tracking-[-0.01em]">Alles is in orde</h3>
          <p className="text-[14px] text-[#AEAEB2]">Geen actie vereist op dit moment.</p>
        </div>
      )}

      {/* Compliance Widget */}
      <ComplianceWidget />

      {/* Quick Actions */}
      <div>
        <h2
          className="text-[20px] font-semibold text-[#1A1A18] mb-5 tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Snelle acties
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { href: '/coach/programs/new', icon: FileText, label: 'Programma maken' },
            { href: '/coach/exercises', icon: Dumbbell, label: 'Oefeningen' },
            { href: '/coach/nutrition/new', icon: UtensilsCrossed, label: 'Voedingsplan' },
            { href: '/coach/messages', icon: MessageSquare, label: 'Berichten' },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="bg-white rounded-2xl p-5 border border-[#ECEAE5] hover:border-[#E0DDD7] hover:shadow-[0_4px_16px_rgba(26,26,24,0.06)] transition-all duration-[280ms] cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#F8F5ED] flex items-center justify-center">
                      <action.icon className="w-5 h-5 text-[#8B6914]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[15px] font-medium text-[#1A1A18] tracking-[-0.01em]">{action.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#AEAEB2] group-hover:text-[#8B6914] transition-colors duration-[280ms]" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
