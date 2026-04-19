'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { signOut } from '@/lib/auth'

/**
 * Desktop Coach Sidebar — v3 Orion.
 *
 * Palette:
 *   Canvas         #8E9890   (olive)
 *   Sidebar card   #474B48   (same as dashboard cards, stays contiguous feel)
 *   Ink            #FDFDFE
 *   Muted          rgba(253,253,254,0.62)
 *   Lime accent    #C0FC01
 *   Amber accent   #E8A93C
 *
 * Structure mirrors the mobile 3-tab nav (Home · Inbox · Studio) for consistency.
 * On desktop we additionally expose Studio's sub-library as a secondary group so
 * the coach can jump straight into Cliënten / Programma's / Voeding / etc. without
 * clicking into Studio first — this is the only desktop-specific affordance.
 *
 * Mobile chrome is rendered separately by `CoachBottomNav` (3-tab) — this file is
 * desktop-only (`hidden lg:flex`).
 */

type NavEntry = {
  href: string
  label: string
  icon: (active: boolean) => React.ReactNode
}

type BadgeCounts = Record<string, number>

// ─ Primary 3-tab (matches mobile) ──────────────────────────────
const primaryTabs: NavEntry[] = [
  { href: '/coach', label: 'Home', icon: (a) => <HomeIcon active={a} /> },
  { href: '/coach/inbox', label: 'Inbox', icon: (a) => <InboxIcon active={a} /> },
  { href: '/coach/studio', label: 'Studio', icon: (a) => <StudioIcon active={a} /> },
]

// ─ Studio sub-library (desktop convenience) ────────────────────
const studioSublinks: NavEntry[] = [
  { href: '/coach/clients', label: 'Cliënten', icon: () => <CaretDot /> },
  { href: '/coach/programs', label: "Programma's", icon: () => <CaretDot /> },
  { href: '/coach/exercises', label: 'Oefeningen', icon: () => <CaretDot /> },
  { href: '/coach/nutrition', label: 'Voeding', icon: () => <CaretDot /> },
  { href: '/coach/check-ins', label: 'Check-ins', icon: () => <CaretDot /> },
  { href: '/coach/accountability', label: 'Accountability', icon: () => <CaretDot /> },
  { href: '/coach/messages', label: 'Berichten', icon: () => <CaretDot /> },
  { href: '/coach/community', label: 'Community', icon: () => <CaretDot /> },
  { href: '/coach/activity', label: 'Activiteit', icon: () => <CaretDot /> },
]

// ─ Beheer (settings-ish, lowest priority) ──────────────────────
const beheerLinks: NavEntry[] = [
  { href: '/coach/automations', label: 'Automatisering', icon: () => <CaretDot /> },
  { href: '/coach/ai-settings', label: 'AI Agent', icon: () => <CaretDot /> },
  { href: '/coach/prompts', label: 'Prompts', icon: () => <CaretDot /> },
  { href: '/coach/broadcasts', label: 'Broadcasts', icon: () => <CaretDot /> },
  { href: '/coach/resources', label: 'Kennisbank', icon: () => <CaretDot /> },
  { href: '/coach/schedule', label: 'Planning', icon: () => <CaretDot /> },
  { href: '/coach/billing', label: 'Facturatie', icon: () => <CaretDot /> },
]

const INBOX_PATHS = ['/coach/inbox', '/coach/messages', '/coach/check-ins']

function matches(pathname: string, candidates: string[]): boolean {
  return candidates.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function CoachSidebar() {
  const pathname = usePathname() || ''
  const [badges, setBadges] = useState<BadgeCounts>({})
  const lastFetch = useRef(0)

  useEffect(() => {
    const loadBadges = () => {
      fetch('/api/coach-badges')
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => setBadges(data || {}))
        .catch(() => {})
      lastFetch.current = Date.now()
    }

    const timeSinceLast = Date.now() - lastFetch.current
    if (timeSinceLast > 10000) loadBadges()

    const interval = setInterval(loadBadges, 120_000)
    return () => clearInterval(interval)
  }, [pathname])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  // ─ Active detection ──────────────────────────────────────────
  const isHome = pathname === '/coach'
  const isInbox = !isHome && matches(pathname, INBOX_PATHS)
  const isStudioContext =
    !isHome &&
    !isInbox &&
    (pathname === '/coach/studio' ||
      studioSublinks.some((l) => matches(pathname, [l.href])) ||
      beheerLinks.some((l) => matches(pathname, [l.href])))

  const activeHref = (href: string) => {
    if (href === '/coach') return isHome
    if (href === '/coach/inbox') return isInbox
    if (href === '/coach/studio') return pathname === '/coach/studio' || isStudioContext
    return matches(pathname, [href])
  }

  const inboxCount =
    (badges['/coach/messages'] || 0) + (badges['/coach/check-ins'] || 0)

  // ─ Token palette ─────────────────────────────────────────────
  const CARD = '#474B48'
  const INK = '#FDFDFE'
  const MUTED = 'rgba(253,253,254,0.62)'
  const LIME = '#C0FC01'
  const AMBER = '#E8A93C'
  const BORDER = 'rgba(253,253,254,0.08)'
  const HOVER = 'rgba(253,253,254,0.04)'

  // ─ Primary tab row ───────────────────────────────────────────
  const PrimaryTab = ({ entry }: { entry: NavEntry }) => {
    const active = activeHref(entry.href)
    const badge = entry.href === '/coach/inbox' ? inboxCount : 0

    return (
      <Link
        href={entry.href}
        className="group relative flex items-center gap-[14px] rounded-[14px] px-[16px] py-[11px] transition-colors"
        style={{
          background: active ? 'rgba(192,252,1,0.08)' : 'transparent',
          color: active ? INK : MUTED,
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = HOVER
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span className="shrink-0 w-[22px] h-[22px] flex items-center justify-center">
          {entry.icon(active)}
        </span>
        <span className="flex-1 text-[14px] font-medium tracking-[-0.005em]">
          {entry.label}
        </span>
        {badge > 0 && (
          <span
            className="min-w-[20px] h-[18px] px-[6px] rounded-full text-[10px] font-bold flex items-center justify-center leading-none"
            style={{ background: LIME, color: '#0A0E0B' }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {active && (
          <span
            className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-r-full"
            style={{ background: LIME }}
          />
        )}
      </Link>
    )
  }

  // ─ Sub-link row ──────────────────────────────────────────────
  const SubLink = ({ entry }: { entry: NavEntry }) => {
    const active = activeHref(entry.href)
    const badge = badges[entry.href] || 0

    return (
      <Link
        href={entry.href}
        className="group flex items-center gap-[10px] rounded-[10px] pl-[18px] pr-[12px] py-[7px] text-[13px] transition-colors"
        style={{
          color: active ? INK : MUTED,
          background: active ? 'rgba(253,253,254,0.05)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = HOVER
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span
          className="w-[4px] h-[4px] rounded-full shrink-0"
          style={{ background: active ? LIME : 'rgba(253,253,254,0.25)' }}
        />
        <span className="flex-1 tracking-[-0.005em]">{entry.label}</span>
        {badge > 0 && (
          <span
            className="min-w-[18px] h-[16px] px-[5px] rounded-full text-[9.5px] font-bold flex items-center justify-center leading-none"
            style={{ background: AMBER, color: '#0A0E0B' }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[264px] lg:flex-col z-40"
      style={{
        background: CARD,
        borderRight: `1px solid ${BORDER}`,
        boxShadow: '1px 0 20px rgba(0,0,0,0.10)',
      }}
    >
      {/* Logo */}
      <div className="px-[22px] pt-[28px] pb-[20px]">
        <div
          className="text-[26px] font-light tracking-[-0.04em]"
          style={{ color: INK, fontFamily: 'var(--font-display)' }}
        >
          MŌVE
        </div>
        <div
          className="mt-[4px] text-[10.5px] font-medium uppercase tracking-[0.18em]"
          style={{ color: MUTED }}
        >
          Coach
        </div>
      </div>

      {/* Primary 3-tab */}
      <nav className="px-[12px] pb-[14px] space-y-[3px]">
        {primaryTabs.map((e) => (
          <PrimaryTab key={e.href} entry={e} />
        ))}
      </nav>

      {/* Scroll region for sub-nav */}
      <div className="flex-1 overflow-y-auto px-[12px] pb-[14px]">
        {/* Separator */}
        <div
          className="mx-[4px] my-[12px] h-px"
          style={{ background: BORDER }}
        />

        {/* Studio sub-library */}
        <div
          className="px-[18px] pb-[6px] text-[9.5px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'rgba(253,253,254,0.38)' }}
        >
          Studio
        </div>
        <div className="space-y-[1px]">
          {studioSublinks.map((e) => (
            <SubLink key={e.href} entry={e} />
          ))}
        </div>

        {/* Separator */}
        <div
          className="mx-[4px] my-[12px] h-px"
          style={{ background: BORDER }}
        />

        {/* Beheer */}
        <div
          className="px-[18px] pb-[6px] text-[9.5px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'rgba(253,253,254,0.38)' }}
        >
          Beheer
        </div>
        <div className="space-y-[1px]">
          {beheerLinks.map((e) => (
            <SubLink key={e.href} entry={e} />
          ))}
        </div>
      </div>

      {/* Footer — Profiel + Uitloggen */}
      <div
        className="px-[12px] pt-[12px] pb-[18px] space-y-[2px]"
        style={{ borderTop: `1px solid ${BORDER}` }}
      >
        <Link
          href="/coach/profile"
          className="flex items-center gap-[12px] rounded-[12px] px-[16px] py-[10px] text-[13px] transition-colors"
          style={{
            color: pathname.startsWith('/coach/profile') ? INK : MUTED,
            background: pathname.startsWith('/coach/profile')
              ? 'rgba(253,253,254,0.05)'
              : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!pathname.startsWith('/coach/profile'))
              e.currentTarget.style.background = HOVER
          }}
          onMouseLeave={(e) => {
            if (!pathname.startsWith('/coach/profile'))
              e.currentTarget.style.background = 'transparent'
          }}
        >
          <UserIcon />
          <span className="tracking-[-0.005em]">Profiel</span>
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-[12px] rounded-[12px] px-[16px] py-[10px] text-[13px] transition-colors"
          style={{ color: AMBER, background: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(232,169,60,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogoutIcon />
          <span className="tracking-[-0.005em]">Uitloggen</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Icons (v3 Orion — stroke-only) ─────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      stroke="currentColor"
      strokeWidth={active ? 1.75 : 1.55}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12 12 4l9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  )
}

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      stroke="currentColor"
      strokeWidth={active ? 1.75 : 1.55}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16v12H5.5L4 18z" />
    </svg>
  )
}

function StudioIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      stroke="currentColor"
      strokeWidth={active ? 1.75 : 1.55}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      stroke="currentColor"
      strokeWidth={1.55}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      stroke="currentColor"
      strokeWidth={1.55}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H4" />
    </svg>
  )
}

function CaretDot() {
  // Invisible placeholder slot — SubLink renders its own lime dot
  return <span />
}
