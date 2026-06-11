import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient, User, AuthError } from '@supabase/supabase-js'

/**
 * Fast auth for API routes — lokale JWT-verificatie, geen netwerk.
 *
 * Dit project gebruikt ES256 (asymmetrische) signing keys. Daardoor kan
 * `getClaims()` de JWT-handtekening LOKAAL cryptografisch verifiëren tegen
 * de JWKS (~0.1ms) i.p.v. een netwerk-roundtrip naar de Auth API zoals
 * `getUser()` (~300-500ms per request).
 *
 * Dit is ook VEILIGER dan het oude getSession()-patroon: getSession leest
 * de cookie zonder handtekening-check (een vervalste cookie zou erdoor
 * komen op routes die de middleware niet passeren — /api/* is uitgesloten
 * van de middleware-matcher). getClaims weigert vervalste tokens.
 *
 * Fallback: als lokale verificatie niet kan (geen JWKS, klok-skew, edge
 * cases) valt hij terug op getUser() — traag maar altijd correct.
 */

// Module-level JWKS cache — overleeft warme serverless invocaties zodat
// de JWKS-fetch niet per request gebeurt. Endpoint zit achter CDN.
interface Jwks { keys: unknown[] }
let jwksCache: Jwks | null = null
let jwksFetchedAt = 0
const JWKS_TTL_MS = 10 * 60 * 1000

async function getJwks(): Promise<Jwks | undefined> {
  if (jwksCache && Date.now() - jwksFetchedAt < JWKS_TTL_MS) return jwksCache
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      { cache: 'force-cache' },
    )
    if (res.ok) {
      jwksCache = (await res.json()) as Jwks
      jwksFetchedAt = Date.now()
      return jwksCache
    }
  } catch {
    /* netwerk-hiccup → getClaims doet zelf een JWKS-fetch of we vallen terug op getUser */
  }
  return undefined
}

/** Bouw een User-achtig object uit geverifieerde JWT-claims. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function userFromClaims(claims: any): User {
  return {
    id: claims.sub,
    email: claims.email ?? undefined,
    phone: claims.phone ?? undefined,
    app_metadata: claims.app_metadata ?? {},
    user_metadata: claims.user_metadata ?? {},
    aud: typeof claims.aud === 'string' ? claims.aud : 'authenticated',
    role: claims.role ?? 'authenticated',
    is_anonymous: claims.is_anonymous ?? false,
    created_at: '',
  } as unknown as User
}

/**
 * Drop-in vervanger voor `supabase.auth.getUser()` — zelfde return-shape,
 * maar met lokale JWT-verificatie (ES256 + JWKS) i.p.v. netwerk-call.
 * Valt terug op echte getUser() als lokale verificatie niet lukt.
 */
export async function getUserVerified(
  supabase: SupabaseClient,
): Promise<{ data: { user: User | null }; error: AuthError | null }> {
  try {
    const jwks = await getJwks()
    const { data, error } = await supabase.auth.getClaims(
      undefined,
      jwks ? { jwks: jwks as { keys: never[] } } : undefined,
    )
    if (!error && data?.claims?.sub) {
      return { data: { user: userFromClaims(data.claims) }, error: null }
    }
    if (!error && !data) {
      // Geen sessie aanwezig (uitgelogd) — geen fallback nodig.
      return { data: { user: null }, error: null }
    }
  } catch {
    /* val door naar getUser-fallback */
  }
  // Zeldzaam pad (verlopen token, ontbrekende JWKS): netwerk-verificatie.
  // NIET getSession — die verifieert de handtekening niet.
  return supabase.auth.getUser()
}

/**
 * Standaard auth-helper voor API routes.
 * Returns { user, supabase } — user is null als niet ingelogd.
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

  const { data: { user } } = await getUserVerified(supabase)

  if (!user) {
    return { user: null, supabase } as const
  }

  return { user, supabase } as const
}
