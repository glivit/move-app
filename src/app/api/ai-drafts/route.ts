import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendDraftMessage } from '@/lib/ai-coach'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ai-drafts
 * List pending AI message drafts for the coach
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify coach role
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'

  const { data: drafts, error } = await admin
    .from('ai_message_drafts')
    .select('*, profiles!ai_message_drafts_client_id_fkey(full_name, avatar_url)')
    .eq('coach_id', user.id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ drafts: drafts || [] })
}

/**
 * POST /api/ai-drafts
 * Send or dismiss a draft
 *
 * Body: { draftId, action: 'send' | 'dismiss' | 'edit_send', editedContent?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify coach
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { draftId, action, editedContent } = body

  if (!draftId || !action) {
    return NextResponse.json({ error: 'draftId and action required' }, { status: 400 })
  }

  // Load draft
  const { data: draft, error: draftError } = await admin
    .from('ai_message_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('coach_id', user.id)
    .eq('status', 'pending')
    .single()

  if (draftError || !draft) {
    return NextResponse.json({ error: 'Draft not found or already processed' }, { status: 404 })
  }

  if (action === 'dismiss') {
    await admin
      .from('ai_message_drafts')
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', draftId)

    return NextResponse.json({ success: true, action: 'dismissed' })
  }

  if (action === 'send' || action === 'edit_send') {
    const messageContent = action === 'edit_send' && editedContent
      ? editedContent
      : draft.content

    // Send the message
    const sent = await sendDraftMessage(
      user.id,
      draft.client_id,
      messageContent,
      `ai-${draft.context_type}-${draft.client_id}`
    )

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update draft status
    const updateData: any = {
      status: action === 'edit_send' ? 'edited_sent' : 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (action === 'edit_send' && editedContent) {
      updateData.edited_content = editedContent
    }

    await admin
      .from('ai_message_drafts')
      .update(updateData)
      .eq('id', draftId)

    return NextResponse.json({ success: true, action: action === 'edit_send' ? 'edited_sent' : 'sent' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
