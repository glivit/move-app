'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Client-side auth verify page — handles hash fragment tokens
 * from Supabase implicit flow (when PKCE code isn't in the URL)
 */
export default function VerifyPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Supabase client auto-detects hash fragments and exchanges them
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/?error=Verificatie mislukt. Probeer opnieuw.')
        return
      }

      // Check if this is an invited user who needs to set password
      const invitedAt = user.app_metadata?.invited_at
      const providers = user.app_metadata?.providers || []
      const hasNoPassword = !providers.includes('email')

      if (invitedAt && hasNoPassword) {
        router.replace('/auth/set-password')
        return
      }

      // Check role and redirect
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.role === 'coach') {
            router.replace('/coach')
          } else {
            router.replace('/client')
          }
        })
    })
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-[#1A1917] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[15px] text-[#A09D96]">Account verifiëren...</p>
      </div>
    </div>
  )
}
