import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch community posts with likes and comments count
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data: posts, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:profiles!community_posts_author_id_fkey(id, full_name, avatar_url, role),
      likes:community_likes(count),
      comments:community_comments(count)
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get user's likes
  const postIds = (posts || []).map((p: any) => p.id)
  const { data: userLikes } = await supabase
    .from('community_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds)

  const likedSet = new Set((userLikes || []).map((l: any) => l.post_id))

  const enriched = (posts || []).map((post: any) => ({
    ...post,
    like_count: post.likes?.[0]?.count || 0,
    comment_count: post.comments?.[0]?.count || 0,
    user_liked: likedSet.has(post.id),
  }))

  return NextResponse.json(enriched)
}

// POST: Create a new post
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { content, post_type = 'update', image_url } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: user.id,
      content: content.trim(),
      post_type,
      image_url: image_url || null,
    })
    .select(`
      *,
      author:profiles!community_posts_author_id_fkey(id, full_name, avatar_url, role)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, like_count: 0, comment_count: 0, user_liked: false })
}
