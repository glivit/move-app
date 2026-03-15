import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPushToUser, sendPushToUsers } from '@/lib/push-server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Send push notification to a user — authenticated users only
// Both coach→client and client→coach push notifications
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { client_id, client_ids, title, message, url = '/client' } = body

  if ((!client_id && !client_ids) || !title || !message) {
    return NextResponse.json({ error: 'client_id (or client_ids), title, and message required' }, { status: 400 })
  }

  // Prevent sending push to yourself
  const targetIds = client_ids || [client_id]
  const filtered = targetIds.filter((id: string) => id !== user.id)
  if (filtered.length === 0) {
    return NextResponse.json({ success: true, sent: 0, total: 0 })
  }

  const payload = { title, body: message, url }

  if (filtered.length > 1) {
    const result = await sendPushToUsers(filtered, payload)
    return NextResponse.json({ success: true, ...result })
  }

  const result = await sendPushToUser(filtered[0], payload)
  return NextResponse.json({ success: true, ...result })
}
