import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

export const runtime = 'nodejs'

// GET: Diagnostic — check everything in the push chain
export async function GET(req: NextRequest) {
  const diagnostics: Record<string, unknown> = {}

  // 1. Check VAPID keys
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  diagnostics.vapid = {
    publicKeySet: !!vapidPublic,
    publicKeyLength: vapidPublic?.length || 0,
    privateKeySet: !!vapidPrivate,
    privateKeyLength: vapidPrivate?.length || 0,
  }

  // 2. Check auth
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  diagnostics.auth = {
    authenticated: !!user,
    userId: user?.id || null,
    error: authError?.message || null,
  }

  if (!user) {
    return NextResponse.json({ diagnostics, message: 'Niet ingelogd' })
  }

  // 3. Check push_subscriptions table exists and has data
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, is_active, created_at, updated_at')
    .eq('user_id', user.id)

  diagnostics.subscriptions = {
    tableExists: !subsError || subsError.code !== '42P01',
    error: subsError?.message || null,
    count: subs?.length || 0,
    active: subs?.filter((s: any) => s.is_active).length || 0,
    entries: subs?.map((s: any) => ({
      id: s.id,
      endpointDomain: s.endpoint ? new URL(s.endpoint).hostname : null,
      isActive: s.is_active,
      created: s.created_at,
      updated: s.updated_at,
    })) || [],
  }

  // 4. Try test send if subscriptions exist
  if (subs && subs.length > 0 && vapidPublic && vapidPrivate) {
    try {
      webpush.setVapidDetails('mailto:info@movestudio.be', vapidPublic, vapidPrivate)

      // Get full subscription data with keys
      const { data: fullSubs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (fullSubs && fullSubs.length > 0) {
        const testPayload = JSON.stringify({
          title: 'MŌVE Test',
          body: 'Push werkt! 🎉',
          url: '/client',
          tag: 'test-push',
          icon: '/icon-192x192.png',
        })

        const sendResults = await Promise.allSettled(
          fullSubs.map(async (sub) => {
            try {
              const result = await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                testPayload
              )
              return {
                success: true,
                statusCode: result.statusCode,
                endpoint: new URL(sub.endpoint).hostname,
              }
            } catch (err: any) {
              return {
                success: false,
                statusCode: err.statusCode,
                error: err.message,
                body: err.body,
                endpoint: new URL(sub.endpoint).hostname,
              }
            }
          })
        )

        diagnostics.testSend = sendResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { error: 'Promise rejected', reason: String(r.reason) }
        )
      } else {
        diagnostics.testSend = 'Geen actieve subscriptions gevonden'
      }
    } catch (err: any) {
      diagnostics.testSend = { error: err.message, stack: err.stack?.split('\n').slice(0, 3) }
    }
  } else {
    diagnostics.testSend = {
      skipped: true,
      reason: !vapidPublic ? 'VAPID public key ontbreekt' :
              !vapidPrivate ? 'VAPID private key ontbreekt' :
              'Geen subscriptions gevonden',
    }
  }

  return NextResponse.json({ diagnostics })
}
