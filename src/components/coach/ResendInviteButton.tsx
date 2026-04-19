'use client'

import { useState } from 'react'
import { Mail, Check, Loader2, AlertCircle } from 'lucide-react'

/**
 * ResendInviteButton — v3 Orion stijl.
 *
 * Eerder: lichte knop (#F5F5F5 bg + #FDFDFE text) = wit-op-wit onleesbaar op
 * v3 olive-canvas. Nu dark card + amber/lime states die passen bij de rest.
 *
 * Gebruikt /api/clients/resend-invite (magiclink → invite → recovery fallback).
 * Variant prop: 'chip' = compact naast chat-icoon, 'inline' = volledige knop.
 */
interface ResendInviteButtonProps {
  clientId: string
  clientName: string
  variant?: 'chip' | 'inline'
}

export function ResendInviteButton({
  clientId,
  clientName,
  variant = 'inline',
}: ResendInviteButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleResend() {
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/clients/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Er ging iets mis')
      }

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
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
        : CARD
  const fg =
    status === 'success' ? LIME : status === 'error' ? AMBER : INK

  const icon =
    status === 'loading' ? (
      <Loader2 strokeWidth={1.75} className="w-4 h-4 animate-spin" />
    ) : status === 'success' ? (
      <Check strokeWidth={2} className="w-4 h-4" />
    ) : status === 'error' ? (
      <AlertCircle strokeWidth={1.75} className="w-4 h-4" />
    ) : (
      <Mail strokeWidth={1.75} className="w-4 h-4" />
    )

  const label =
    status === 'loading'
      ? 'Versturen…'
      : status === 'success'
        ? 'Verstuurd'
        : status === 'error'
          ? errorMsg || 'Fout'
          : variant === 'chip'
            ? 'Uitnodiging'
            : 'Uitnodiging opnieuw'

  // ─ Chip variant — compact voor in headers ──────────────────────
  if (variant === 'chip') {
    return (
      <button
        onClick={handleResend}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[12.5px] font-medium transition-all disabled:opacity-60"
        style={{
          background: bg,
          color: fg,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
        }}
        title={`Nieuwe uitnodigingslink sturen naar ${clientName}`}
        aria-label={`Uitnodiging opnieuw versturen naar ${clientName}`}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
      </button>
    )
  }

  // ─ Inline variant — full-width actie ──────────────────────────
  return (
    <button
      onClick={handleResend}
      disabled={status === 'loading'}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-60"
      style={{
        background: bg,
        color: fg,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
      }}
      title={`Nieuwe uitnodigingslink sturen naar ${clientName}`}
    >
      {icon}
      <span>{label}</span>
      {status === 'idle' && variant === 'inline' && (
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
