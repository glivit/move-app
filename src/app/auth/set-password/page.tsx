'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function SetPasswordPage() {
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
      <SetPasswordContent />
    </Suspense>
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

function SetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userName, setUserName] = useState('')
  const [verifying, setVerifying] = useState(true)
  const [mounted, setMounted] = useState(false)
  const verifyAttempted = useRef(false)

  useEffect(() => {
    // Guard against React Strict Mode double-execution & re-renders
    if (verifyAttempted.current) return
    verifyAttempted.current = true

    const supabase = createClient()
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    async function waitForUser(maxAttempts = 8): Promise<ReturnType<typeof supabase.auth.getUser> extends Promise<infer R> ? R : never> {
      for (let i = 0; i < maxAttempts; i++) {
        const result = await supabase.auth.getUser()
        if (result.data.user) return result
        // Exponential backoff: 200ms, 400ms, 800ms, ...
        await new Promise(r => setTimeout(r, 200 * Math.pow(2, i)))
      }
      return await supabase.auth.getUser()
    }

    function initUser(user: { user_metadata?: { full_name?: string } }) {
      setUserName(user.user_metadata?.full_name || '')
      setVerifying(false)
      requestAnimationFrame(() => setMounted(true))
    }

    async function verifyAndInit() {
      // 1. Check if we already have a session (e.g. from auth callback redirect)
      const { data: { user: existingUser } } = await supabase.auth.getUser()
      if (existingUser) {
        initUser(existingUser)
        return
      }

      // 2. If we have a token_hash, verify it (legacy direct-link flow)
      if (tokenHash) {
        // Accept invite/magiclink/recovery/email — all four are valid verifyOtp
        // types and are all used by the resend-invite flow depending on which
        // admin.generateLink call succeeded.
        const otpType =
          (type as 'invite' | 'magiclink' | 'recovery' | 'email') || 'invite'
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        })

        if (otpError) {
          console.error('[SetPassword] verifyOtp error:', otpError)
          // Token might have been consumed by a previous attempt (double-render,
          // back button, etc.) — check if a session was established anyway
          const { data: { user: retryUser } } = await waitForUser(3)
          if (retryUser) {
            initUser(retryUser)
            return
          }
          router.replace('/?error=Uitnodigingslink is verlopen of al gebruikt. Vraag je coach om een nieuwe.')
          return
        }
      }

      // 3. Wait for session to be established after verifyOtp
      //    (session propagation via cookies can take a moment)
      const { data: { user } } = await waitForUser()
      if (user) {
        initUser(user)
      } else {
        router.replace('/?error=Link is verlopen. Vraag je coach om een nieuwe uitnodiging.')
      }
    }

    verifyAndInit()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Wachtwoord moet minstens 6 tekens zijn.')
      return
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      setError('Er ging iets mis. Probeer opnieuw of vraag je coach om een nieuwe link.')
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  // Password strength
  const getStrength = () => {
    if (password.length === 0) return { level: 0, label: '', color: '' }
    if (password.length < 6) return { level: 1, label: 'Te kort', color: '#C4372A' }
    if (password.length < 8) return { level: 2, label: 'OK', color: '#C47D15' }
    if (password.length < 12) return { level: 3, label: 'Goed', color: '#3D8B5C' }
    return { level: 4, label: 'Sterk', color: '#3D8B5C' }
  }
  const strength = getStrength()

  /* ─── Loading / verifying ───────────────────── */
  if (verifying) {
    return (
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1
            className="text-7xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight"
            style={{ animation: 'fade-in 0.6s ease-out both' }}
          >
            MOVE
          </h1>
          <div className="w-8 h-8 border-2 border-[#1A1917]/20 border-t-[#1A1917] rounded-full animate-spin mx-auto" />
          <p className="text-[15px] text-[#A09D96] animate-fade-in" style={{ animationDelay: '300ms' }}>
            Account verifiëren...
          </p>
        </div>
      </div>
    )
  }

  /* ─── Success state ─────────────────────────── */
  if (success) {
    return (
      <>
        <style jsx global>{`
          @keyframes check-draw {
            from { stroke-dashoffset: 24; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes circle-grow {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes reveal-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center space-y-8">
            {/* Animated checkmark */}
            <div
              className="flex justify-center"
              style={{ animation: 'circle-grow 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
            >
              <div className="w-24 h-24 rounded-full bg-[#3D8B5C]/10 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#3D8B5C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="24"
                    style={{ animation: 'check-draw 0.4s ease-out 0.3s both' }}
                  />
                </svg>
              </div>
            </div>

            <div style={{ animation: 'reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both' }}>
              <h1 className="text-3xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight mb-2">
                Welkom bij MOVE{userName ? `, ${userName}` : ''}!
              </h1>
              <p className="text-[#A09D96] text-[15px]">
                Je account is klaar. Laten we beginnen.
              </p>
            </div>

            <div style={{ animation: 'reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
              <button
                onClick={() => router.push('/client')}
                className="group w-full bg-[#1A1917] text-white rounded-2xl py-4 font-medium text-[15px] tracking-wide hover:bg-[#333330] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5"
              >
                Ga naar mijn dashboard
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ─── Set password form ─────────────────────── */
  return (
    <>
      <style jsx global>{`
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes reveal-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .reveal-up { animation: reveal-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .reveal-scale { animation: reveal-scale 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
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
          {/* Floating shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, #1A1917 0%, transparent 70%)' }}
            />
            <div
              className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full opacity-[0.03]"
              style={{ background: 'radial-gradient(circle, #1A1917 0%, transparent 70%)' }}
            />
          </div>

          <div className="relative z-10 w-full max-w-md text-center lg:text-left space-y-10">
            <div className={mounted ? 'reveal-up' : 'opacity-0'} style={{ animationDelay: '100ms' }}>
              <h1 className="text-8xl lg:text-9xl font-[family-name:var(--font-display)] font-bold text-[#1A1917] tracking-tighter leading-none">
                MOVE
              </h1>
            </div>
            <div className={mounted ? 'reveal-up' : 'opacity-0'} style={{ animationDelay: '250ms' }}>
              <p className="text-[#6B6862] text-lg lg:text-xl leading-relaxed max-w-sm">
                {userName
                  ? `Welkom ${userName}, activeer je account om te starten.`
                  : 'Activeer je account om te starten met je persoonlijke coaching.'
                }
              </p>
            </div>
            <div
              className={`h-[1px] w-16 bg-[#DDD9D0] mx-auto lg:mx-0 ${mounted ? 'reveal-up' : 'opacity-0'}`}
              style={{ animationDelay: '350ms' }}
            />
          </div>
        </div>

        {/* ─── Right: Form Panel ────────────────────── */}
        <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col items-center justify-center px-6 sm:px-10 py-12 lg:py-0 lg:min-h-screen">
          <div
            className={`w-full max-w-[420px] space-y-8 ${mounted ? 'reveal-scale' : 'opacity-0'}`}
            style={{ animationDelay: '300ms' }}
          >
            {/* Form card */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_2px_24px_rgba(26,25,23,0.06)] space-y-7">
              {/* Heading */}
              <div className="space-y-1.5">
                <h2 className="text-3xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight">
                  Kies een wachtwoord
                </h2>
                <p className="text-[#A09D96] text-[15px]">
                  Dit heb je nodig om later in te loggen.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-[#C4372A]/[0.06] border border-[#C4372A]/10 rounded-xl px-4 py-3 animate-scale-in">
                  <p className="text-sm text-[#C4372A]">{error}</p>
                </div>
              )}

              <form onSubmit={handleSetPassword} className="space-y-5">
                <AnimatedInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label="Wachtwoord"
                  autoComplete="new-password"
                  delay={400}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#A09D96] hover:text-[#1A1917] transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />

                <AnimatedInput
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  label="Bevestig wachtwoord"
                  autoComplete="new-password"
                  delay={500}
                />

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div
                    className="space-y-2 animate-scale-in"
                    style={{ animationDelay: '0ms' }}
                  >
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className="h-1 flex-1 rounded-full transition-all duration-500 ease-out"
                          style={{
                            backgroundColor: strength.level >= level ? strength.color : '#E8E4DC',
                            transform: strength.level >= level ? 'scaleX(1)' : 'scaleX(0.8)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[12px] transition-colors duration-300" style={{ color: strength.color }}>
                      {strength.label}
                    </p>
                  </div>
                )}

                <div
                  className="animate-slide-up opacity-0"
                  style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full bg-[#1A1917] text-white rounded-2xl py-4 font-medium text-[15px] tracking-wide hover:bg-[#333330] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Account activeren
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
            </div>

            {/* Footer text */}
            <p
              className="text-center text-[12px] text-[#A09D96] animate-slide-up opacity-0"
              style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}
            >
              Door je account te activeren ga je akkoord met de voorwaarden van MOVE.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
