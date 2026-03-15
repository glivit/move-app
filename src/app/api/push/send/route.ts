import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPushToUser, sendPushToUsers } from '@/lib/push-server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Send push notification to client(s) — coach only
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify coach role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { client_id, client_ids, title, message, url = '/client' } = body

  if ((!client_id && !client_ids) || !title || !message) {
    return NextResponse.json({ error: 'client_id (or client_ids), title, and message required' }, { status: 400 })
  }

  const payload = { title, body: message, url }

  if (client_ids && Array.isArray(client_ids)) {
    const result = await sendPushToUsers(client_ids, payload)
    return NextResponse.json({ success: true, ...result })
  }

  const result = await sendPushToUser(client_id, payload)
  return NextResponse.json({ success: true, ...result })
}
