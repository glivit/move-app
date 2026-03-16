'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  User,
  Bell,
  Target,
  UtensilsCrossed,
  AlertCircle,
  CreditCard,
  Receipt,
  HelpCircle,
  Shield,
  Info,
  ChevronRight,
  LogOut,
  Dumbbell,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  ChevronDown,
  ArrowRight,
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  package: string
  created_at: string
  avatar_url?: string
}

interface WeeklyStats {
  week: string
  duration: number
  volume: number
  sets: number
}

type ChartMode = 'duration' | 'volume' | 'sets'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [chartMode, setChartMode] = useState<ChartMode>('duration')
  const [thisWeekMinutes, setThisWeekMinutes] = useState(0)

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString)
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/'); return }

        setUserEmail(user.email || null)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, package, created_at, avatar_url')
          .eq('id', user.id)
          .single()

        if (profileData) setProfile(profileData)

        const { data: sessions, count } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, workout_sets(weight_kg, actual_reps)', { count: 'exact' })
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })

        setTotalWorkouts(count || 0)

        if (sessions) {
          const weeks: Record<string, WeeklyStats> = {}
          const now = new Date()

          for (let i = 11; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i * 7)
            const weekStart = new Date(d)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
            const key = weekStart.toISOString().slice(0, 10)
            const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
            weeks[key] = { week: label, duration: 0, volume: 0, sets: 0 }
          }

          for (const s of sessions as any[]) {
            const date = new Date(s.started_at)
            const weekStart = new Date(date)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
            const key = weekStart.toISOString().slice(0, 10)

            if (weeks[key]) {
              weeks[key].duration += Math.round((s.duration_seconds || 0) / 60)
              const sets = s.workout_sets || []
              weeks[key].sets += sets.length
              for (const set of sets) {
                weeks[key].volume += (set.weight_kg || 0) * (set.actual_reps || 0)
              }
            }
          }

          const statsArr = Object.values(weeks)
          setWeeklyStats(statsArr)

          if (statsArr.length > 0) {
            setThisWeekMinutes(statsArr[statsArr.length - 1].duration)
          }
        }
      } catch (err) {
        console.error('Profile load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase, router])

  const handleLogout = async () => {
    try {
      setSigningOut(true)
      await supabase.auth.signOut()
      router.replace('/')
    } catch (err) {
      console.error('Logout error:', err)
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="pb-28">
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 bg-[#E5E1D9] rounded-full animate-pulse" />
          <div className="h-6 w-40 bg-[#E5E1D9] mt-4 animate-pulse" />
        </div>
      </div>
    )
  }

  // Chart
  const chartData = weeklyStats.map(w => {
    if (chartMode === 'duration') return w.duration
    if (chartMode === 'volume') return Math.round(w.volume / 1000)
    return w.sets
  })
  const maxVal = Math.max(...chartData, 1)
  const chartLabel = chartMode === 'duration' ? 'min' : chartMode === 'volume' ? 'ton' : 'sets'
  const thisWeekVal = chartData.length > 0 ? chartData[chartData.length - 1] : 0

  const menuSections = [
    {
      items: [
        { href: '/client/profile/edit', icon: User, label: 'Persoonlijke gegevens' },
        { href: '/client/profile/notifications', icon: Bell, label: 'Meldingen' },
        { href: '/client/profile/goals', icon: Target, label: 'Doelen' },
        { href: '/client/profile/diet', icon: UtensilsCrossed, label: 'Voedingsvoorkeuren' },
        { href: '/client/profile/health', icon: AlertCircle, label: 'Blessures & beperkingen' },
      ]
    },
    {
      items: [
        { href: '/client/profile/invoices', icon: Receipt, label: 'Facturen' },
        { href: '/client/profile/help', icon: HelpCircle, label: 'Help & FAQ' },
        { href: '/client/profile/privacy', icon: Shield, label: 'Privacy' },
      ]
    },
  ]

  return (
    <div className="pb-28">

      {/* ═══ PROFILE HEADER — editorial, centered ═══════ */}
      <div className="flex flex-col items-center pt-4 pb-8">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-[#1A1917] text-white flex items-center justify-center text-[22px] font-semibold mb-4 overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            getInitials(profile?.full_name)
          )}
        </div>

        <h1
          className="text-[24px] font-semibold text-[#1A1917] tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {profile?.full_name || 'Profiel'}
        </h1>
        <p className="text-[13px] text-[#A09D96] mt-1">
          Lid sinds {formatMemberSince(profile?.created_at || '')}
        </p>
      </div>

      {/* ═══ STATS — editorial numbers ═══════════════════ */}
      <div className="flex justify-center gap-10 pb-8 border-b border-[#E8E4DC]">
        <div className="text-center">
          <p className="text-[24px] font-bold text-[#1A1917]">{totalWorkouts}</p>
          <p className="text-label mt-1">Workouts</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-bold text-[#1A1917]">
            {weeklyStats.reduce((sum, w) => sum + w.volume, 0) > 1000
              ? `${(weeklyStats.reduce((sum, w) => sum + w.volume, 0) / 1000).toFixed(0)}t`
              : `${weeklyStats.reduce((sum, w) => sum + w.volume, 0)}kg`
            }
          </p>
          <p className="text-label mt-1">Volume</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-bold text-[#1A1917]">
            {weeklyStats.reduce((sum, w) => sum + w.sets, 0)}
          </p>
          <p className="text-label mt-1">Sets</p>
        </div>
      </div>

      {/* ═══ ACTIVITY CHART ═════════════════════════════ */}
      <div className="py-6 border-b border-[#E8E4DC]">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <span className="text-[28px] font-bold text-[#1A1917]">{thisWeekVal}</span>
            <span className="text-[14px] text-[#A09D96] ml-1">{chartLabel} deze week</span>
          </div>
          <span className="text-[12px] text-[#C5C2BC]">12 weken</span>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-[3px] h-[80px] mb-2">
          {chartData.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className={`w-full transition-all ${
                  i === chartData.length - 1 ? 'bg-[#1A1917]' : 'bg-[#DDD9D0]'
                }`}
                style={{ height: `${Math.max((val / maxVal) * 100, 3)}%` }}
              />
            </div>
          ))}
        </div>

        {/* Week labels */}
        <div className="flex gap-[3px] mb-4">
          {weeklyStats.map((w, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 4 === 0 && <span className="text-[9px] text-[#C5C2BC]">{w.week}</span>}
            </div>
          ))}
        </div>

        {/* Mode toggles */}
        <div className="flex gap-1">
          {(['duration', 'volume', 'sets'] as ChartMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className={`px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] transition-all ${
                chartMode === mode
                  ? 'bg-[#1A1917] text-white'
                  : 'text-[#A09D96] hover:text-[#1A1917]'
              }`}
            >
              {mode === 'duration' ? 'Duur' : mode === 'volume' ? 'Volume' : 'Sets'}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ QUICK LINKS — editorial grid ═══════════════ */}
      <div className="grid grid-cols-2 border-b border-[#E8E4DC]">
        <button
          onClick={() => router.push('/client/progress')}
          className="flex flex-col items-start p-5 border-r border-b border-[#E8E4DC] hover:bg-[#FAF8F3] transition-colors"
        >
          <TrendingUp size={20} strokeWidth={1.5} className="text-[#A09D96] mb-3" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Statistieken</span>
        </button>
        <button
          onClick={() => router.push('/client/workout/history')}
          className="flex flex-col items-start p-5 border-b border-[#E8E4DC] hover:bg-[#FAF8F3] transition-colors"
        >
          <Dumbbell size={20} strokeWidth={1.5} className="text-[#A09D96] mb-3" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Oefeningen</span>
        </button>
        <button
          onClick={() => router.push('/client/check-in')}
          className="flex flex-col items-start p-5 border-r border-[#E8E4DC] hover:bg-[#FAF8F3] transition-colors"
        >
          <BarChart3 size={20} strokeWidth={1.5} className="text-[#A09D96] mb-3" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Metingen</span>
        </button>
        <button
          onClick={() => router.push('/client/workout/history')}
          className="flex flex-col items-start p-5 hover:bg-[#FAF8F3] transition-colors"
        >
          <Calendar size={20} strokeWidth={1.5} className="text-[#A09D96] mb-3" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Kalender</span>
        </button>
      </div>

      {/* ═══ SETTINGS — editorial list ═══════════════════ */}
      {menuSections.map((section, si) => (
        <div key={si} className={si > 0 ? 'border-t-8 border-[#EEEBE3]' : ''}>
          {section.items.map((item, i) => {
            const Icon = item.icon
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-6 py-4 hover:bg-[#FAF8F3] transition-colors ${
                  i > 0 ? 'border-t border-[#F0EDE8]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} strokeWidth={1.5} className="text-[#A09D96]" />
                  <span className="text-[14px] text-[#1A1917]">{item.label}</span>
                </div>
                <ChevronRight size={16} strokeWidth={1.5} className="text-[#CCC7BC]" />
              </a>
            )
          })}
        </div>
      ))}

      {/* Pakket */}
      <div className="border-t-8 border-[#EEEBE3]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <CreditCard size={18} strokeWidth={1.5} className="text-[#A09D96]" />
            <span className="text-[14px] text-[#1A1917]">Pakket</span>
          </div>
          <span className="text-[13px] font-semibold text-[#1A1917] uppercase tracking-[0.04em]">{profile?.package || 'Standaard'}</span>
        </div>
      </div>

      {/* Logout */}
      <div className="border-t-8 border-[#EEEBE3] mb-4">
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="w-full px-6 py-4 flex items-center justify-center gap-2 text-[#C4372A] font-semibold text-[14px] hover:bg-[#FFF5F5] transition-colors disabled:opacity-50"
        >
          <LogOut size={16} strokeWidth={1.5} />
          {signingOut ? 'Afmelden...' : 'Afmelden'}
        </button>
      </div>

      <p className="text-center text-[11px] text-[#C5C2BC] pb-4">MŌVE v1.0</p>
    </div>
  )
}
