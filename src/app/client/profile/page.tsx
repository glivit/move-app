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
  ChevronRight,
  LogOut,
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

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

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

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, package, created_at, avatar_url')
          .eq('id', user.id)
          .single()

        if (profileData) setProfile(profileData)
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
        <div className="flex flex-col items-center py-12">
          <div className="w-20 h-20 bg-[#E5E1D9] rounded-full animate-pulse" />
          <div className="h-6 w-40 bg-[#E5E1D9] mt-4 animate-pulse" />
        </div>
      </div>
    )
  }

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
      <div className="flex flex-col items-center pt-8 pb-8 border-b border-[#E8E4DC]">
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
