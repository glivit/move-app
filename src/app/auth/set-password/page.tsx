'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, CheckCircle, Lock } from 'lucide-react'

export default function SetPasswordPage() {
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

  useEffect(() => {
    const supabase = createClient()
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    async function verifyAndInit() {
      // If we have a token_hash, verify it first to create a session
      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (type as 'invite' | 'email') || 'invite',
        })

        if (otpError) {
          console.error('[SetPassword] verifyOtp error:', otpError)
          router.replace('/?error=Uitnodigingslink is verlopen of al gebruikt. Vraag je coach om een nieuwe.')
          return
        }
      }

      // Now check for a valid session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.full_name || '')
        setVerifying(false)
      } else {
        router.replace('/?error=Link is verlopen. Vraag je coach om een nieuwe uitnodiging.')
      }
    }

    verifyAndInit()
  }, [searchParams, router])

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

  if (verifying) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#1A1917] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[15px] text-[#A09D96]">Account verifiëren...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#34C759]/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[#34C759]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-semibold text-[#1A1A18]">
              Welkom bij MŌVE!
            </h1>
            <p className="text-[#8E8E93] text-sm">
              Je wachtwoord is ingesteld. Je kunt nu aan de slag.
            </p>
          </div>
          <button
            onClick={() => router.push('/client')}
            className="w-full bg-[#1A1917] text-white rounded-2xl py-3.5 font-medium hover:bg-[#6F5612] transition-all"
          >
            Ga naar mijn dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h2 className="text-3xl font-[family-name:var(--font-display)] font-semibold tracking-tight text-[#1A1A18]">
            MŌVE
          </h2>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-semibold text-[#1A1A18]">
            {userName ? `Welkom ${userName}!` : 'Welkom!'}
          </h1>
          <p className="text-[#8E8E93]">
            Stel een wachtwoord in om je account te activeren. Dit heb je nodig om later in te loggen.
          </p>
        </div>

        {error && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl px-4 py-3">
            <p className="text-sm text-[#FF3B30]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[#1A1A18]">
              Wachtwoord
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C7C7CC]">
                <Lock className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minstens 6 tekens"
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#F5F5F3] border-0 text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-[#1A1917] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C7C7CC] hover:text-[#8E8E93] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="block text-sm font-medium text-[#1A1A18]">
              Bevestig wachtwoord
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C7C7CC]">
                <Lock className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Herhaal je wachtwoord"
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#F5F5F3] border-0 text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-[#1A1917] transition-all"
              />
            </div>
          </div>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        password.length >= level * 3
                          ? password.length >= 12
                            ? '#34C759'
                            : password.length >= 8
                              ? '#FF9500'
                              : '#FF3B30'
                          : '#E8E4DC',
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-[#8E8E93]">
                {password.length < 6
                  ? 'Te kort — minstens 6 tekens'
                  : password.length < 8
                    ? 'OK — maar langer is beter'
                    : password.length < 12
                      ? 'Goed wachtwoord'
                      : 'Sterk wachtwoord'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A1917] text-white rounded-2xl py-3.5 font-medium hover:bg-[#6F5612] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Activeren...
              </>
            ) : (
              'Account activeren'
            )}
          </button>
        </form>

        <p className="text-center text-[12px] text-[#C7C7CC]">
          Door je account te activeren ga je akkoord met de voorwaarden van MŌVE.
        </p>
      </div>
    </div>
  )
}
