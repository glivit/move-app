'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { signOut } from '@/lib/auth'

/**
 * Coach · Profiel (v3 Orion).
 *
 * Eerst miste deze route → /coach/profile gaf 404 vanuit Studio. Deze page
 * vult dat gat met een compacte account-kaart: naam/email/avatar + shortcuts
 * naar Facturatie/Integraties/Beschikbaarheid + uitloggen.
 *
 * Bewust client-side zodat we auth.getUser() en auth.signOut() direct uit
 * de browser kunnen gebruiken — matcht het pattern van /client/profile.
 */

// ─── Tokens (v3 Orion) ────────────────────────────────────────
const INK = '#FDFDFE'
const INK_MUTED = 'rgba(253,253,254,0.62)'
const INK_DIM = 'rgba(253,253,254,0.40)'
const HAIR = 'rgba(253,253,254,0.08)'
const CARD = '#474B48'
const AMBER = '#E8A93C'

// ─── Types ────────────────────────────────────────────────────
interface CoachProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
  created_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────
function getInitials(name?: string | null) {
  if (!name) return 'C'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function formatMemberSince(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
  ]
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Icon helpers ─────────────────────────────────────────────
const icoStyle = 'h-[15px] w-[15px] stroke-[1.6] fill-none'

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function IconBilling() {
  return (
    <svg viewBox="0 0 24 24" className={icoStyle} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}
function IconIntegrations() {
  return (
    <svg viewBox="0 0 24 24" className={icoStyle} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 2v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className={icoStyle} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className={icoStyle} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}
function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" className={icoStyle} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9a2 2 0 1 1 3 1.5c-1 0.5-1 1.5-1 2" />
      <line x1="12" y1="16" x2="12" y2="16.01" />
    </svg>
  )
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" className={icoStyle} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <polyline points="14 17 19 12 14 7" />
      <line x1="19" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function IconChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" stroke="rgba(253,253,254,0.44)" strokeWidth="1.8" fill="none">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}

// ─── Row primitives — v3 Orion ────────────────────────────────
function SetRow({
  href, label, value, icon, last,
}: {
  href: string
  label: string
  value?: string
  icon: React.ReactNode
  last?: boolean
}) {
  return (
    <Link
      href={href}
      className={`grid grid-cols-[30px_1fr_auto_14px] items-center gap-[14px] px-[18px] py-[14px] hover:bg-[rgba(253,253,254,0.03)] transition-colors ${
        last ? '' : 'border-b'
      }`}
      style={{ borderColor: HAIR }}
    >
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[rgba(253,253,254,0.06)]" style={{ color: INK }}>
        {icon}
      </span>
      <span className="text-[14px] tracking-[-0.005em]" style={{ color: INK }}>{label}</span>
      <span className="whitespace-nowrap text-[12px] tracking-[0.01em] truncate max-w-[160px]" style={{ color: INK_MUTED }}>
        {value || ''}
      </span>
      <span className="text-[15px] leading-none" style={{ color: INK_DIM }}>›</span>
    </Link>
  )
}

function SetRowButton({
  onClick, disabled, label, icon, last, accent,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  icon: React.ReactNode
  last?: boolean
  accent?: string
}) {
  const color = accent || INK
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`grid w-full grid-cols-[30px_1fr_auto_14px] items-center gap-[14px] px-[18px] py-[14px] text-left hover:bg-[rgba(253,253,254,0.03)] transition-colors disabled:opacity-60 disabled:cursor-default ${
        last ? '' : 'border-b'
      }`}
      style={{ borderColor: HAIR }}
    >
      <span
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px]"
        style={{
          background: accent ? `${accent}22` : 'rgba(253,253,254,0.06)',
          color,
        }}
      >
        {icon}
      </span>
      <span className="text-[14px] tracking-[-0.005em]" style={{ color }}>{label}</span>
      <span />
      <IconChevron />
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-[26px] mb-[10px] px-[2px] text-[11px] uppercase tracking-[0.18em] first-of-type:mt-[8px]"
      style={{ color: INK_DIM }}
    >
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export default function CoachProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/')
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url, created_at')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        setProfile({
          id: user.id,
          full_name: data?.full_name ?? null,
          email: user.email ?? null,
          role: data?.role ?? null,
          avatar_url: data?.avatar_url ?? null,
          created_at: data?.created_at ?? null,
        })
      } catch (err) {
        console.error('[coach/profile] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [supabase, router])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      router.replace('/')
    } catch (err) {
      console.error('[coach/profile] signout failed', err)
      setSigningOut(false)
    }
  }

  const memberSince = formatMemberSince(profile?.created_at)

  return (
    <div className="min-h-screen bg-[#8E9890] text-[#FDFDFE] pb-[110px]">
      <div className="mx-auto max-w-[420px] md:max-w-[600px] lg:max-w-[760px] px-[22px]">
        {/* Back-chip */}
        <div className="pt-[14px] pb-[12px]">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-full transition-opacity active:opacity-70"
            style={{
              background: CARD,
              color: INK,
              padding: '7px 12px 7px 9px',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
            }}
            aria-label="Terug"
          >
            <IconBack />
            Terug
          </button>
        </div>

        {/* Hero */}
        <div className="flex items-center gap-4 px-[2px] pb-[22px]">
          <div
            className="flex h-[64px] w-[64px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{
              background: 'linear-gradient(140deg, #5A5E52, #474B48)',
              color: 'rgba(244,242,235,0.94)',
              fontSize: 22,
              letterSpacing: '0.02em',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 6px rgba(0,0,0,0.18)',
            }}
          >
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'Coach'}
                width={64}
                height={64}
                sizes="64px"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getInitials(profile?.full_name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <>
                <div className="h-[22px] w-[60%] animate-pulse rounded-md bg-[rgba(253,253,254,0.14)]" />
                <div className="mt-1.5 h-[12px] w-[40%] animate-pulse rounded-full bg-[rgba(253,253,254,0.08)]" />
              </>
            ) : (
              <>
                <div
                  className="truncate text-[22px] font-light leading-[1.1] tracking-[-0.02em]"
                  style={{ color: INK }}
                >
                  {profile?.full_name || 'Coach'}
                </div>
                <div
                  className="mt-[6px] text-[12px] tracking-[0.01em]"
                  style={{ color: INK_MUTED }}
                >
                  {profile?.role === 'coach' ? 'Coach' : 'Account'}
                  {memberSince ? ` · lid sinds ${memberSince}` : ''}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ACCOUNT */}
        <SectionLabel>Account</SectionLabel>
        <div className="mb-[10px] overflow-hidden rounded-[18px]" style={{ background: CARD }}>
          <div
            className="grid grid-cols-[30px_1fr_auto_14px] items-center gap-[14px] border-b px-[18px] py-[14px]"
            style={{ borderColor: HAIR }}
          >
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[rgba(253,253,254,0.06)]" style={{ color: INK }}>
              <IconMail />
            </span>
            <span className="text-[14px] tracking-[-0.005em]" style={{ color: INK }}>E-mail</span>
            <span
              className="max-w-[180px] truncate whitespace-nowrap text-[12px] tracking-[0.01em]"
              style={{ color: INK_MUTED }}
              title={profile?.email || ''}
            >
              {profile?.email || '—'}
            </span>
            <span />
          </div>
          <SetRow
            href="/coach/billing"
            label="Facturatie"
            value="Abonnement"
            icon={<IconBilling />}
          />
          <SetRow
            href="/coach/ai-settings"
            label="Integraties"
            value="AI & koppelingen"
            icon={<IconIntegrations />}
          />
          <SetRow
            href="/coach/schedule"
            label="Beschikbaarheid"
            value="Planning"
            icon={<IconClock />}
            last
          />
        </div>

        {/* SUPPORT */}
        <SectionLabel>Support</SectionLabel>
        <div className="mb-[10px] overflow-hidden rounded-[18px]" style={{ background: CARD }}>
          <SetRow
            href="/coach/resources"
            label="Hulp & support"
            value="Kennisbank"
            icon={<IconHelp />}
            last
          />
        </div>

        {/* UITLOGGEN */}
        <SectionLabel>Sessie</SectionLabel>
        <div className="mb-[10px] overflow-hidden rounded-[18px]" style={{ background: CARD }}>
          <SetRowButton
            onClick={handleSignOut}
            disabled={signingOut}
            label={signingOut ? 'Uitloggen…' : 'Uitloggen'}
            icon={<IconLogout />}
            accent={AMBER}
            last
          />
        </div>

        {/* Footer */}
        <div
          className="py-[18px] text-center text-[11px] tracking-[0.12em]"
          style={{ color: INK_DIM }}
        >
          MŌVE · v1.0 · coach
        </div>
      </div>
    </div>
  )
}
