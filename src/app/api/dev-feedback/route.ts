import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/dev-feedback
 *
 * Ontvangt feedback van DevFeedbackWidget. Slaat op in `dev_feedback` table.
 * RLS dwingt af: enkel authenticated users + insert-own-row.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const {
      url,
      viewport_width,
      viewport_height,
      user_agent,
      element,
      comment,
      severity,
      category,
    } = body as {
      url?: string
      viewport_width?: number
      viewport_height?: number
      user_agent?: string
      element?: {
        selector?: string
        html?: string
        text?: string
        bbox?: { x: number; y: number; width: number; height: number }
        styles?: Record<string, string>
      }
      comment?: string
      severity?: 'blocker' | 'major' | 'minor' | 'nit'
      category?: 'visual' | 'interaction' | 'copy' | 'performance' | 'a11y' | 'other' | null
    }

    if (!url || !comment?.trim()) {
      return NextResponse.json({ error: 'url + comment required' }, { status: 400 })
    }
    const validSeverities = ['blocker', 'major', 'minor', 'nit']
    const sev = severity && validSeverities.includes(severity) ? severity : 'minor'

    const { data, error } = await supabase
      .from('dev_feedback')
      .insert({
        user_id: user.id,
        url,
        viewport_width: viewport_width ?? null,
        viewport_height: viewport_height ?? null,
        user_agent: user_agent ?? null,
        element_selector: element?.selector ?? null,
        element_html: element?.html ?? null,
        element_text: element?.text ?? null,
        element_bbox: element?.bbox ?? null,
        element_styles: element?.styles ?? null,
        comment: comment.trim(),
        severity: sev,
        category: category ?? null,
        status: 'open',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[dev-feedback] insert failed:', error)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, status: 'open' })
  } catch (err) {
    console.error('[dev-feedback] unexpected:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * GET /api/dev-feedback?status=open&limit=50
 *
 * Lijst feedback items. Alleen voor coach/admin via RLS policy.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'open'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200)

    const { data, error } = await supabase
      .from('dev_feedback')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data })
  } catch (err) {
    console.error('[dev-feedback GET] unexpected:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
