'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Check, AlertTriangle } from 'lucide-react'
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
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null)
  const [hadPendingItems, setHadPendingItems] = useState(false)

  useEffect(() => {
    const unsubscribe = onSyncStatusChange((newStatus) => {
      setStatus(newStatus)

      // Track whether there were pending items before sync completed
      if (newStatus.pendingCount > 0 || newStatus.isSyncing) {
        setHadPendingItems(true)
      }

      // Show indicator when offline, syncing, or has pending items
      if (!newStatus.isOnline || newStatus.isSyncing || newStatus.pendingCount > 0 || newStatus.lastError) {
        setVisible(true)
        if (hideTimeout) clearTimeout(hideTimeout)
      } else if (newStatus.isOnline && !newStatus.isSyncing && newStatus.pendingCount === 0 && hadPendingItems) {
        // Only show success toast if we actually synced something
        const timeout = setTimeout(() => {
          setVisible(false)
          setHadPendingItems(false)
        }, 3000)
        setHideTimeout(timeout)
        setVisible(true)
      }
    })

    return () => {
      unsubscribe()
      if (hideTimeout) clearTimeout(hideTimeout)
    }
  }, [hadPendingItems])

  if (!visible) return null

  const getStatusConfig = () => {
    if (!status.isOnline) {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        label: 'Offline',
        sublabel: status.pendingCount > 0 ? `${status.pendingCount} wachtend` : undefined,
        bg: 'bg-[#1A1917]',
        text: 'text-white',
      }
    }
    if (status.isSyncing) {
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        label: 'Synchroniseren...',
        sublabel: `${status.pendingCount} items`,
        bg: 'bg-[#D4682A]',
        text: 'text-white',
      }
    }
    if (status.lastError) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Sync fout',
        sublabel: status.pendingCount > 0 ? `${status.pendingCount} wachtend` : undefined,
        bg: 'bg-[#C4372A]',
        text: 'text-white',
      }
    }
    return {
      icon: <Check className="w-4 h-4" />,
      label: 'Gesynchroniseerd',
      bg: 'bg-[#3D8B5C]',
      text: 'text-white',
    }
  }

  const config = getStatusConfig()

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 ${config.bg} ${config.text} px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 animate-slide-up`}
    >
      {config.icon}
      <span>{config.label}</span>
      {config.sublabel && (
        <span className="opacity-75 text-xs">{config.sublabel}</span>
      )}
    </div>
  )
}
