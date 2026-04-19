'use client'

import { useState } from 'react'
import { FileText, Check, Loader2, AlertCircle, X } from 'lucide-react'

/**
 * RequestReintakeButton — v3 Orion stijl.
 *
 * Coach-knop om een klant te vragen de intake opnieuw in te vullen. Plaatst
 * een task op het klant-dashboard zonder de middleware-gate te triggeren
 * (dus intake_completed blijft true — alleen reintake_requested_at wordt
 * gezet).
 *
 * Gebruikt /api/clients/request-reintake.
 *
 * - Idle zonder actieve vraag  → "Intake opnieuw vragen"
 * - Idle mét actieve vraag     → "Aangevraagd <datum>" + klik = annuleren
 * - Loading / success / error  → dezelfde states als ResendInviteButton
 */
interface RequestReintakeButtonProps {
  clientId: string
  clientName: string
  /** ISO-string van reintake_requested_at, of null/undefined als geen vraag open staat */
  requestedAt?: string | null
  variant?: 'chip' | 'inline'
}

function formatRequestedLabel(iso: string): string {
  try {
    const d = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const day = new Date(d)
    day.setHours(0, 0, 0, 0)
    const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000)
    if (diffDays === 0) return 'Aangevraagd vandaag'
    if (diffDays === 1) return 'Aangevraagd gisteren'
    if (diffDays < 7) return `Aangevraagd ${diffDays}d geleden`
    return `Aangevraagd ${d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}`
  } catch {
    return 'Aangevraagd'
  }
}

export function RequestReintakeButton({
  clientId,
  clientName,
  requestedAt,
  variant = 'inline',
}: RequestReintakeButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  // Optimistic local copy so we reflect the new state without a route refresh.
  const [localRequestedAt, setLocalRequestedAt] = useState<string | null>(
    requestedAt ?? null,
  )

  const isActive = !!localRequestedAt

  async function handleClick() {
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/clients/request-reintake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clear: isActive }),
      })

      const data = (await res.json()) as {
        error?: string
        cleared?: boolean
        requested_at?: string | null
      }

      if (!res.ok) {
        throw new Error(data.error || 'Er ging iets mis')
      }

      setLocalRequestedAt(data.requested_at ?? null)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2400)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fout'
      setErrorMsg(msg)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  // ─ Tokens (v3 Orion) ───────────────────────────────────────────
  const INK = '#FDFDFE'
  const INK_MUTED = 'rgba(253,253,254,0.62)'
  const CARD = '#474B48'
  const LIME = '#C0FC01'
  const AMBER = '#E8A93C'

  // ─ Style per state ─────────────────────────────────────────────
  const bg =
    status === 'success'
      ? 'rgba(192,252,1,0.14)'
      : status === 'error'
        ? 'rgba(232,169,60,0.18)'
        : isActive
          ? 'rgba(232,169,60,0.16)'
          : CARD
  const fg =
    status === 'success'
      ? LIME
      : status === 'error'
        ? AMBER
        : isActive
          ? AMBER
          : INK

  const icon =
    status === 'loading' ? (
      <Loader2 strokeWidth={1.75} className="w-4 h-4 animate-spin" />
    ) : status === 'success' ? (
      <Check strokeWidth={2} className="w-4 h-4" />
    ) : status === 'error' ? (
      <AlertCircle strokeWidth={1.75} className="w-4 h-4" />
    ) : isActive ? (
      <X strokeWidth={1.75} className="w-4 h-4" />
    ) : (
      <FileText strokeWidth={1.75} className="w-4 h-4" />
    )

  const idleLabel = isActive
    ? localRequestedAt
      ? formatRequestedLabel(localRequestedAt)
      : 'Aangevraagd'
    : variant === 'chip'
      ? 'Intake vragen'
      : 'Intake opnieuw vragen'

  const label =
    status === 'loading'
      ? isActive
        ? 'Annuleren…'
        : 'Vragen…'
      : status === 'success'
        ? isActive
          ? 'Aangevraagd'
          : 'Geannuleerd'
        : status === 'error'
          ? errorMsg || 'Fout'
          : idleLabel

  const title = isActive
    ? `Intake-vraag annuleren voor ${clientName}`
    : `${clientName} vragen om intake opnieuw in te vullen`

  // ─ Chip variant — compact voor in headers ──────────────────────
  if (variant === 'chip') {
    return (
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[12.5px] font-medium transition-all disabled:opacity-60"
        style={{
          background: bg,
          color: fg,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
        }}
        title={title}
        aria-label={title}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
      </button>
    )
  }

  // ─ Inline variant — full-width actie ──────────────────────────
  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-60"
      style={{
        background: bg,
        color: fg,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
      }}
      title={title}
    >
      {icon}
      <span>{label}</span>
      {status === 'idle' && !isActive && variant === 'inline' && (
        <span
          className="text-[11px] font-normal"
          style={{ color: INK_MUTED }}
        >
          · {clientName}
        </span>
      )}
    </button>
  )
}
