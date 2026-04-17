'use client'

import Link from 'next/link'
import { memo, useEffect, useState } from 'react'
import { cachedFetch } from '@/lib/fetcher'

interface Props {
  initialName?: string | null
  initialUnread?: number
}

// v6 top-bar avatar — ink-initial + lime-dot voor unread notifications.
// Route → /client/profile waar "Meldingen" sectie bovenaan staat.
function TopBarAvatarComponent({ initialName = null, initialUnread = 0 }: Props) {
  const [name, setName] = useState<string | null>(initialName)
  const [unread, setUnread] = useState<number>(initialUnread)

  useEffect(() => {
    // Passieve refresh — gebruikt zelfde gecachede dashboard payload.
    cachedFetch<{ profile: { firstName: string } | null; notificationCount: number }>(
      '/api/dashboard',
      { maxAge: 120_000 },
    )
      .then(d => {
        if (d?.profile?.firstName) setName(d.profile.firstName)
        if (typeof d?.notificationCount === 'number') setUnread(d.notificationCount)
      })
      .catch(() => {})
  }, [])

  const initial = (name || 'G').charAt(0).toUpperCase()
  const hasUnread = unread > 0

  return (
    <Link
      href="/client/profile"
      aria-label={hasUnread ? `Profiel — ${unread} meldingen` : 'Profiel'}
      className="relative inline-flex items-center justify-center"
      style={{
        width: 32,
        height: 32,
        borderRadius: 9999,
        background: 'linear-gradient(140deg, #5A5E52, #3D403A)',
        color: 'rgba(244,242,235,0.92)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.02em',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 3px rgba(0,0,0,0.20)',
      }}
    >
      {initial}
      {hasUnread && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: 9999,
            background: '#C0FC01',
            boxShadow: '0 0 0 2px #8E9890, 0 0 6px rgba(192,252,1,0.6)',
          }}
        />
      )}
    </Link>
  )
}

export const TopBarAvatar = memo(TopBarAvatarComponent)
