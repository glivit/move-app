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
  duration: number // minutes
  volume: number // kg
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

        // Fetch workout stats
        const { data: sessions, count } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, workout_sets(weight_kg, actual_reps)', { count: 'exact' })
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })

        setTotalWorkouts(count || 0)

        // Build weekly stats for last 12 weeks
        if (sessions) {
          const weeks: Record<string, WeeklyStats> = {}
          const now = new Date()

          // Initialize last 12 weeks
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i * 7)
            const weekStart = new Date(d)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
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

          // This week minutes
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
      <div className="space-y-4 pb-20">
        <div className="flex flex-col items-center space-y-4 py-6">
          <div className="w-20 h-20 bg-[#F0F0ED] rounded-full animate-pulse" />
          <div className="h-6 w-40 bg-[#F0F0ED] rounded-lg animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#F0F0ED] rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  // Chart data
  const chartData = weeklyStats.map(w => {
    if (chartMode === 'duration') return w.duration
    if (chartMode === 'volume') return Math.round(w.volume / 1000) // in tons
    return w.sets
  })
  const maxVal = Math.max(...chartData, 1)

  const chartLabel = chartMode === 'duration' ? 'minuten' : chartMode === 'volume' ? 'ton' : 'sets'
  const thisWeekVal = chartData.length > 0 ? chartData[chartData.length - 1] : 0

  return (
    <div className="space-y-4 pb-20">
      {/* --- Profile header --- */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#8B6914] text-white flex items-center justify-center text-xl font-semibold flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(profile?.full_name)
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-semibold text-[#1A1A18] truncate">{profile?.full_name || 'Profiel'}</h1>
            <p className="text-[13px] text-[#8E8E93] mt-0.5">Lid sinds {formatMemberSince(profile?.created_at || '')}</p>
          </div>

          <button
            onClick={() => router.push('/client/profile/edit')}
            className="p-2 rounded-full hover:bg-[#F0F0ED] transition-colors"
          >
            <Settings size={20} strokeWidth={1.5} className="text-[#8E8E93]" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="text-center">
            <p className="text-[20px] font-bold text-[#1A1A18]">{totalWorkouts}</p>
            <p className="text-[11px] text-[#8E8E93] uppercase tracking-wider font-medium">Workouts</p>
          </div>
          <div className="text-center border-x border-[#F0F0ED]">
            <p className="text-[20px] font-bold text-[#1A1A18]">
              {weeklyStats.reduce((sum, w) => sum + w.volume, 0) > 1000
                ? `${(weeklyStats.reduce((sum, w) => sum + w.volume, 0) / 1000).toFixed(0)}t`
                : `${weeklyStats.reduce((sum, w) => sum + w.volume, 0)}kg`
              }
            </p>
            <p className="text-[11px] text-[#8E8E93] uppercase tracking-wider font-medium">Volume</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-bold text-[#1A1A18]">
              {weeklyStats.reduce((sum, w) => sum + w.sets, 0)}
            </p>
            <p className="text-[11px] text-[#8E8E93] uppercase tracking-wider font-medium">Sets</p>
          </div>
        </div>
      </div>

      {/* --- Activity chart --- */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-5">
        <div className="flex items-baseline justify-between mb-1">
          <div>
            <p className="text-[22px] font-bold text-[#1A1A18]">
              {thisWeekVal} <span className="text-[13px] font-medium text-[#8E8E93]">{chartLabel}</span>
            </p>
            <p className="text-[12px] text-[#8E8E93]">deze week</p>
          </div>
          <span className="text-[12px] text-[#8E8E93]">Laatste 12 weken</span>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-[3px] h-[100px] mt-3 mb-2">
          {chartData.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className={`w-full rounded-sm transition-all ${
                  i === chartData.length - 1 ? 'bg-[#C8A96E]' : 'bg-[#C8A96E]/40'
                }`}
                style={{ height: `${Math.max((val / maxVal) * 100, 2)}%` }}
              />
            </div>
          ))}
        </div>

        {/* Week labels */}
        <div className="flex gap-[3px]">
          {weeklyStats.map((w, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 3 === 0 && <span className="text-[9px] text-[#BAB8B3]">{w.week}</span>}
            </div>
          ))}
        </div>

        {/* Chart mode tabs */}
        <div className="flex gap-2 mt-3">
          {(['duration', 'volume', 'sets'] as ChartMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                chartMode === mode
                  ? 'bg-[#8B6914] text-white'
                  : 'bg-[#F0F0ED] text-[#8E8E93] hover:bg-[#E8E8E5]'
              }`}
            >
              {mode === 'duration' ? 'Duur' : mode === 'volume' ? 'Volume' : 'Sets'}
            </button>
          ))}
        </div>
      </div>

      {/* --- Dashboard tiles --- */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/client/progress')}
          className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
        >
          <TrendingUp size={22} strokeWidth={1.5} className="text-[#8B6914] mb-2" />
          <p className="text-[14px] font-semibold text-[#1A1A18]">Statistieken</p>
        </button>
        <button
          onClick={() => router.push('/client/workout/history')}
          className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
        >
          <Dumbbell size={22} strokeWidth={1.5} className="text-[#8B6914] mb-2" />
          <p className="text-[14px] font-semibold text-[#1A1A18]">Oefeningen</p>
        </button>
        <button
          onClick={() => router.push('/client/check-in')}
          className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
        >
          <BarChart3 size={22} strokeWidth={1.5} className="text-[#8B6914] mb-2" />
          <p className="text-[14px] font-semibold text-[#1A1A18]">Metingen</p>
        </button>
        <button
          onClick={() => router.push('/client/workout/history')}
          className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
        >
          <Calendar size={22} strokeWidth={1.5} className="text-[#8B6914] mb-2" />
          <p className="text-[14px] font-semibold text-[#1A1A18]">Kalender</p>
        </button>
      </div>

      {/* --- Settings groups --- */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] divide-y divide-[#F0F0ED]">
        <a href="/client/profile/edit" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <User size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Persoonlijke gegevens</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
        <a href="/client/profile/notifications" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <Bell size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Meldingen</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
        <a href="/client/profile/goals" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <Target size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Mijn doelen</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
        <a href="/client/profile/diet" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <UtensilsCrossed size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Voedingsvoorkeuren</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
        <a href="/client/profile/health" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Blessures & beperkingen</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] divide-y divide-[#F0F0ED]">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <CreditCard size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Pakket</span>
          </div>
          <span className="text-[13px] font-semibold text-[#8B6914]">{profile?.package?.toUpperCase() || 'STANDAARD'}</span>
        </div>
        <a href="/client/profile/invoices" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <Receipt size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Facturen</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
        <a href="/client/profile/help" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <HelpCircle size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Help & FAQ</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
        <a href="/client/profile/privacy" className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8F8F6] transition-colors">
          <div className="flex items-center gap-3">
            <Shield size={18} strokeWidth={1.5} className="text-[#8B6914]" />
            <span className="text-[14px] text-[#1A1A18]">Privacy beleid</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[#C7C7CC]" />
        </a>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={signingOut}
        className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] px-5 py-3.5 flex items-center justify-center gap-2 text-[#FF3B30] font-semibold text-[14px] hover:bg-[#FFF5F5] transition-colors disabled:opacity-50"
      >
        <LogOut size={18} strokeWidth={1.5} />
        {signingOut ? 'Afmelden...' : 'Afmelden'}
      </button>

      <p className="text-center text-[11px] text-[#C7C7CC]">MŌVE v1.0.0</p>
    </div>
  )
}
