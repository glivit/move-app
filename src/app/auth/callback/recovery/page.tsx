'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Recovery callback page — client-side handler
 *
 * Supabase redirects here after the user clicks the password reset link.
 * Handles both PKCE (?code=) and implicit flow (#access_token=).
 * Always redirects to /auth/reset-password
 */
export default function RecoveryCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1A1917] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RecoveryCallbackContent />
    </Suspense>
  )
}

function RecoveryCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')

    async function handlePKCE() {
      if (!code) return false
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('[Recovery Callback] PKCE exchange error:', error)
        setError('Reset-link is verlopen. Vraag een nieuwe aan.')
        return false
      }
      return true
    }

    async function waitForSession(): Promise<boolean> {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) return true

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false)
        }, 5000)

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
            clearTimeout(timeout)
            subscription.unsubscribe()
            resolve(true)
          }
        })
      })
    }

    async function run() {
      if (code) {
        const ok = await handlePKCE()
        if (ok) {
          router.replace('/auth/reset-password')
          return
        }
        if (error) return
      }

      const hasSession = await waitForSession()
      if (hasSession) {
        router.replace('/auth/reset-password')
      } else {
        setError('Reset-link is verlopen. Vraag een nieuwe aan.')
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-[15px] text-[#D14343]">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="text-[15px] font-medium px-6 py-2.5 rounded-xl transition-colors"
            style={{ backgroundColor: '#333330', color: '#fff' }}
          >
            Naar inlogpagina
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-[#1A1917] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[15px] text-[#A09D96]">Wachtwoord reset verifiëren...</p>
      </div>
    </div>
  )
}
