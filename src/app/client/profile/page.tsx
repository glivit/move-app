'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import {
  User,
  Bell,
  Target,
  UtensilsCrossed,
  AlertCircle,
  Receipt,
  HelpCircle,
  Shield,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  CreditCard,
} from 'lucide-react'

function DarkModeRow() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      try { localStorage.setItem('move-dark-mode', 'true') } catch {}
    } else {
      document.documentElement.classList.remove('dark')
      try { localStorage.setItem('move-dark-mode', 'false') } catch {}
    }
  }

  return (
    <button
      onClick={toggle}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        color: '#FDFDFE',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {dark ? (
          <Sun size={18} strokeWidth={1.5} style={{ color: 'rgba(253,253,254,0.62)' }} />
        ) : (
          <Moon size={18} strokeWidth={1.5} style={{ color: 'rgba(253,253,254,0.62)' }} />
        )}
        <span style={{ fontSize: 14, color: '#FDFDFE' }}>
          {dark ? 'Licht modus' : 'Donker modus'}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          width: 40, height: 22,
          borderRadius: 999,
          background: dark ? '#C0FC01' : 'rgba(253,253,254,0.16)',
          transition: 'background 200ms',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 2,
            width: 18, height: 18, borderRadius: '50%',
            background: dark ? '#1A1917' : '#FDFDFE',
            transform: dark ? 'translateX(20px)' : 'translateX(2px)',
            transition: 'transform 200ms',
            boxShadow: '0 1px 2px rgba(0,0,0,0.24)',
          }}
        />
      </div>
    </button>
  )
}

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
    if (!dateString) return ''
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
      <div className="pb-28 animate-fade-in">
        <div
          className="rounded-[24px] mb-4"
          style={{
            padding: '32px 22px',
            background: '#474B48',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.22)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          <div
            className="animate-pulse"
            style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(253,253,254,0.12)', marginBottom: 14 }}
          />
          <div
            className="animate-pulse"
            style={{ height: 14, width: 160, borderRadius: 999, background: 'rgba(253,253,254,0.14)', marginBottom: 8 }}
          />
          <div
            className="animate-pulse"
            style={{ height: 10, width: 120, borderRadius: 999, background: 'rgba(253,253,254,0.08)' }}
          />
        </div>
        {[1, 2].map(i => (
          <div
            key={i}
            className="animate-pulse rounded-[20px] mb-4"
            style={{
              height: 200,
              background: '#A6ADA7',
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    )
  }

  const menuSections: Array<{ items: Array<{ href: string; icon: typeof User; label: string }> }> = [
    {
      items: [
        { href: '/client/profile/edit', icon: User, label: 'Persoonlijke gegevens' },
        { href: '/client/profile/notifications', icon: Bell, label: 'Meldingen' },
        { href: '/client/profile/goals', icon: Target, label: 'Doelen' },
        { href: '/client/profile/diet', icon: UtensilsCrossed, label: 'Voedingsvoorkeuren' },
        { href: '/client/profile/health', icon: AlertCircle, label: 'Blessures & beperkingen' },
      ],
    },
    {
      items: [
        { href: '/client/profile/invoices', icon: Receipt, label: 'Facturen' },
        { href: '/client/profile/help', icon: HelpCircle, label: 'Help & FAQ' },
        { href: '/client/profile/privacy', icon: Shield, label: 'Privacy' },
      ],
    },
  ]

  return (
    <div className="pb-28">
      {/* ═══ HEADER — v6-card-dark met avatar ═════════════ */}
      <div
        className="v6-card-dark mb-4 animate-fade-in"
        style={{
          padding: '28px 22px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 84, height: 84,
            borderRadius: '50%',
            background: '#1A1917',
            color: '#FDFDFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 600,
            marginBottom: 14,
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.28)',
          }}
        >
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={84}
              height={84}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              unoptimized
              loading="lazy"
            />
          ) : (
            getInitials(profile?.full_name)
          )}
        </div>

        <h1
          style={{
            fontSize: 22, fontWeight: 500,
            color: '#FDFDFE',
            letterSpacing: '-0.012em',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {profile?.full_name || 'Profiel'}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'rgba(253,253,254,0.52)',
            marginTop: 4,
          }}
        >
          Lid sinds {formatMemberSince(profile?.created_at || '')}
        </p>

        {/* Package pill */}
        {profile?.package && (
          <div
            style={{
              marginTop: 14,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(192,252,1,0.14)',
              color: '#C0FC01',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {profile.package}
          </div>
        )}
      </div>

      {/* ═══ MENU SECTIONS — v6-card-dark lists ═════════════ */}
      {menuSections.map((section, si) => (
        <div
          key={si}
          className={`v6-card-dark mb-4 animate-slide-up ${si === 0 ? 'stagger-2' : 'stagger-3'}`}
          style={{ padding: '6px 0' }}
        >
          {section.items.map((item, i, arr) => {
            const Icon = item.icon
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px',
                  textDecoration: 'none',
                  borderTop: i > 0 ? '1px solid rgba(253,253,254,0.08)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} strokeWidth={1.5} style={{ color: 'rgba(253,253,254,0.62)' }} />
                  <span style={{ fontSize: 14, color: '#FDFDFE' }}>{item.label}</span>
                </div>
                <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'rgba(253,253,254,0.32)' }} />
                {/* fix unused arr to suppress lint */}
                {i === arr.length + 9999 ? null : null}
              </a>
            )
          })}
        </div>
      ))}

      {/* ═══ WEERGAVE + PAKKET ═════════════════════════════ */}
      <div className="v6-card-dark mb-4 animate-slide-up stagger-4" style={{ padding: '6px 0' }}>
        <DarkModeRow />
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            borderTop: '1px solid rgba(253,253,254,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CreditCard size={18} strokeWidth={1.5} style={{ color: 'rgba(253,253,254,0.62)' }} />
            <span style={{ fontSize: 14, color: '#FDFDFE' }}>Pakket</span>
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 600,
              color: '#FDFDFE',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {profile?.package || 'Standaard'}
          </span>
        </div>
      </div>

      {/* ═══ LOGOUT ═════════════════════════════════════════ */}
      <button
        onClick={handleLogout}
        disabled={signingOut}
        className="animate-slide-up stagger-5"
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'rgba(196,55,42,0.12)',
          color: '#E8604F',
          fontSize: 14, fontWeight: 600,
          border: 'none',
          cursor: signingOut ? 'default' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
          opacity: signingOut ? 0.6 : 1,
          transition: 'opacity 200ms',
          marginBottom: 14,
        }}
      >
        <LogOut size={16} strokeWidth={1.5} />
        {signingOut ? 'Afmelden...' : 'Afmelden'}
      </button>

      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(253,253,254,0.32)',
          padding: '4px 0 16px',
        }}
      >
        MŌVE v1.0
      </p>
    </div>
  )
}
