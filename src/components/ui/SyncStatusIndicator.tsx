'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff, RefreshCw, Check, AlertTriangle } from 'lucide-react'
import { onSyncStatusChange, type SyncStatus } from '@/lib/sync-queue'

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  })
  const [visible, setVisible] = useState(false)
  // Refs i.p.v. state voor mutable values die geen re-render triggeren —
  // zo blijft de useEffect-deps array leeg en abonneren we 1× op de queue.
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hadPendingItemsRef = useRef(false)

  useEffect(() => {
    const unsubscribe = onSyncStatusChange((newStatus) => {
      setStatus(newStatus)

      // Track whether there were pending items before sync completed
      if (newStatus.pendingCount > 0 || newStatus.isSyncing) {
        hadPendingItemsRef.current = true
      }

      // Show indicator when offline, syncing, or has pending items
      if (!newStatus.isOnline || newStatus.isSyncing || newStatus.pendingCount > 0 || newStatus.lastError) {
        setVisible(true)
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = null
        }
      } else if (
        newStatus.isOnline &&
        !newStatus.isSyncing &&
        newStatus.pendingCount === 0 &&
        hadPendingItemsRef.current
      ) {
        // Toon "alles in sync" toast 3s lang, dan verbergen.
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false)
          hadPendingItemsRef.current = false
          hideTimeoutRef.current = null
        }, 3000)
        setVisible(true)
      }
    })

    return () => {
      unsubscribe()
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
    }
  }, [])

  if (!visible) return null

  // v6 Orion — alle states krijgen dezelfde dark-ink achtergrond (#474B48)
  // met een lime accent voor active/pending; rood/oranje alleen voor échte
  // foutstaten. Past zo subtiel boven de bottom-nav i.p.v. te schreeuwen.
  const getStatusConfig = () => {
    if (!status.isOnline) {
      return {
        icon: <WifiOff className="w-3.5 h-3.5" strokeWidth={1.75} />,
        label: 'Offline',
        sublabel: status.pendingCount > 0 ? `${status.pendingCount} wachtend` : undefined,
        bg: 'bg-[#474B48]',
        text: 'text-[#FDFDFE]',
        accent: 'text-[rgba(253,253,254,0.55)]',
      }
    }
    if (status.isSyncing) {
      return {
        icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />,
        label: 'Synchroniseren',
        sublabel: status.pendingCount > 0 ? `${status.pendingCount} ${status.pendingCount === 1 ? 'item' : 'items'}` : undefined,
        bg: 'bg-[#474B48]',
        text: 'text-[#C0FC01]',
        accent: 'text-[rgba(253,253,254,0.55)]',
      }
    }
    if (status.lastError) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />,
        label: 'Sync fout',
        sublabel: status.pendingCount > 0 ? `${status.pendingCount} wachtend — opnieuw proberen` : 'Probeer opnieuw',
        bg: 'bg-[#474B48]',
        text: 'text-[#E8A93C]',
        accent: 'text-[rgba(253,253,254,0.55)]',
      }
    }
    return {
      icon: <Check className="w-3.5 h-3.5" strokeWidth={2} />,
      label: 'Gesynchroniseerd',
      sublabel: undefined as string | undefined,
      bg: 'bg-[#474B48]',
      text: 'text-[#C0FC01]',
      accent: 'text-[rgba(253,253,254,0.55)]',
    }
  }

  const config = getStatusConfig()

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 ${config.bg} ${config.text} px-3.5 py-2 rounded-full flex items-center gap-2 text-[13px] font-medium tracking-tight transition-all duration-300 animate-slide-up`}
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 14px rgba(0,0,0,0.18)',
      }}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <span>{config.label}</span>
      {config.sublabel && (
        <span className={`text-[11px] ${config.accent}`}>{config.sublabel}</span>
      )}
    </div>
  )
}
