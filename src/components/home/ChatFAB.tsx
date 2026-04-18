'use client'

/**
 * Floating chat-button voor de cliënt-home — bottom-right boven de bnav-pill.
 * Lime-pellet wanneer er ongelezen berichten zijn (count via prop, niet eigen
 * fetch — DashboardClient kent al `actions.unreadMessages`).
 *
 * Plaatsing in v6 Orion:
 *   bottom = 24 + safe-area (zelfde basisrij als .bnav-plus)
 *   right  = 5% (zelfde gutter als de open-state van de nav)
 *   z-index = 49 (1 onder de bnav-pill zodat een open menu niet visueel raar
 *              clipt; FAB blijft wel boven page-content)
 */

import Link from 'next/link'

interface Props {
  unreadCount?: number
  href?: string
}

export function ChatFAB({ unreadCount = 0, href = '/client/messages' }: Props) {
  const hasUnread = unreadCount > 0
  const display =
    unreadCount > 99 ? '99+' : unreadCount > 9 ? `${unreadCount}` : `${unreadCount}`

  return (
    <Link
      href={href}
      aria-label={hasUnread ? `Chat met je coach (${unreadCount} ongelezen)` : 'Chat met je coach'}
      className="lg:hidden"
      style={{
        position: 'fixed',
        right: '5%',
        bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
        width: 56,
        height: 56,
        borderRadius: 999,
        background: '#474B48',
        border: '1px solid rgba(253,253,254,0.10)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 22px rgba(0,0,0,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 49,
        WebkitTapHighlightColor: 'transparent',
        textDecoration: 'none',
        transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="#FDFDFE"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a8 8 0 0 1-11.6 7.16L4 21l1.85-5.4A8 8 0 1 1 21 12z" />
      </svg>
      {hasUnread && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            borderRadius: 999,
            background: '#C0FC01',
            color: '#1A1917',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #8E9890',
            boxShadow: '0 2px 6px rgba(192,252,1,0.45)',
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
          }}
        >
          {display}
        </span>
      )}
    </Link>
  )
}
