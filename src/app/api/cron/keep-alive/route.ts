import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/keep-alive — Supabase free-tier anti-pauze ping.
 *
 * Free tier pauzeert het project na ~7 dagen zonder activiteit. Toen dat
 * gebeurde lag de hele app eruit (login + alle data hingen). Eén triviale
 * query per dag houdt het project actief.
 *
 * Geconfigureerd in vercel.json → crons (dagelijks 03:00 UTC).
 * Vercel stuurt automatisch `Authorization: Bearer ${CRON_SECRET}` mee
 * als die env var bestaat; zonder CRON_SECRET laten we de ping toe —
 * het is een read-only count zonder gevoelige output.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const db = createAdminClient()
    const { count, error } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('[keep-alive] query failed:', error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, profiles: count, at: new Date().toISOString() })
  } catch (err) {
    console.error('[keep-alive] unexpected:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
