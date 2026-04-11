'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * useCoachLiveUpdates — Phase 5 realtime glue.
 *
 * Subscribes to the handful of tables that reflect client activity
 * (workout_sessions, messages, nutrition_daily_summary, checkins) and calls
 * `refetch()` whenever something relevant changes. The hook also:
 *
 * - Debounces bursts of events (multiple sets logged in 2s = one refetch)
 * - Refetches on tab visibility change (cheap catch-all for missed events)
 * - Exposes `lastEventAt` so the UI can flash a "live" dot
 * - Supports scoping to a single client (for the detail screen)
 *
 * Subscribers are gated by RLS. The coach can SELECT all workout_sessions /
 * nutrition_daily_summary / checkins via existing policies, so realtime
 * delivers every row event. Clients only see their own rows.
 *
 * Assumes you've run the Phase 5 migration that adds those tables to the
 * `supabase_realtime` publication.
 */

export interface CoachLiveOptions {
  /** Called when realtime detects relevant activity (debounced). */
  refetch: () => void | Promise<void>
  /** When set, only events touching this client_id trigger a refetch. */
  clientId?: string
  /** Coach user_id — needed to listen for DMs targeted at the coach. */
  coachId?: string
  /** Debounce window in ms. Default 800. */
  debounceMs?: number
  /** Disable the hook (e.g. while a modal is open). */
  disabled?: boolean
}

export interface CoachLiveResult {
  /** Timestamp of last realtime event or tab-focus refetch. */
  lastEventAt: number | null
  /** True while the websocket channel is OPEN. */
  connected: boolean
  /** Manually trigger a debounced refetch. */
  trigger: () => void
}

export function useCoachLiveUpdates({
  refetch,
  clientId,
  coachId,
  debounceMs = 800,
  disabled = false,
}: CoachLiveOptions): CoachLiveResult {
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const refetchRef = useRef(refetch)
  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  const trigger = useCallback(() => {
    setLastEventAt(Date.now())
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      Promise.resolve(refetchRef.current()).catch(() => {})
    }, debounceMs)
  }, [debounceMs])

  // ─── Realtime subscription ──────────────────────────────
  useEffect(() => {
    if (disabled) return
    const supabase = createClient()

    const channelName = clientId
      ? `coach-live:client:${clientId}`
      : `coach-live:all${coachId ? `:${coachId}` : ''}`

    let channel: RealtimeChannel = supabase.channel(channelName)

    // workout_sessions: new completed workouts, coach_seen toggles
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workout_sessions',
        ...(clientId ? { filter: `client_id=eq.${clientId}` } : {}),
      },
      () => trigger()
    )

    // nutrition_daily_summary: client logs meals
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'nutrition_daily_summary',
        ...(clientId ? { filter: `client_id=eq.${clientId}` } : {}),
      },
      () => trigger()
    )

    // checkins: weekly check-in entries
    channel = channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'checkins',
        ...(clientId ? { filter: `client_id=eq.${clientId}` } : {}),
      },
      () => trigger()
    )

    // messages: new DM to the coach (or bidirectional if clientId is set)
    if (coachId || clientId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          // filter: coach scope = "sent to me"; client scope = "either direction"
          ...(clientId
            ? {}
            : coachId
            ? { filter: `receiver_id=eq.${coachId}` }
            : {}),
        },
        (payload) => {
          // When scoped to a single client, only bump on messages
          // between the two of them.
          if (clientId && coachId) {
            const row = (payload.new || payload.old) as {
              sender_id?: string
              receiver_id?: string
            } | null
            if (!row) return
            const touchesPair =
              (row.sender_id === clientId && row.receiver_id === coachId) ||
              (row.sender_id === coachId && row.receiver_id === clientId)
            if (!touchesPair) return
          }
          trigger()
        }
      )
    }

    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED')
    })

    return () => {
      supabase.removeChannel(channel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [clientId, coachId, disabled, trigger])

  // ─── Visibility + focus refetch ─────────────────────────
  // If the coach comes back to the tab after a while, refetch immediately
  // — websockets sometimes drop without telling us.
  useEffect(() => {
    if (disabled) return
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        setLastEventAt(Date.now())
        Promise.resolve(refetchRef.current()).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [disabled])

  return { lastEventAt, connected, trigger }
}
