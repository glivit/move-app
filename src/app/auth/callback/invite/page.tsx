'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Invite callback page — client-side handler
 *
 * Supabase redirects here after the user clicks the invite link.
 * Depending on the project's auth flow config, it arrives either:
 *   - PKCE flow:     ?code=xxx  (query param, readable server-side)
 *   - Implicit flow: #access_token=xxx&type=invite  (hash fragment, client-side only)
 *
 * This page handles BOTH flows and always redirects to /auth/set-password
 */
export default function InviteCallbackPage() {
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
        console.error('[Invite Callback] PKCE exchange error:', error)
        setError('Uitnodigingslink is verlopen. Vraag je coach om een nieuwe.')
        return false
      }
      return true
    }

    async function waitForSession(): Promise<boolean> {
      // First check if we already have a session (implicit flow auto-detected)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) return true

      // Wait for onAuthStateChange (hash fragment processing)
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
      // Try PKCE flow first
      if (code) {
        const ok = await handlePKCE()
        if (ok) {
          router.replace('/auth/set-password')
          return
        }
        // If PKCE failed and we have an error, don't try implicit
        if (error) return
      }

      // Try implicit flow (hash fragment)
      const hasSession = await waitForSession()
      if (hasSession) {
        router.replace('/auth/set-password')
      } else {
        setError('Uitnodigingslink is verlopen. Vraag je coach om een nieuwe.')
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
        <p className="text-[15px] text-[#A09D96]">Account activeren...</p>
      </div>
    </div>
  )
}
