'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Coach bottom nav — 3 tabs: Home · Inbox · Studio.
 * Matches the v3 Orion "coach-home-v3" mockup.
 *
 * Route map (current, will be swapped as pages are rebuilt):
 *   Home    → /coach
 *   Inbox   → /coach/messages  (unified inbox — messages + check-ins + alerts later)
 *   Studio  → /coach/programs  (library hub — programs + nutrition templates later)
 */

type BadgeCounts = Record<string, number>

const HOME_HREF = '/coach'
const INBOX_HREF = '/coach/inbox'
const STUDIO_HREF = '/coach/studio'

// Paths that still count as "inbox-ish" for the purpose of the active dot.
const INBOX_PATHS = ['/coach/messages', '/coach/check-ins', '/coach/inbox']
const STUDIO_PATHS = [
  '/coach/programs',
  '/coach/exercises',
  '/coach/nutrition',
  '/coach/studio',
  '/coach/billing',
  '/coach/resources',
  '/coach/broadcasts',
  '/coach/prompts',
  '/coach/automations',
  '/coach/ai-settings',
  '/coach/schedule',
  '/coach/community',
  '/coach/accountability',
  '/coach/clients',
  '/coach/activity',
]

function matches(pathname: string, candidates: string[]): boolean {
  return candidates.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function CoachBottomNav() {
  const pathname = usePathname() || ''
  const [badges, setBadges] = useState<BadgeCounts>({})

  useEffect(() => {
    let active = true
    const load = () => {
      fetch('/api/coach-badges', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => {
          if (active) setBadges(data || {})
        })
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 120_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pathname])

  const isHome = pathname === HOME_HREF
  const isInbox = !isHome && matches(pathname, INBOX_PATHS)
  const isStudio = !isHome && !isInbox && matches(pathname, STUDIO_PATHS)

  const inboxCount =
    (badges['/coach/messages'] || 0) + (badges['/coach/check-ins'] || 0)

  return (
    <nav
      className="lg:hidden fixed left-0 right-0 bottom-0 z-40 grid grid-cols-3 px-3 pt-2.5 pb-[26px] border-t border-[rgba(253,253,254,0.06)]"
      style={{
        background: 'rgba(47,51,48,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <NavTab href={HOME_HREF} label="Home" active={isHome}>
        <HomeIcon />
      </NavTab>
      <NavTab href={INBOX_HREF} label="Inbox" active={isInbox} badge={inboxCount}>
        <InboxIcon />
      </NavTab>
      <NavTab href={STUDIO_HREF} label="Studio" active={isStudio}>
        <StudioIcon />
      </NavTab>
    </nav>
  )
}

function NavTab({
  href,
  label,
  active,
  badge,
  children,
}: {
  href: string
  label: string
  active: boolean
  badge?: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 text-[10.5px] tracking-[0.04em] ${
        active ? 'text-[#FDFDFE]' : 'text-[rgba(253,253,254,0.40)]'
      }`}
    >
      <span className="relative">
        <span className="block w-[22px] h-[22px]">{children}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -top-[3px] -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-[#C0FC01] text-[#0A0E0B] text-[9px] font-bold flex items-center justify-center border-2 border-[#2F3330] leading-none"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {active && (
          <span
            className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] w-[3px] h-[3px] rounded-full bg-[#C0FC01]"
          />
        )}
      </span>
      <span>{label}</span>
    </Link>
  )
}

// ─── Icons (stroke-only, match v3 mockup) ───────────────────────

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[22px] h-[22px]"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12 12 4l9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[22px] h-[22px]"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16v12H5.5L4 18z" />
    </svg>
  )
}

function StudioIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[22px] h-[22px]"
      stroke="currentColor"
      strokeWidth="1.6"
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
