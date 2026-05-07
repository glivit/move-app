'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  /** Force refresh auth state (e.g. after sign-in) */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

/**
 * AuthProvider — single auth check for the entire client app.
 *
 * Uses getSession() (local JWT parse, ~0ms) instead of getUser() (network, ~300ms).
 * This is safe because middleware already verified the JWT with getUser() on the
 * first request. Subsequent navigations within the same session don't need
 * re-verification — the JWT is still valid.
 *
 * Also listens for auth state changes (sign-out, token refresh) so the UI stays
 * in sync without manual re-checks.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const supabase = createClient()

    // Initial auth check — local JWT parse, no network
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes (sign-out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}
