'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/Input'

/* ─── v6 Orion tokens (inline omdat login pre-auth draait zonder globals
 *     garantie) ─────────────────────────────────────────────────────────
 *   canvas   = #8E9890   (app background)
 *   dark card= #474B48   (form surface)
 *   ink      = #FDFDFE   (primary text)
 *   lime     = #C0FC01   (primary action)
 *   ink-dark = #0A0E0B   (text op lime)
 */

/* ─── Floating-label input op dark card ───────────────────────────────
 * Bottom-border stijl, label drijft naar boven en kleint op focus/value.
 * Focus-lijn is lime voor brand-consistentie.
 */
function FloatingInput({
  id,
  type,
  value,
  onChange,
  label,
  autoComplete,
  delay = 0,
  endAdornment,
}: {
  id: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  autoComplete: string
  delay?: number
  endAdornment?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  const isActive = focused || value.length > 0

  return (
    <div
      className="relative opacity-0 animate-slide-up"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      <div className="relative" style={{ paddingTop: 22, paddingBottom: 12 }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          autoComplete={autoComplete}
          placeholder=" "
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1.5px solid rgba(253,253,254,0.18)',
            borderRadius: 0,
            padding: '8px 0 10px',
            paddingRight: endAdornment ? 40 : 0,
            fontSize: 16, // 16px voorkomt iOS zoom
            color: '#FDFDFE',
            outline: 'none',
            fontFamily: 'inherit',
            WebkitAppearance: 'none',
            appearance: 'none',
            transition: 'border-color 300ms cubic-bezier(0.16,1,0.3,1)',
          }}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: isActive ? 4 : 28,
            fontSize: isActive ? 11 : 15,
            letterSpacing: isActive ? '0.08em' : '-0.003em',
            textTransform: isActive ? 'uppercase' : 'none',
            fontWeight: isActive ? 600 : 400,
            color: focused
              ? '#C0FC01'
              : isActive
                ? 'rgba(253,253,254,0.62)'
                : 'rgba(253,253,254,0.52)',
            transition: 'all 250ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {label}
        </label>
        {/* Focus-lijn die van links naar rechts uitrolt in lime */}
        <div
          className="absolute left-0"
          style={{
            bottom: 10,
            height: 1.5,
            background: '#C0FC01',
            width: focused ? '100%' : '0%',
            transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
          }}
        />
        {endAdornment && (
          <div
            className="absolute"
            style={{
              right: 0,
              top: 22,
            }}
          >
            {endAdornment}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Success sweep overlay — v6 lime sweep ─────────────────────────
 * Hetzelfde concept als voorheen maar in brand-kleur: lime sweep van
 * onderaan, donkere tekst op lime (matches v6 action pattern).
 */
function SuccessSweep({ active, userName }: { active: boolean; userName: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          background: '#C0FC01',
          height: active ? '100%' : '0%',
          transition: active ? 'height 0.7s cubic-bezier(0.65,0,0.35,1)' : 'none',
        }}
      />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          gap: 12,
          opacity: active ? 1 : 0,
          transition: active ? 'opacity 0.5s 0.6s cubic-bezier(0.16,1,0.3,1)' : 'none',
        }}
      >
        <h2
          style={{
            fontSize: 38,
            fontWeight: 300,
            letterSpacing: '-0.025em',
            color: '#0A0E0B',
            opacity: active ? 1 : 0,
            transform: active ? 'translateY(0)' : 'translateY(16px)',
            transition: active ? 'all 0.6s 0.75s cubic-bezier(0.16,1,0.3,1)' : 'none',
          }}
        >
          Welkom, {userName || 'daar'}
        </h2>
        <div
          className="flex"
          style={{
            gap: 6,
            opacity: active ? 1 : 0,
            transition: active ? 'opacity 0.4s 1.1s' : 'none',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 9999,
                background: 'rgba(10,14,11,0.35)',
                animation: active ? `pulse-dot 1.2s ${1.2 + i * 0.2}s ease-in-out infinite` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Login core ──────────────────────────────────────────────────── */
function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [oauthLoading, setOAuthLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState(searchParams.get('error') || '')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [userName, setUserName] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        router.replace(profile?.role === 'coach' ? '/coach' : '/client')
      } else {
        setLoading(false)
        requestAnimationFrame(() => setMounted(true))
      }
    }
    checkAuth()
  }, [router])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Ongeldige inloggegevens. Probeer opnieuw.')
      setFormLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name')
        .eq('id', data.user.id)
        .single()

      setFormLoading(false)
      setUserName(profile?.first_name || '')
      setLoginSuccess(true)

      setTimeout(() => {
        router.push(profile?.role === 'coach' ? '/coach' : '/client')
        router.refresh()
      }, 1800)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setOAuthLoading(provider)
    setError('')

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        if (
          authError.message?.includes('provider is not enabled') ||
          authError.message?.includes('Unsupported provider')
        ) {
          setError(`${provider === 'google' ? 'Google' : 'Apple'} login is nog niet geconfigureerd.`)
        } else {
          setError('Er ging iets mis met inloggen. Probeer opnieuw.')
        }
        setOAuthLoading(null)
      }
    } catch {
      setError('Er ging iets mis met inloggen. Probeer opnieuw.')
      setOAuthLoading(null)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Vul je e-mailadres in.')
      return
    }
    setResetLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Er ging iets mis. Probeer opnieuw.')
      } else {
        setResetSent(true)
      }
    } catch {
      setError('Verbindingsfout. Controleer je internet en probeer opnieuw.')
    }
    setResetLoading(false)
  }

  /* ─── Loading splash — v6 Orion ────────────────────────────────── */
  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#8E9890' }}
      >
        {/* LCP-element — geen fade-in zodat Lighthouse niet de animation
         *  als delay meet (perf-report L1). */}
        <h1
          className="text-7xl"
          style={{
            fontFamily: 'var(--font-sans, Outfit), Outfit, sans-serif',
            color: '#FDFDFE',
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          MŌVE
        </h1>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes check-pop {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake-in {
          0% { opacity: 0; transform: translateX(-8px); }
          40% { transform: translateX(4px); }
          70% { transform: translateX(-2px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        /* Autofill op dark card — forceer donkere surface + witte tekst */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #474B48 inset !important;
          -webkit-text-fill-color: #FDFDFE !important;
          caret-color: #FDFDFE;
        }
      `}</style>

      <div
        className="relative flex min-h-screen flex-col items-center overflow-hidden"
        style={{ background: '#8E9890' }}
      >
        {/* Subtiele radial vignette om de card te laten zweven */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(120% 80% at 50% 0%, rgba(253,253,254,0.04), transparent 60%)',
          }}
        />

        {/* Success sweep — lime overlay bij succesvolle login */}
        <SuccessSweep active={loginSuccess} userName={userName} />

        <div
          ref={formRef}
          className="flex w-full flex-1 flex-col"
          style={{
            maxWidth: 380,
            padding: '0 22px',
          }}
        >
          {/* ─── Logo + subtitle ─────────────────────────────────── */}
          <div
            style={{
              paddingTop: 96,
              paddingBottom: 28,
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.6s 0.1s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <h1
              style={{
                fontSize: 64,
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: '-0.035em',
                color: '#FDFDFE',
                margin: 0,
              }}
            >
              MŌVE
            </h1>
            <p
              style={{
                marginTop: 10,
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(253,253,254,0.62)',
                letterSpacing: '0.01em',
              }}
            >
              {resetMode
                ? 'Vul je e-mail in voor een reset-link'
                : 'Welkom terug. Log in om verder te gaan.'}
            </p>
          </div>

          {/* ─── Form card — donkere v6 surface ──────────────────── */}
          <div
            className="opacity-0 animate-slide-up"
            style={{
              background: '#474B48',
              borderRadius: 24,
              padding: '20px 22px 24px',
              boxShadow:
                '0 1px 0 rgba(253,253,254,0.06) inset, 0 20px 60px -20px rgba(10,14,11,0.35)',
              animationDelay: '100ms',
              animationFillMode: 'forwards',
            }}
          >
            {/* Error banner — amber op dark */}
            {error && (
              <div
                style={{
                  marginBottom: 10,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(232,169,60,0.10)',
                  border: '1px solid rgba(232,169,60,0.26)',
                  animation: 'shake-in 0.4s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    margin: 0,
                    color: '#E8A93C',
                    lineHeight: 1.4,
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Reset sent success */}
            {resetMode && resetSent ? (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px 16px',
                    borderRadius: 14,
                    background: 'rgba(192,252,1,0.08)',
                    border: '1px solid rgba(192,252,1,0.26)',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#C0FC01',
                      margin: '0 auto 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A0E0B" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="5 13 9 17 19 7" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#FDFDFE' }}>
                    E-mail verstuurd
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(253,253,254,0.62)' }}>
                    Check je inbox voor de reset-link.
                  </p>
                </div>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(253,253,254,0.78)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Terug naar inloggen
                </button>
              </div>
            ) : resetMode ? (
              /* Reset form */
              <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column' }}>
                <Input
                  mode="floating"
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="E-mailadres"
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="send"
                  animationDelay={0}
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    marginTop: 24,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '16px 20px',
                    borderRadius: 16,
                    background: '#C0FC01',
                    color: '#0A0E0B',
                    border: 'none',
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '-0.003em',
                    cursor: resetLoading ? 'default' : 'pointer',
                    opacity: resetLoading ? 0.7 : 1,
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'opacity 200ms',
                  }}
                >
                  {resetLoading ? (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: '2px solid rgba(10,14,11,0.25)',
                        borderTopColor: '#0A0E0B',
                        animation: 'spin 800ms linear infinite',
                      }}
                    />
                  ) : (
                    'Verstuur reset-link'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError('') }}
                  style={{
                    marginTop: 14,
                    width: '100%',
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 12,
                    color: 'rgba(253,253,254,0.62)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Terug naar inloggen
                </button>
              </form>
            ) : (
              /* Login form */
              <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column' }}>
                <Input
                  mode="floating"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="E-mailadres"
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="next"
                  animationDelay={200}
                />

                <Input
                  mode="floating"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label="Wachtwoord"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  animationDelay={320}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        padding: 8,
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(253,253,254,0.62)',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                    </button>
                  }
                />

                {/* Forgot password */}
                <div
                  className="opacity-0 animate-slide-up"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: 6,
                    animationDelay: '420ms',
                    animationFillMode: 'forwards',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError('') }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 12,
                      color: 'rgba(253,253,254,0.62)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: 4,
                      WebkitTapHighlightColor: 'transparent',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>

                {/* Submit — lime primary action */}
                <div
                  className="opacity-0 animate-slide-up"
                  style={{ animationDelay: '520ms', animationFillMode: 'forwards' }}
                >
                  <button
                    type="submit"
                    disabled={formLoading || loginSuccess}
                    style={{
                      marginTop: 22,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '16px 20px',
                      borderRadius: 16,
                      background: loginSuccess ? '#C0FC01' : '#C0FC01',
                      color: '#0A0E0B',
                      border: 'none',
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: '-0.003em',
                      cursor: formLoading || loginSuccess ? 'default' : 'pointer',
                      opacity: formLoading ? 0.7 : 1,
                      fontFamily: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'opacity 200ms, transform 200ms',
                    }}
                  >
                    {formLoading ? (
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '2px solid rgba(10,14,11,0.25)',
                          borderTopColor: '#0A0E0B',
                          animation: 'spin 800ms linear infinite',
                        }}
                      />
                    ) : loginSuccess ? (
                      <svg
                        width={22}
                        height={22}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0A0E0B"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ animation: 'check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <>
                        <span>Inloggen</span>
                        <svg
                          width={18}
                          height={18}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ─── OAuth + signup footer ──────────────────────────── */}
          {!resetMode && !resetSent && (
            <div
              className="opacity-0 animate-fade-in"
              style={{
                paddingTop: 28,
                paddingBottom: 40,
                animationDelay: '640ms',
                animationFillMode: 'forwards',
              }}
            >
              {/* OR-divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'rgba(253,253,254,0.14)' }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(253,253,254,0.52)',
                  }}
                >
                  of
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(253,253,254,0.14)' }} />
              </div>

              {/* OAuth buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 26 }}>
                <button
                  onClick={() => handleOAuthLogin('google')}
                  disabled={oauthLoading !== null}
                  aria-label="Log in met Google"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#FDFDFE',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: oauthLoading !== null ? 'default' : 'pointer',
                    opacity: oauthLoading !== null && oauthLoading !== 'google' ? 0.5 : 1,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'transform 200ms, opacity 200ms',
                  }}
                >
                  {oauthLoading === 'google' ? (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '2px solid rgba(10,14,11,0.2)',
                        borderTopColor: '#0A0E0B',
                        animation: 'spin 800ms linear infinite',
                      }}
                    />
                  ) : (
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleOAuthLogin('apple')}
                  disabled={oauthLoading !== null}
                  aria-label="Log in met Apple"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#0A0E0B',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: oauthLoading !== null ? 'default' : 'pointer',
                    opacity: oauthLoading !== null && oauthLoading !== 'apple' ? 0.5 : 1,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'transform 200ms, opacity 200ms',
                  }}
                >
                  {oauthLoading === 'apple' ? (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '2px solid rgba(253,253,254,0.3)',
                        borderTopColor: '#FDFDFE',
                        animation: 'spin 800ms linear infinite',
                      }}
                    />
                  ) : (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="#FDFDFE">
                      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.18 0-.36-.02-.53-.06-.01-.18-.04-.56-.04-.95 0-1.05.546-2.22 1.223-2.98.34-.38.77-.73 1.275-.98.51-.26 1.003-.41 1.48-.44.02.25.04.5.04.75zm4.035 12.15c-.04.01-2.098.81-2.098 3.33 0 2.97 2.602 4.02 2.682 4.04-.02.07-.41 1.44-1.378 2.85-.858 1.24-1.756 2.48-3.172 2.48-1.396 0-1.852-.83-3.449-.83-1.558 0-2.134.85-3.43.85-1.296 0-2.174-1.15-3.172-2.57C5.04 22.1 4.05 19.23 4.05 16.5c0-4.24 2.77-6.49 5.498-6.49 1.417 0 2.597.93 3.49.93.853 0 2.18-.99 3.796-.99.614 0 2.822.18 4.282 1.38-.11.07-2.556 1.49-2.556 4.45v-.17z" />
                    </svg>
                  )}
                </button>
              </div>

              <p
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'rgba(253,253,254,0.62)',
                  margin: 0,
                }}
              >
                Nog geen account?{' '}
                <a
                  href="mailto:contact@movecoaching.be"
                  style={{
                    fontWeight: 600,
                    color: '#FDFDFE',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  Neem contact op
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: '#8E9890' }}
        >
          <h1
            className="text-7xl"
            style={{
              fontFamily: 'var(--font-sans, Outfit), Outfit, sans-serif',
              color: '#FDFDFE',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            MŌVE
          </h1>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  )
}
