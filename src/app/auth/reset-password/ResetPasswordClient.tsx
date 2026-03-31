'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

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

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    async function verifyAndInit() {
      const { data: { user: existingUser } } = await supabase.auth.getUser()
      if (existingUser) {
        setHasSession(true)
        setVerifying(false)
        requestAnimationFrame(() => setMounted(true))
        return
      }

      if (tokenHash) {
        const { data, error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (type as 'recovery' | 'email') || 'recovery',
        })

        if (otpError) {
          const { data: { user: retryUser } } = await supabase.auth.getUser()
          if (retryUser) {
            setHasSession(true)
            setVerifying(false)
            requestAnimationFrame(() => setMounted(true))
            return
          }
          setHasSession(false)
          setError('Je reset-link is verlopen of al gebruikt. Vraag een nieuwe aan via de login pagina.')
          setVerifying(false)
          requestAnimationFrame(() => setMounted(true))
          return
        }

        if (data?.user) {
          setHasSession(true)
          setVerifying(false)
          requestAnimationFrame(() => setMounted(true))
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setHasSession(true)
      } else {
        setHasSession(false)
        setError('Je reset-link is verlopen of ongeldig. Vraag een nieuwe aan via de login pagina.')
      }
      setVerifying(false)
      requestAnimationFrame(() => setMounted(true))
    }

    verifyAndInit()
  }, [searchParams])

  const handleReset = async (e: React.FormEvent) => {
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
      if (updateError.message?.includes('session') || updateError.message?.includes('not authenticated')) {
        setError('Je sessie is verlopen. Vraag een nieuwe reset-link aan via de login pagina.')
      } else if (updateError.message?.includes('same password') || updateError.message?.includes('different')) {
        setError('Kies een ander wachtwoord dan je huidige.')
      } else {
        setError(`Fout: ${updateError.message || 'Onbekende fout'}. Probeer een nieuwe reset-link aan te vragen.`)
      }
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

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-7xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight">
            MOVE
          </h1>
          <div className="w-8 h-8 border-2 border-[#1A1917]/20 border-t-[#1A1917] rounded-full animate-spin mx-auto" />
          <p className="text-[15px] text-[#A09D96]">Link verifiëren...</p>
        </div>
      </div>
    )
  }

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
                Wachtwoord gewijzigd
              </h1>
              <p className="text-[#A09D96] text-[15px]">
                Je kunt nu inloggen met je nieuwe wachtwoord.
              </p>
            </div>

            <div style={{ animation: 'reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
              <button
                onClick={() => router.push('/')}
                className="group w-full bg-[#1A1917] text-white rounded-2xl py-4 font-medium text-[15px] tracking-wide hover:bg-[#333330] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5"
              >
                Naar inloggen
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

  return (
    <>
      <style jsx global>{`
        @keyframes reveal-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .reveal-scale { animation: reveal-scale 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center px-6 py-12">
        <div
          className={`w-full max-w-[420px] space-y-8 ${mounted ? 'reveal-scale' : 'opacity-0'}`}
          style={{ animationDelay: '100ms' }}
        >
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-5xl font-[family-name:var(--font-display)] font-bold text-[#1A1917] tracking-tighter">
              MOVE
            </h1>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_2px_24px_rgba(26,25,23,0.06)] space-y-7">
            <div className="space-y-1.5">
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-semibold text-[#1A1917] tracking-tight">
                Nieuw wachtwoord
              </h2>
              <p className="text-[#A09D96] text-[15px]">
                Kies een nieuw wachtwoord voor je account.
              </p>
            </div>

            {error && (
              <div className="bg-[#C4372A]/[0.06] border border-[#C4372A]/10 rounded-xl px-4 py-3 animate-scale-in">
                <p className="text-sm text-[#C4372A]">{error}</p>
                {!hasSession && (
                  <button
                    onClick={() => router.push('/')}
                    className="mt-2 text-sm font-medium text-[#1A1917] hover:opacity-60 transition-opacity"
                  >
                    Terug naar login
                  </button>
                )}
              </div>
            )}

            {hasSession && (
              <form onSubmit={handleReset} className="space-y-5">
                <AnimatedInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label="Nieuw wachtwoord"
                  autoComplete="new-password"
                  delay={200}
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
                  delay={300}
                />

                {password.length > 0 && (
                  <div className="space-y-2 animate-scale-in">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className="h-1 flex-1 rounded-full transition-all duration-500 ease-out"
                          style={{
                            backgroundColor: strength.level >= level ? strength.color : '#E8E4DC',
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
                  style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
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
                        Wachtwoord opslaan
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

          {/* Back to login */}
          <p
            className="text-center text-[13px] text-[#A09D96] animate-slide-up opacity-0"
            style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
          >
            <button
              onClick={() => router.push('/')}
              className="text-[#1A1917] font-medium hover:opacity-60 transition-opacity duration-200"
            >
              Terug naar inloggen
            </button>
          </p>
        </div>
      </div>
    </>
  )
}
