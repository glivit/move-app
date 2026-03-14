'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

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

  // Check if already logged in
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

        if (profile?.role === 'coach') {
          router.replace('/coach')
        } else {
          router.replace('/client')
        }
      } else {
        setLoading(false)
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

      if (profile?.role === 'coach') {
        router.push('/coach')
      } else {
        router.push('/client')
      }
      router.refresh()
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setOAuthLoading(provider)
    setError('')

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message?.includes('provider is not enabled') || authError.message?.includes('Unsupported provider')) {
          setError(`${provider === 'google' ? 'Google' : 'Apple'} login is nog niet geconfigureerd. Gebruik e-mail en wachtwoord.`)
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

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      if (resetError.message?.includes('rate limit') || resetError.message?.includes('429')) {
        setError('Te veel verzoeken. Wacht even en probeer opnieuw.')
      } else if (resetError.message?.includes('not found') || resetError.message?.includes('not registered')) {
        setError('Dit e-mailadres is niet bekend. Controleer het adres.')
      } else {
        setError(`Reset mislukt: ${resetError.message || 'Onbekende fout'}. Probeer opnieuw.`)
      }
    } else {
      setResetSent(true)
    }
    setResetLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0E] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-display font-semibold text-white tracking-tight">MŌVE</h1>
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero/Branding Side - Left */}
      <div className="relative w-full lg:w-[55%] bg-[#0F0F0E] text-white flex flex-col items-center justify-center px-6 py-16 lg:py-0 lg:min-h-screen overflow-hidden">
        {/* Subtle geometric background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient accent glow */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#8B6914]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-[#8B6914]/10 rounded-full blur-[100px]" />

        <div className="relative z-10 w-full max-w-lg text-center lg:text-left space-y-10">
          {/* Logo */}
          <div>
            <h1 className="text-7xl lg:text-8xl font-display font-semibold tracking-tight mb-6">
              MŌVE
            </h1>
            <div className="w-20 h-[2px] bg-gradient-to-r from-[#8B6914] to-[#C4962C] mx-auto lg:mx-0 mb-6" />
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              Jouw persoonlijke coaching ervaring
            </p>
          </div>

          {/* Premium features */}
          <div className="space-y-4 text-left">
            {[
              { label: 'Gepersonaliseerde trainingsprogramma\'s' },
              { label: 'Real-time voortgang bijhouden' },
              { label: 'Directe communicatie met je coach' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8B6914]" />
                <span className="text-white/50 text-[15px]">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Testimonial / badge */}
          <div className="pt-4">
            <div className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-5 py-3">
              <span className="text-[#C4962C] text-sm font-medium">Premium Coaching</span>
              <span className="text-white/20">·</span>
              <span className="text-white/40 text-sm">Knokke</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Side - Right */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-6 py-12 lg:py-0 lg:min-h-screen bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-semibold text-[#1A1A18]">
              Welkom terug
            </h2>
            <p className="text-[#8E8E93]">
              Log in op je account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Password Reset Mode */}
          {resetMode ? (
            resetSent ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 text-center">
                  <p className="text-sm text-green-700 font-medium mb-1">E-mail verstuurd!</p>
                  <p className="text-xs text-green-600">Check je inbox voor de reset-link.</p>
                </div>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                  className="w-full text-sm text-[#1A1A18] font-medium hover:underline"
                >
                  Terug naar inloggen
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="block text-sm font-medium text-[#1A1A18]">
                    E-mailadres
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jouw@email.be"
                    required
                    autoComplete="email"
                    className="w-full px-5 py-3.5 rounded-2xl bg-[#F5F5F3] border-0 text-[#1A1A18] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B6914] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-[#1A1A18] text-white rounded-2xl py-3.5 font-medium hover:bg-[#2A2A28] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verzenden...
                    </>
                  ) : (
                    'Verstuur reset-link'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError('') }}
                  className="w-full text-sm text-gray-500 hover:text-[#1A1A18] transition-colors"
                >
                  Terug naar inloggen
                </button>
              </form>
            )
          ) : (
          /* Login Form */
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#1A1A18]">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.be"
                required
                autoComplete="email"
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F5F5F3] border-0 text-[#1A1A18] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B6914] transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#1A1A18]">
                  Wachtwoord
                </label>
                <button
                  type="button"
                  onClick={() => { setResetMode(true); setError('') }}
                  className="text-xs text-gray-500 hover:text-[#1A1A18] transition-colors"
                >
                  Wachtwoord vergeten?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#F5F5F3] border-0 text-[#1A1A18] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B6914] transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-[#1A1A18] text-white rounded-2xl py-3.5 font-medium hover:bg-[#2A2A28] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Inloggen...
                </>
              ) : (
                'Inloggen'
              )}
            </button>
          </form>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-sm text-gray-500">of ga verder met</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google Button */}
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white border border-gray-300 hover:border-gray-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {oauthLoading === 'google' ? (
                <div className="w-4 h-4 border-2 border-[#1A1A18] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-sm font-medium text-[#1A1A18]">Google</span>
                </>
              )}
            </button>

            {/* Apple Button */}
            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-black text-white hover:bg-gray-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {oauthLoading === 'apple' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.18 0-.36-.02-.53-.06-.01-.18-.04-.56-.04-.95 0-1.05.546-2.22 1.223-2.98.34-.38.77-.73 1.275-.98.51-.26 1.003-.41 1.48-.44.02.25.04.5.04.75zm4.035 12.15c-.04.01-2.098.81-2.098 3.33 0 2.97 2.602 4.02 2.682 4.04-.02.07-.41 1.44-1.378 2.85-.858 1.24-1.756 2.48-3.172 2.48-1.396 0-1.852-.83-3.449-.83-1.558 0-2.134.85-3.43.85-1.296 0-2.174-1.15-3.172-2.57C5.04 22.1 4.05 19.23 4.05 16.5c0-4.24 2.77-6.49 5.498-6.49 1.417 0 2.597.93 3.49.93.853 0 2.18-.99 3.796-.99.614 0 2.822.18 4.282 1.38-.11.07-2.556 1.49-2.556 4.45v-.17z"/>
                  </svg>
                  <span className="text-sm font-medium">Apple</span>
                </>
              )}
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-600">
            Nog geen account?{' '}
            <a href="mailto:contact@movecoaching.be" className="text-[#8B6914] font-medium hover:underline">
              Neem contact op
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F0F0E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}
