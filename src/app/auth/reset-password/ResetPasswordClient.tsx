'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

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

  // Verify token and establish session
  useEffect(() => {
    const supabase = createClient()
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    async function verifyAndInit() {
      // If we have a token_hash, verify it first to create a session
      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (type as 'recovery' | 'email') || 'recovery',
        })

        if (otpError) {
          console.error('[ResetPassword] verifyOtp error:', otpError)
          setHasSession(false)
          setError('Je reset-link is verlopen of al gebruikt. Vraag een nieuwe aan via de login pagina.')
          setVerifying(false)
          return
        }
      }

      // Check for a valid session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setHasSession(true)
      } else {
        setHasSession(false)
        setError('Je reset-link is verlopen of ongeldig. Vraag een nieuwe aan via de login pagina.')
      }
      setVerifying(false)
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
      console.error('Password update error:', updateError)
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

  if (verifying) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#1A1917] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[15px] text-[#A09D96]">Link verifiëren...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-semibold text-[#1A1A18]">
              Wachtwoord gewijzigd
            </h1>
            <p className="text-gray-600 text-sm">
              Je kunt nu inloggen met je nieuwe wachtwoord.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-[#1A1A18] text-white rounded-2xl py-3.5 font-medium hover:bg-[#2A2A28] transition-all"
          >
            Naar inloggen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-semibold text-[#1A1A18]">
            Nieuw wachtwoord
          </h1>
          <p className="text-gray-600">
            Kies een nieuw wachtwoord voor je account.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
            {!hasSession && (
              <button
                onClick={() => router.push('/')}
                className="mt-3 text-sm font-medium text-[#1A1917] hover:underline"
              >
                Terug naar login →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[#1A1A18]">
              Nieuw wachtwoord
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minstens 6 tekens"
                required
                autoComplete="new-password"
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F5F5F3] border-0 text-[#1A1A18] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A1A18] transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="block text-sm font-medium text-[#1A1A18]">
              Bevestig wachtwoord
            </label>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Herhaal je wachtwoord"
              required
              autoComplete="new-password"
              className="w-full px-5 py-3.5 rounded-2xl bg-[#F5F5F3] border-0 text-[#1A1A18] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A1A18] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A1A18] text-white rounded-2xl py-3.5 font-medium hover:bg-[#2A2A28] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Opslaan...
              </>
            ) : (
              'Wachtwoord opslaan'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
