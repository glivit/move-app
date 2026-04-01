'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

/* ─── Underline input with floating label ─────────── */
function UnderlineInput({
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
    <div className="relative opacity-0 animate-slide-up" style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
      <div className="relative py-6">
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
          className="w-full border-0 border-b-[1.5px] border-[#D5D1C9] bg-transparent px-0 pt-2 pb-3 text-[16px] text-[#1A1917] outline-none transition-colors duration-300 focus:border-[#1A1917] placeholder:text-transparent"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-0 transition-all duration-250"
          style={{
            top: isActive ? '12px' : '28px',
            fontSize: isActive ? '11px' : '15px',
            letterSpacing: isActive ? '1.5px' : '0',
            textTransform: isActive ? 'uppercase' : 'none',
            fontWeight: isActive ? 500 : 400,
            color: focused ? '#1A1917' : '#A09D96',
            fontFamily: 'var(--font-body)',
          }}
        >
          {label}
        </label>
        {/* Focus line that expands */}
        <div className="absolute bottom-3 left-0 h-[1.5px] bg-[#1A1917] transition-all duration-400" style={{ width: focused ? '100%' : '0%', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }} />
        {endAdornment && (
          <div className="absolute right-0 top-[28px]">
            {endAdornment}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Success sweep overlay ───────────────────────── */
function SuccessSweep({ active, userName }: { active: boolean; userName: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {/* Dark sweep from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#1A1917]"
        style={{
          height: active ? '100%' : '0%',
          transition: active ? 'height 0.7s cubic-bezier(0.65, 0, 0.35, 1)' : 'none',
        }}
      />
      {/* Welcome message */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
        style={{
          opacity: active ? 1 : 0,
          transition: active ? 'opacity 0.5s 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
      >
        <h2
          className="text-[38px] font-semibold tracking-tight text-[#EEEBE3]"
          style={{
            fontFamily: 'var(--font-display)',
            opacity: active ? 1 : 0,
            transform: active ? 'translateY(0)' : 'translateY(16px)',
            transition: active ? 'all 0.6s 0.75s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}
        >
          Welkom, {userName || 'daar'}
        </h2>
        <div
          className="flex gap-1.5"
          style={{
            opacity: active ? 1 : 0,
            transition: active ? 'opacity 0.4s 1.1s' : 'none',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[5px] w-[5px] rounded-full bg-[#EEEBE3]/30"
              style={{
                animation: active ? `pulse-dot 1.2s ${1.2 + i * 0.2}s ease-in-out infinite` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main login component ───────────────────────── */
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

      // Trigger success animation
      setFormLoading(false)
      setUserName(profile?.first_name || '')
      setLoginSuccess(true)

      // Navigate after sweep animation completes
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
        if (authError.message?.includes('provider is not enabled') || authError.message?.includes('Unsupported provider')) {
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

  /* ─── Loading splash ───────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EEEBE3]">
        <h1 className="text-7xl font-semibold tracking-tight text-[#1A1917] animate-fade-in" style={{ fontFamily: 'var(--font-display)' }}>
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
      `}</style>

      <div className="relative flex min-h-screen flex-col items-center bg-[#EEEBE3] overflow-hidden">

        {/* ─── Success sweep overlay ─── */}
        <SuccessSweep active={loginSuccess} userName={userName} />

        {/* ─── Single-column centered layout ─── */}
        <div className="flex w-full max-w-[340px] flex-1 flex-col px-6 sm:px-0" ref={formRef}>

          {/* ─── Logo section ─── */}
          <div className="pt-[140px] pb-2" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <h1 className="text-[64px] font-semibold leading-none tracking-[-2px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)' }}>
              MŌVE
            </h1>
            <p className="mt-2 text-[15px] font-light tracking-[0.2px] text-[#A09D96]" style={{ fontFamily: 'var(--font-body)' }}>
              {resetMode ? 'Vul je e-mail in voor een reset-link' : 'Log in op je account'}
            </p>
          </div>

          {/* ─── Form section ─── */}
          <div className="flex flex-1 flex-col pt-12">

            {/* Error */}
            {error && (
              <div className="mb-2 rounded-xl border border-[#C4372A]/10 bg-[#C4372A]/[0.06] px-4 py-3.5" style={{ animation: 'shake-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <p className="text-[13px] text-[#C4372A]">{error}</p>
              </div>
            )}

            {/* Reset sent success */}
            {resetMode && resetSent ? (
              <div className="space-y-5 animate-fade-in">
                <div className="rounded-xl border border-[#3D8B5C]/10 bg-[#3D8B5C]/[0.06] px-4 py-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#3D8B5C]/10">
                    <svg className="h-6 w-6 text-[#3D8B5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#3D8B5C]">E-mail verstuurd!</p>
                  <p className="mt-1 text-xs text-[#3D8B5C]/70">Check je inbox voor de reset-link.</p>
                </div>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                  className="w-full text-sm font-medium text-[#1A1917] transition-opacity hover:opacity-60"
                >
                  Terug naar inloggen
                </button>
              </div>
            ) : resetMode ? (
              /* Reset form */
              <form onSubmit={handlePasswordReset} className="flex flex-col">
                <UnderlineInput
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="E-mailadres"
                  autoComplete="email"
                  delay={0}
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A1917] py-[18px] text-[15px] font-medium tracking-[0.3px] text-[#EEEBE3] transition-all duration-200 hover:bg-[#333330] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#EEEBE3]/30 border-t-[#EEEBE3]" />
                  ) : (
                    'Verstuur reset-link'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError('') }}
                  className="mt-5 w-full text-[13px] text-[#A09D96] transition-colors duration-200 hover:text-[#1A1917]"
                >
                  Terug naar inloggen
                </button>
              </form>
            ) : (
              /* Login form */
              <form onSubmit={handlePasswordLogin} className="flex flex-col">
                <UnderlineInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="E-mailadres"
                  autoComplete="email"
                  delay={200}
                />

                <UnderlineInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label="Wachtwoord"
                  autoComplete="current-password"
                  delay={350}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 text-[#A09D96] transition-colors duration-200 hover:text-[#1A1917]"
                      aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />

                {/* Forgot password */}
                <div className="flex justify-end pt-3 opacity-0 animate-slide-up" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError('') }}
                    className="text-[13px] text-[#A09D96] transition-colors duration-200 hover:text-[#1A1917]"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>

                {/* Submit button */}
                <div className="opacity-0 animate-slide-up" style={{ animationDelay: '550ms', animationFillMode: 'forwards' }}>
                  <button
                    type="submit"
                    disabled={formLoading || loginSuccess}
                    className={`group mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-[18px] text-[15px] font-medium tracking-[0.3px] transition-all duration-300 disabled:cursor-not-allowed ${loginSuccess ? 'bg-[#3D8B5C] text-white' : 'bg-[#1A1917] text-[#EEEBE3] hover:bg-[#333330] hover:shadow-[0_8px_24px_rgba(26,25,23,0.15)] active:scale-[0.98] disabled:opacity-60'}`}
                  >
                    {formLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#EEEBE3]/30 border-t-[#EEEBE3]" />
                    ) : loginSuccess ? (
                      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <>
                        Inloggen
                        <svg className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ─── Bottom: OAuth + contact ─── */}
          {!resetMode && !resetSent && (
            <div className="pb-12 pt-8 opacity-0 animate-fade-in" style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}>
              {/* OAuth icon buttons */}
              <div className="flex justify-center gap-4 mb-6">
                <button
                  onClick={() => handleOAuthLogin('google')}
                  disabled={oauthLoading !== null}
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[1.5px] border-[#D5D1C9] bg-transparent transition-all duration-250 hover:border-[#A09D96] hover:bg-white/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Log in met Google"
                >
                  {oauthLoading === 'google' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1917]/20 border-t-[#1A1917]" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleOAuthLogin('apple')}
                  disabled={oauthLoading !== null}
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1A1917] transition-all duration-250 hover:bg-[#333330] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Log in met Apple"
                >
                  {oauthLoading === 'apple' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="white">
                      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.18 0-.36-.02-.53-.06-.01-.18-.04-.56-.04-.95 0-1.05.546-2.22 1.223-2.98.34-.38.77-.73 1.275-.98.51-.26 1.003-.41 1.48-.44.02.25.04.5.04.75zm4.035 12.15c-.04.01-2.098.81-2.098 3.33 0 2.97 2.602 4.02 2.682 4.04-.02.07-.41 1.44-1.378 2.85-.858 1.24-1.756 2.48-3.172 2.48-1.396 0-1.852-.83-3.449-.83-1.558 0-2.134.85-3.43.85-1.296 0-2.174-1.15-3.172-2.57C5.04 22.1 4.05 19.23 4.05 16.5c0-4.24 2.77-6.49 5.498-6.49 1.417 0 2.597.93 3.49.93.853 0 2.18-.99 3.796-.99.614 0 2.822.18 4.282 1.38-.11.07-2.556 1.49-2.556 4.45v-.17z"/>
                    </svg>
                  )}
                </button>
              </div>

              <p className="text-center text-[13px] text-[#A09D96]">
                Nog geen account?{' '}
                <a href="mailto:contact@movecoaching.be" className="font-medium text-[#1A1917] transition-opacity duration-200 hover:opacity-60">
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
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#EEEBE3]">
        <h1 className="text-7xl font-semibold tracking-tight text-[#1A1917]" style={{ fontFamily: 'var(--font-display)' }}>
          MŌVE
        </h1>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}
