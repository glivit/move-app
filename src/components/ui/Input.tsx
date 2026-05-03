'use client'

import { forwardRef, InputHTMLAttributes, useId, useState } from 'react'

/**
 * Consolidated MŌVE input primitive.
 *
 * Two visual modes:
 *  - `floating` (default): floating-label pattern matching the auth forms
 *    (bottom-border, label drijft naar boven op focus/value, lime focus-line).
 *  - `static`: classic label-above-input — kept for compat met de coach-forms
 *    die de oude Input API gebruikten (label, error, hint, variant).
 *
 * Always:
 *  - min 44 px touch target via paddings.
 *  - `:focus-visible` ring (no `outline:none` without replacement).
 *  - `aria-invalid` + `aria-describedby` slot voor errors of helper text.
 *  - inputMode / enterKeyHint / autoComplete als first-class props (re-typed).
 *  - Decimal variant: tolereert komma + punt en normaliseert naar punt op blur.
 */

type Mode = 'floating' | 'static'
type Variant = 'default' | 'clean' | 'dark'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string
  error?: string
  helper?: string
  /** legacy prop — alias of `helper`, kept for compat met oude Input API */
  hint?: string
  /** layout mode — defaults to 'static' (backward compat with coach forms);
   *  pass 'floating' for the new floating-label visual used in auth/onboarding. */
  mode?: Mode
  /** kleur-context (alleen relevant voor mode="static") */
  variant?: Variant
  /** Decimal-tolerant change: vervangt komma → punt op blur. */
  decimal?: boolean
  /** Lime focus-line (floating mode only). */
  accentColor?: string
  endAdornment?: React.ReactNode
  /** Floating mode: trigger entrance slide-up animation with this delay (ms). */
  animationDelay?: number
  /** Floating mode kleur-context: 'dark' = MŌVE dark card (auth login),
   *  'light' = ivory card (set-password / reset-password). Default 'dark'. */
  theme?: 'dark' | 'light'
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const LIME = '#C0FC01'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helper,
    hint,
    mode = 'static',
    variant = 'default',
    decimal = false,
    accentColor = LIME,
    endAdornment,
    animationDelay,
    theme = 'dark',
    className = '',
    id,
    value,
    onChange,
    onFocus,
    onBlur,
    inputMode,
    enterKeyHint,
    autoComplete,
    type = 'text',
    style,
    ...rest
  },
  ref,
) {
  const reactId = useId()
  const inputId = id || `inp-${reactId}`
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`
  const describedBy =
    [error ? errorId : null, helper || hint ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined

  const [focused, setFocused] = useState(false)
  const stringVal = typeof value === 'string' ? value : value == null ? '' : String(value)
  const isActive = focused || stringVal.length > 0

  const resolvedMode: Mode = mode

  // ── Floating-label mode ────────────────────────────────────────────
  if (resolvedMode === 'floating') {
    const wrapperStyle: React.CSSProperties =
      animationDelay !== undefined
        ? {
            opacity: 0,
            animation: `slide-up 600ms cubic-bezier(0.16, 1, 0.3, 1) ${animationDelay}ms forwards`,
          }
        : {}

    const isLight = theme === 'light'
    // Tokens — donker (default) versus licht (auth set/reset password card).
    const inkText = isLight ? '#1A1917' : '#FDFDFE'
    const labelDim = isLight ? 'rgba(26,25,23,0.55)' : 'rgba(253,253,254,0.52)'
    const labelActive = isLight ? 'rgba(26,25,23,0.65)' : 'rgba(253,253,254,0.62)'
    const labelFocus = isLight ? '#1A1917' : accentColor
    const baseBorder = isLight ? 'rgba(26,25,23,0.18)' : 'rgba(253,253,254,0.18)'
    const helperColor = isLight ? 'rgba(26,25,23,0.55)' : 'rgba(253,253,254,0.55)'
    const errorColor = '#E07A5F'

    return (
      <div className={`floating-input ${className}`.trim()} style={wrapperStyle}>
        <div className="relative" style={{ paddingTop: 22, paddingBottom: 13 }}>
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            onChange={onChange}
            onFocus={(e) => {
              setFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              if (decimal && onChange && typeof e.target.value === 'string') {
                const v = e.target.value
                const norm = v.replace(',', '.')
                if (norm !== v) {
                  e.target.value = norm
                  onChange({
                    ...e,
                    target: e.target,
                    currentTarget: e.target,
                  } as React.ChangeEvent<HTMLInputElement>)
                }
              }
              onBlur?.(e)
            }}
            inputMode={inputMode || (decimal ? 'decimal' : undefined)}
            enterKeyHint={enterKeyHint}
            autoComplete={autoComplete}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            placeholder=" "
            style={{
              width: '100%',
              minHeight: 28,
              background: 'transparent',
              border: 'none',
              borderBottom: `1.5px solid ${error ? errorColor : baseBorder}`,
              borderRadius: 0,
              padding: '8px 0 10px',
              paddingRight: endAdornment ? 40 : 0,
              fontSize: 16, // 16px voorkomt iOS zoom
              color: inkText,
              outline: 'none',
              fontFamily: 'inherit',
              WebkitAppearance: 'none',
              appearance: 'none',
              transition: 'border-color 300ms cubic-bezier(0.16,1,0.3,1)',
              ...style,
            }}
            {...rest}
          />
          {label && (
            <label
              htmlFor={inputId}
              className="pointer-events-none absolute"
              style={{
                left: 0,
                top: isActive ? 4 : 28,
                fontSize: isActive ? 11 : 15,
                letterSpacing: isActive ? '0.08em' : '-0.003em',
                textTransform: isActive ? 'uppercase' : 'none',
                fontWeight: isActive ? 600 : 400,
                color: focused ? labelFocus : isActive ? labelActive : labelDim,
                transition: 'all 250ms cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {label}
            </label>
          )}
          {/* Focus-lijn die uitrolt — vervangt de globale outline */}
          <div
            className="absolute left-0"
            aria-hidden="true"
            style={{
              bottom: 10,
              height: 1.5,
              background: error ? errorColor : isLight ? '#1A1917' : accentColor,
              width: focused || error ? '100%' : '0%',
              transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          {endAdornment && (
            <div className="absolute" style={{ right: 0, top: 22 }}>
              {endAdornment}
            </div>
          )}
        </div>
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-[12px]"
            style={{ color: errorColor, letterSpacing: '0.01em' }}
          >
            {error}
          </p>
        ) : helper || hint ? (
          <p
            id={helperId}
            className="mt-1.5 text-[12px]"
            style={{ color: helperColor }}
          >
            {helper || hint}
          </p>
        ) : null}
      </div>
    )
  }

  // ── Static-label mode (compat met oude coach forms) ────────────────
  const isClean = variant === 'clean'
  const isDark = variant === 'dark'
  const baseStyles = isClean
    ? 'bg-client-surface-muted border-0 rounded-2xl'
    : isDark
      ? 'bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.14)] rounded-2xl text-[#FDFDFE]'
      : 'bg-surface border border-border rounded-2xl'

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-[13px] font-medium ${
            isDark ? 'text-[rgba(253,253,254,0.72)]' : 'text-text-secondary'
          }`}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        inputMode={inputMode || (decimal ? 'decimal' : undefined)}
        enterKeyHint={enterKeyHint}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`
          w-full px-5 text-[15px] min-h-[44px]
          ${baseStyles}
          ${isDark ? 'placeholder:text-[rgba(253,253,254,0.5)]' : 'text-text-primary placeholder:text-text-muted'}
          transition-colors duration-150 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[#E07A5F]' : ''}
          ${className}
        `.trim()}
        style={style}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-[#E07A5F]">
          {error}
        </p>
      ) : helper || hint ? (
        <p id={helperId} className="text-sm text-text-muted">
          {helper || hint}
        </p>
      ) : null}
    </div>
  )
})

Input.displayName = 'Input'
