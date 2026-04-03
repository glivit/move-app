import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch comments for a post
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('post_id')
  if (!postId) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('community_comments')
    .select(`
      *,
      author:profiles!community_comments_author_id_fkey(id, full_name, avatar_url, role)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const response = NextResponse.json(data)
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
  return response
}

// POST: Create a comment
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { post_id, content } = await req.json()
  if (!post_id || !content?.trim()) {
    return NextResponse.json({ error: 'post_id and content required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id,
      author_id: user.id,
      content: content.trim(),
    })
    .select(`
      *,
      author:profiles!community_comments_author_id_fkey(id, full_name, avatar_url, role)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
