import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Fast auth for API routes.
 *
 * Uses getSession() (local JWT parse, ~0ms) instead of getUser() (network call, ~300ms).
 *
 * Trust chain: middleware verifies via getUser() op cookie-miss (eerste request
 * of na 30min TTL). Tijdens cache-hit-window vertrouwen middleware én deze
 * helper het JWT op basis van de eerdere verificatie. Ban-latency = max 30min.
 *
 * Returns { user, supabase } or { user: null } if not authenticated.
 */
export async function getAuthFast() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — can't set cookies
          }
        },
      },
    }
  )

  // getSession() reads JWT from cookies locally — no network call
  // Middleware already verified the user with getUser(), so this is safe
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return { user: null, supabase } as const
  }

  return { user: session.user, supabase } as const
}
