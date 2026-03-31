'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

/* ─── Animated background shapes ─────────────────── */
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large soft circle */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #1A1917 0%, transparent 70%)',
          animation: 'float-slow 20s ease-in-out infinite',
        }}
      />
      {/* Medium circle bottom-left */}
      <div
        className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle, #1A1917 0%, transparent 70%)',
          animation: 'float-slow 25s ease-in-out infinite reverse',
        }}
      />
      {/* Small accent dot */}
      <div
        className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-[#D46A3A] opacity-20"
        style={{ animation: 'pulse-dot 4s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 rounded-full bg-[#D46A3A] opacity-15"
        style={{ animation: 'pulse-dot 5s ease-in-out infinite 1s' }}
      />
    </div>
  )
}

/* ─── Animated input with floating label ─────────── */
function AnimatedInput({
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
      className="relative animate-slide-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div
        className={`
          relative rounded-2xl transition-all duration-300 ease-out
          ${focused
            ? 'bg-white ring-2 ring-[#1A1917] shadow-[0_4px_20px_rgba(26,25,23,0.08)]'
            : 'bg-[#F5F2EC] ring-1 ring-transparent hover:bg-[#F0EDE5]'
          }
        `}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          autoComplete={autoComplete}
          className={`
            w-full px-5 pt-6 pb-2.5 bg-transparent text-[#1A1917] text-[16px]
            focus:outline-none transition-all duration-200
            ${endAdornment ? 'pr-12' : 'pr-5'}
          `}
        />
        <label
          htmlFor={id}
          className={`
            absolute left-5 transition-all duration-200 ease-out pointer-events-none
            ${isActive
              ? 'top-2 text-[11px] font-medium tracking-wide uppercase text-[#A09D96]'
              : 'top-1/2 -translate-y-1/2 text-[15px] text-[#A09D96]'
            }
          `}
        >
          {label}
        </label>
        {endAdornment && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        )}
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
        // Small delay for mount animation
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
        .select('role')
        .eq('id', data.user.id)
        .single()
      router.push(profile?.role === 'coach' ? '/coach' : '/client')
      router.refresh()
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
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1
            className="text-7xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight"
            style={{ animation: 'fade-in 0.6s ease-out both' }}
          >
            MOVE
          </h1>
          <div
            className="w-8 h-8 border-2 border-[#1A1917]/20 border-t-[#1A1917] rounded-full animate-spin mx-auto"
          />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Custom keyframes for this page */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.02); }
          66% { transform: translate(-15px, 15px) scale(0.98); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }
        @keyframes shimmer-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes reveal-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .reveal-up {
          animation: reveal-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .reveal-scale {
          animation: reveal-scale 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div className="min-h-screen flex flex-col lg:flex-row bg-[#EEEBE3]">

        {/* ─── Left: Branding Panel ─────────────────── */}
        <div
          className={`
            relative w-full lg:w-[50%] xl:w-[55%] bg-[#EEEBE3]
            flex flex-col items-center justify-center
            px-8 py-16 lg:py-0 lg:min-h-screen overflow-hidden
            transition-opacity duration-700
            ${mounted ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <FloatingShapes />

          <div className="relative z-10 w-full max-w-md text-center lg:text-left space-y-12">
            {/* Logo */}
            <div className={mounted ? 'reveal-up' : 'opacity-0'} style={{ animationDelay: '100ms' }}>
              <h1 className="text-8xl lg:text-9xl font-[family-name:var(--font-display)] font-bold text-[#1A1917] tracking-tighter leading-none">
                MOVE
              </h1>
            </div>

            {/* Tagline */}
            <div
              className={mounted ? 'reveal-up' : 'opacity-0'}
              style={{ animationDelay: '250ms' }}
            >
              <p className="text-[#6B6862] text-lg lg:text-xl leading-relaxed max-w-sm">
                Jouw persoonlijke<br />coaching ervaring
              </p>
            </div>

            {/* Decorative line */}
            <div
              className={`h-[1px] w-16 bg-[#DDD9D0] mx-auto lg:mx-0 ${mounted ? 'reveal-up' : 'opacity-0'}`}
              style={{ animationDelay: '350ms' }}
            />

            {/* Subtle features - only on desktop */}
            <div
              className={`hidden lg:flex flex-col gap-3 ${mounted ? 'reveal-up' : 'opacity-0'}`}
              style={{ animationDelay: '450ms' }}
            >
              {['Training op maat', 'Voeding & lifestyle', 'Resultaat bijhouden'].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-[#D46A3A]" />
                  <span className="text-[#A09D96] text-sm tracking-wide">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Right: Form Panel ────────────────────── */}
        <div
          className={`
            w-full lg:w-[50%] xl:w-[45%]
            flex flex-col items-center justify-center
            px-6 sm:px-10 py-12 lg:py-0 lg:min-h-screen
          `}
        >
          <div
            ref={formRef}
            className={`
              w-full max-w-[420px] space-y-8
              ${mounted ? 'reveal-scale' : 'opacity-0'}
            `}
            style={{ animationDelay: '300ms' }}
          >
            {/* Form card */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_2px_24px_rgba(26,25,23,0.06)] space-y-7">

              {/* Heading */}
              <div className="space-y-1.5">
                <h2 className="text-3xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight">
                  {resetMode ? 'Wachtwoord resetten' : 'Welkom terug'}
                </h2>
                <p className="text-[#A09D96] text-[15px]">
                  {resetMode ? 'Vul je e-mail in voor een reset-link' : 'Log in op je account'}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-[#C4372A]/[0.06] border border-[#C4372A]/10 rounded-xl px-4 py-3 animate-scale-in">
                  <p className="text-sm text-[#C4372A]">{error}</p>
                </div>
              )}

              {/* Reset sent success */}
              {resetMode && resetSent ? (
                <div className="space-y-5 animate-scale-in">
                  <div className="bg-[#3D8B5C]/[0.06] border border-[#3D8B5C]/10 rounded-xl px-4 py-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#3D8B5C]/10 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-[#3D8B5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#3D8B5C]">E-mail verstuurd!</p>
                    <p className="text-xs text-[#3D8B5C]/70 mt-1">Check je inbox voor de reset-link.</p>
                  </div>
                  <button
                    onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                    className="w-full text-sm text-[#1A1917] font-medium hover:opacity-60 transition-opacity"
                  >
                    Terug naar inloggen
                  </button>
                </div>
              ) : resetMode ? (
                /* Reset form */
                <form onSubmit={handlePasswordReset} className="space-y-5">
                  <AnimatedInput
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
                    className="w-full bg-[#1A1917] text-white rounded-2xl py-4 font-medium text-[15px] tracking-wide hover:bg-[#333330] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {resetLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Verstuur reset-link'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetMode(false); setError('') }}
                    className="w-full text-sm text-[#A09D96] hover:text-[#1A1917] transition-colors duration-200"
                  >
                    Terug naar inloggen
                  </button>
                </form>
              ) : (
                /* Login form */
                <form onSubmit={handlePasswordLogin} className="space-y-5">
                  <AnimatedInput
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    label="E-mailadres"
                    autoComplete="email"
                    delay={400}
                  />

                  <AnimatedInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    label="Wachtwoord"
                    autoComplete="current-password"
                    delay={500}
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#A09D96] hover:text-[#1A1917] transition-colors duration-200"
                        aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    }
                  />

                  {/* Forgot password link */}
                  <div
                    className="flex justify-end animate-slide-up opacity-0"
                    style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
                  >
                    <button
                      type="button"
                      onClick={() => { setResetMode(true); setError('') }}
                      className="text-[13px] text-[#A09D96] hover:text-[#1A1917] transition-colors duration-200"
                    >
                      Wachtwoord vergeten?
                    </button>
                  </div>

                  {/* Submit button */}
                  <div
                    className="animate-slide-up opacity-0"
                    style={{ animationDelay: '650ms', animationFillMode: 'forwards' }}
                  >
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="group w-full bg-[#1A1917] text-white rounded-2xl py-4 font-medium text-[15px] tracking-wide hover:bg-[#333330] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5 relative overflow-hidden"
                    >
                      {formLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Inloggen
                          <svg
                            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* OAuth section - outside card for cleaner look */}
            {!resetMode && (
              <div
                className="space-y-5 animate-slide-up opacity-0"
                style={{ animationDelay: '750ms', animationFillMode: 'forwards' }}
              >
                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-[1px] bg-[#DDD9D0]" />
                  <span className="text-[12px] text-[#A09D96] uppercase tracking-widest font-medium">of</span>
                  <div className="flex-1 h-[1px] bg-[#DDD9D0]" />
                </div>

                {/* OAuth buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOAuthLogin('google')}
                    disabled={oauthLoading !== null}
                    className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white border border-[#DDD9D0] hover:border-[#A09D96] hover:shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {oauthLoading === 'google' ? (
                      <div className="w-4 h-4 border-2 border-[#1A1917]/20 border-t-[#1A1917] rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span className="text-sm font-medium text-[#1A1917]">Google</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOAuthLogin('apple')}
                    disabled={oauthLoading !== null}
                    className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-[#1A1917] text-white hover:bg-[#333330] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {oauthLoading === 'apple' ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.18 0-.36-.02-.53-.06-.01-.18-.04-.56-.04-.95 0-1.05.546-2.22 1.223-2.98.34-.38.77-.73 1.275-.98.51-.26 1.003-.41 1.48-.44.02.25.04.5.04.75zm4.035 12.15c-.04.01-2.098.81-2.098 3.33 0 2.97 2.602 4.02 2.682 4.04-.02.07-.41 1.44-1.378 2.85-.858 1.24-1.756 2.48-3.172 2.48-1.396 0-1.852-.83-3.449-.83-1.558 0-2.134.85-3.43.85-1.296 0-2.174-1.15-3.172-2.57C5.04 22.1 4.05 19.23 4.05 16.5c0-4.24 2.77-6.49 5.498-6.49 1.417 0 2.597.93 3.49.93.853 0 2.18-.99 3.796-.99.614 0 2.822.18 4.282 1.38-.11.07-2.556 1.49-2.556 4.45v-.17z"/>
                        </svg>
                        <span className="text-sm font-medium">Apple</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Contact link */}
                <p className="text-center text-[13px] text-[#A09D96]">
                  Nog geen account?{' '}
                  <a
                    href="mailto:contact@movecoaching.be"
                    className="text-[#1A1917] font-medium hover:opacity-60 transition-opacity duration-200"
                  >
                    Neem contact op
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-7xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight">
            MOVE
          </h1>
          <div className="w-8 h-8 border-2 border-[#1A1917]/20 border-t-[#1A1917] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}
