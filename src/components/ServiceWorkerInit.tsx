'use client'

import { useState } from 'react'
import { useServiceWorker } from '@/hooks/useServiceWorker'

/**
 * Registreert de service worker + toont een subtle update-prompt
 * wanneer een nieuwe SW-versie klaar staat (Fase 3).
 *
 * Het renderen van de prompt zit hier (i.p.v. een aparte component) om
 * dubbele SW-registratie te voorkomen — de hook moet maar 1x mounten.
 */
export function ServiceWorkerInit() {
  const { updateAvailable, applyUpdate } = useServiceWorker()
  const [dismissed, setDismissed] = useState(false)

  if (!updateAvailable || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-up-v6"
      style={{
        position: 'fixed',
        // Boven de bottom nav (~84px) + safe-area
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px 10px 16px',
        borderRadius: 9999,
        background: 'rgba(31,35,31,0.92)',
        backdropFilter: 'blur(14px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
        border: '1px solid rgba(253,253,254,0.14)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.32)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#C0FC01',
          boxShadow: '0 0 6px rgba(192,252,1,0.6)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 13,
          color: '#FDFDFE',
          fontWeight: 400,
          letterSpacing: 0.01,
        }}
      >
        Nieuwe versie beschikbaar
      </span>
      <button
        type="button"
        onClick={applyUpdate}
        style={{
          fontSize: 12,
          fontWeight: 500,
          padding: '6px 12px',
          borderRadius: 9999,
          background: '#FDFDFE',
          color: '#1F231F',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Vernieuwen
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Update-melding verbergen"
        style={{
          width: 22,
          height: 22,
          borderRadius: 9999,
          background: 'transparent',
          border: 'none',
          color: 'rgba(253,253,254,0.62)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  )
}
