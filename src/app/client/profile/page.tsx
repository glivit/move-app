'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────
interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  package: string
  created_at: string
  avatar_url?: string
}

// ─── Row component · design-system/10-ik.html · row-item ─────
// grid: leading (icon/avatar) · body (label + optional meta) · value-right · chev
function Row({
  href,
  leading,
  label,
  meta,
  value,
  trailing,
}: {
  href?: string
  leading: React.ReactNode
  label: string
  meta?: string
  value?: React.ReactNode
  trailing?: React.ReactNode
}) {
  const inner = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto 14px',
        alignItems: 'center',
        gap: 14,
        padding: '14px 0',
        borderTop: '1px solid rgba(253,253,254,0.08)',
        cursor: href ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {leading}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15, fontWeight: 400, color: '#FDFDFE',
            letterSpacing: '-0.003em', lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        {meta && (
          <div
            style={{
              fontSize: 11, fontWeight: 400, color: 'rgba(253,253,254,0.52)',
              letterSpacing: '0.01em', marginTop: 2,
            }}
          >
            {meta}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 13, fontWeight: 400, color: 'rgba(253,253,254,0.78)',
          textAlign: 'right', fontVariantNumeric: 'tabular-nums',
          minWidth: 0,
        }}
      >
        {trailing ?? value ?? ''}
      </div>
      <svg
        viewBox="0 0 24 24"
        style={{
          width: 12, height: 12,
          stroke: 'rgba(253,253,254,0.44)',
          strokeWidth: 1.8, fill: 'none',
          opacity: href ? 1 : 0,
        }}
      >
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </div>
  )
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </Link>
    )
  }
  return inner
}

// Icon helpers (stroke var(--ink-soft) per 10-ik.html)
const icoColor = 'rgba(253,253,254,0.78)'
const icoStyle: React.CSSProperties = {
  width: 17, height: 17,
  stroke: icoColor, strokeWidth: 1.6, fill: 'none',
}

const IcoPlan = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
)
const IcoGoals = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}><circle cx="12" cy="12" r="9" /><polyline points="9 12 11 14 15 10" /></svg>
)
const IcoCheckins = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}><path d="M4 12h16M12 4v16" strokeLinecap="round" /><circle cx="12" cy="12" r="9" /></svg>
)
const IcoPackage = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}><path d="M5 7l7-4 7 4v10l-7 4-7-4z" /><path d="M12 3v18" /></svg>
)
const IcoCard = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
)
const IcoInvoice = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}><path d="M9 17l-5-5 5-5" /><path d="M20 12H4" /></svg>
)
const IcoAppearance = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3.5" />
  </svg>
)
const IcoNotif = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <path d="M6 8a6 6 0 0 1 12 0c0 4 2 5 2 5H4s2-1 2-5" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </svg>
)
const IcoDiet = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <path d="M6 3h12l-1 5H7z" /><path d="M7 8v11h10V8" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)
const IcoHealth = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-0.5z" />
  </svg>
)
const IcoPrivacy = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
)
const IcoHelp = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 9a2 2 0 1 1 3 1.5c-1 0.5-1 1.5-1 2" />
    <line x1="12" y1="16" x2="12" y2="16.01" />
  </svg>
)
const IcoLogs = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <path d="M4 6h16M4 12h16M4 18h10" />
    <circle cx="20" cy="18" r="1.5" fill={icoColor} stroke="none" />
  </svg>
)
// Sign-out icoon — arrow die uit een box loopt (standaard log-out metafoor).
const IcoLogout = () => (
  <svg viewBox="0 0 24 24" style={icoStyle}>
    <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <polyline points="14 17 19 12 14 7" />
    <line x1="19" y1="12" x2="9" y2="12" />
  </svg>
)

// ─── Dark mode toggle (inline row) ────────────────────────────
function AppearanceValue() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  return (
    <span style={{ fontSize: 13, color: 'rgba(253,253,254,0.78)' }}>
      {dark ? 'Donker' : 'Auto'}
    </span>
  )
}

// ─── Section label · 10/500 caps /.16em ───────────────────────
function SectionLabel({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="animate-slide-up"
      style={{
        padding: '18px 4px 8px',
        fontSize: 10, fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'rgba(253,253,254,0.52)',
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  )
}

// ─── Format helpers ───────────────────────────────────────────
function formatMemberSince(dateString: string) {
  if (!dateString) return ''
  const d = new Date(dateString)
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

function weeksSince(dateString: string) {
  if (!dateString) return 0
  const d = new Date(dateString)
  const diffMs = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)))
}

function getInitials(name?: string) {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

// ─── Page ─────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

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
        {/* Hero skeleton · left-aligned */}
        <div style={{ padding: '4px 4px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            className="animate-pulse"
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(253,253,254,0.12)' }}
          />
          <div style={{ flex: 1 }}>
            <div
              className="animate-pulse"
              style={{ height: 18, width: '60%', borderRadius: 6, background: 'rgba(253,253,254,0.14)', marginBottom: 6 }}
            />
            <div
              className="animate-pulse"
              style={{ height: 11, width: '40%', borderRadius: 999, background: 'rgba(253,253,254,0.08)' }}
            />
          </div>
        </div>
        {/* Sections skeleton */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div
              className="animate-pulse"
              style={{ height: 10, width: 90, borderRadius: 999, background: 'rgba(253,253,254,0.10)', margin: '18px 4px 8px' }}
            />
            <div
              className="animate-pulse rounded-[24px]"
              style={{ height: 180, background: '#A6ADA7', opacity: 0.6 }}
            />
          </div>
        ))}
      </div>
    )
  }

  const weeks = weeksSince(profile?.created_at || '')

  return (
    <div className="pb-28">
      {/* ── Profile hero · left-aligned per 10-ik.html ── */}
      <div
        className="animate-fade-in"
        style={{
          padding: '4px 4px 22px',
          display: 'flex', alignItems: 'center', gap: 16,
        }}
      >
        <div
          style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(140deg, #5A5E52, #474B48)',
            color: 'rgba(244,242,235,0.94)',
            fontSize: 22, fontWeight: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 6px rgba(0,0,0,0.18)',
            letterSpacing: '0.02em',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={64}
              height={64}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              unoptimized
              loading="lazy"
            />
          ) : (
            getInitials(profile?.full_name)
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 22, fontWeight: 300, color: '#FDFDFE',
              letterSpacing: '-0.02em', lineHeight: 1.1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {profile?.full_name || 'Profiel'}
          </div>
          <div
            style={{
              fontSize: 12, fontWeight: 400, color: 'rgba(253,253,254,0.52)',
              letterSpacing: '0.01em', marginTop: 3,
            }}
          >
            {profile?.package ? `${profile.package} · ` : ''}
            {weeks > 0 ? `${weeks} ${weeks === 1 ? 'week' : 'weken'} actief` : 'Nieuw lid'}
          </div>
        </div>
      </div>

      {/* ── Stats strip · 3-col open · parity met 10-ik.html ── */}
      <div
        className="animate-fade-in"
        style={{
          padding: '2px 4px 14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {[
          { val: weeks.toString(), lbl: 'Weken' },
          { val: profile?.package ? 'Actief' : '—', lbl: 'Status' },
          { val: 'Premium', lbl: 'Plan' },
        ].map((s, i) => (
          <div key={i}>
            <div
              style={{
                fontSize: 20, fontWeight: 300,
                letterSpacing: '-0.01em',
                color: '#FDFDFE',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontSize: 9, fontWeight: 500,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(253,253,254,0.52)',
                marginTop: 3,
              }}
            >
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      {/* ─────────── COACHING ─────────── */}
      <SectionLabel delay={120}>Coaching</SectionLabel>
      <div
        className="v6-card animate-slide-up"
        style={{ padding: '4px 20px', marginBottom: 6, animationDelay: '160ms', animationFillMode: 'both' }}
      >
        <Row
          href="/client/messages"
          leading={
            <div
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(140deg, #5A5E52, #474B48)',
                color: 'rgba(244,242,235,0.92)',
                fontSize: 11, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
              }}
            >
              C
            </div>
          }
          label="Coach"
          meta="Je coach · chat"
          trailing={
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(47,166,90,0.22)',
                color: '#C7EAD3',
                fontSize: 10, fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              <span
                style={{
                  width: 5, height: 5, borderRadius: '50%', background: '#2FA65A',
                }}
              />
              Online
            </span>
          }
        />
        <Row
          href="/client/program"
          leading={<IcoPlan />}
          label="Mijn plan"
          meta={profile?.package ? `${profile.package}` : 'Bekijk je trainingsschema'}
        />
        <Row
          href="/client/profile/goals"
          leading={<IcoGoals />}
          label="Doelen"
          meta="Bekijk en update je doelstellingen"
        />
        <Row
          href="/client/weekly-check-in"
          leading={<IcoCheckins />}
          label="Check-ins"
          meta="Wekelijkse voortgang"
        />
        <Row
          href="/client/profile/logs"
          leading={<IcoLogs />}
          label="Mijn logs"
          meta="Workouts · gewicht · voeding · verwijderen"
        />
      </div>

      {/* ─────────── ABONNEMENT ─────────── */}
      <SectionLabel delay={240}>Abonnement</SectionLabel>
      <div
        className="v6-card animate-slide-up"
        style={{ padding: '4px 20px', marginBottom: 6, animationDelay: '280ms', animationFillMode: 'both' }}
      >
        <Row
          leading={<IcoPackage />}
          label="Pakket"
          meta={profile?.package || 'Standaard'}
          trailing={
            <span style={{ fontSize: 13, fontWeight: 500, color: '#FDFDFE' }}>
              {profile?.package || '—'}
            </span>
          }
        />
        <Row
          leading={<IcoCard />}
          label="Betaalmethode"
          meta="Via je coach beheerd"
        />
        <Row
          href="/client/profile/invoices"
          leading={<IcoInvoice />}
          label="Factuurgeschiedenis"
        />
      </div>

      {/* ─────────── VOORKEUREN ─────────── */}
      <SectionLabel delay={360}>Voorkeuren</SectionLabel>
      <div
        className="v6-card animate-slide-up"
        style={{ padding: '4px 20px', marginBottom: 6, animationDelay: '400ms', animationFillMode: 'both' }}
      >
        <Row
          href="/client/profile/edit"
          leading={<IcoAppearance />}
          label="Uiterlijk"
          trailing={<AppearanceValue />}
        />
        <Row
          href="/client/profile/notifications"
          leading={<IcoNotif />}
          label="Notificaties"
          value={<span style={{ fontSize: 13, color: 'rgba(253,253,254,0.78)' }}>Aan</span>}
        />
        <Row
          href="/client/profile/diet"
          leading={<IcoDiet />}
          label="Voedingsvoorkeuren"
        />
        <Row
          href="/client/profile/health"
          leading={<IcoHealth />}
          label="Blessures & beperkingen"
        />
        <Row
          href="/client/profile/privacy"
          leading={<IcoPrivacy />}
          label="Privacy & data"
        />
        <Row
          href="/client/profile/help"
          leading={<IcoHelp />}
          label="Help & support"
        />

        {/* ─── Uitloggen — Row-style voor zichtbaarheid ────────────────────
         * Voor: subtiele grijze tekstknop onder de rows, Glenn zag hem
         * niet (grijs-op-grijs). Nu: zelfde visuele pattern als Privacy/
         * Help rows (icoon + label + chevron + top-border), maar als
         * button zodat hij handleLogout triggert ipv een Link te volgen.
         * Niet destructief gestyled — uitloggen is geen paniekactie. */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          aria-label={signingOut ? 'Bezig met uitloggen' : 'Uitloggen'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto 14px',
            alignItems: 'center',
            gap: 14,
            padding: '14px 0',
            borderTop: '1px solid rgba(253,253,254,0.08)',
            border: 'none',
            borderTopWidth: 1,
            borderTopStyle: 'solid',
            borderTopColor: 'rgba(253,253,254,0.08)',
            background: 'transparent',
            width: '100%',
            cursor: signingOut ? 'default' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
            fontFamily: 'inherit',
            textAlign: 'left',
            opacity: signingOut ? 0.6 : 1,
            transition: 'opacity 180ms',
          }}
        >
          <div
            style={{
              width: 24, height: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IcoLogout />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15, fontWeight: 400, color: '#FDFDFE',
                letterSpacing: '-0.003em', lineHeight: 1.2,
              }}
            >
              {signingOut ? 'Uitloggen…' : 'Uitloggen'}
            </div>
          </div>
          <div />
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 12, height: 12,
              stroke: 'rgba(253,253,254,0.44)',
              strokeWidth: 1.8, fill: 'none',
            }}
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>

      {/* ─────────── VERSIE ─────────── */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 10, fontWeight: 400,
          color: 'rgba(253,253,254,0.32)',
          letterSpacing: '0.04em',
          padding: '4px 0 16px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        MŌVE 1.2.4 (build 218)
      </div>
    </div>
  )
}
