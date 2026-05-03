'use client'

import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'

/**
 * MŌVE EmptyState primitive.
 *
 * Use voor "geen data nog" route-states (geen actief programma, geen logs,
 * geen messages). Niet voor laad-states (gebruik skeletons).
 *
 * Adapteert via `var(--card-text*)` tokens. Lime-soft icon-circle, dark title,
 * muted description, lime CTA button.
 *
 * Backward-compatible: ondersteunt nog `action` (legacy) naast `cta`.
 */

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  /** Primaire CTA. */
  cta?: EmptyStateAction
  /** Secundaire ghost-CTA, optioneel. */
  secondaryCta?: EmptyStateAction
  /** @deprecated — gebruik `cta`. Kept voor backward compat. */
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  secondaryCta,
  action,
  className = '',
}: Props) {
  const primary = cta || action
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`.trim()}
      style={{ color: 'var(--card-text, #1C1E18)' }}
    >
      {Icon && (
        <div
          aria-hidden="true"
          className="flex items-center justify-center mb-5"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(192,252,1,0.14)',
          }}
        >
          <Icon
            size={28}
            strokeWidth={1.5}
            style={{ color: 'var(--card-text, #1C1E18)' }}
          />
        </div>
      )}
      <h3
        className="text-[18px] font-medium tracking-tight"
        style={{
          color: 'var(--card-text, #1C1E18)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="mt-2 text-[14px] max-w-[28ch]"
          style={{
            color: 'var(--card-text-muted, rgba(28,30,24,0.62))',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {(primary || secondaryCta) && (
        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-[260px]">
          {primary && renderAction(primary, ctaStyle)}
          {secondaryCta && renderAction(secondaryCta, secondaryStyle)}
        </div>
      )}
    </div>
  )
}

function renderAction(a: EmptyStateAction, style: React.CSSProperties) {
  if (a.href) {
    return (
      <Link href={a.href} className="w-full" style={style}>
        {a.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={a.onClick} className="w-full" style={style}>
      {a.label}
    </button>
  )
}

const ctaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  padding: '12px 20px',
  borderRadius: 14,
  background: '#C0FC01',
  color: '#0A0E0B',
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: '-0.003em',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
}

const secondaryStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  padding: '12px 20px',
  borderRadius: 14,
  background: 'transparent',
  color: 'var(--card-text, #1C1E18)',
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: '-0.003em',
  textDecoration: 'none',
  border: '1px solid var(--card-border, rgba(28,30,24,0.14))',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
}
