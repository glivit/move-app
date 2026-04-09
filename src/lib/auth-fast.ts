import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Fast auth for API routes.
 *
 * Uses getSession() (local JWT parse, ~0ms) instead of getUser() (network call, ~300ms).
 * Safe because middleware already verified the user via getUser() before the API route runs.
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
