import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/conversations/[clientId]/priority
 * Toggle priority flag — stored client-side for now (localStorage).
 * This route just verifies the user is authenticated and returns success.
 * A production implementation would use a dedicated priority_conversations table.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { isPriority } = await request.json()

    return NextResponse.json({
      success: true,
      clientId,
      isPriority: !!isPriority,
    })
  } catch (error) {
    console.error('Priority toggle error:', error)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    // Priority is managed client-side for now
    const response = NextResponse.json({ clientId, isPriority: false })
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
    return response
  } catch (error) {
    console.error('Priority check error:', error)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}
