import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Toggle like on a post
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { post_id } = await req.json()
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

  // Check if already liked
  const { data: existing } = await supabase
    .from('community_likes')
    .select('id')
    .eq('post_id', post_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Unlike
    await supabase.from('community_likes').delete().eq('id', existing.id)
    return NextResponse.json({ liked: false })
  } else {
    // Like
    await supabase.from('community_likes').insert({ post_id, user_id: user.id })
    return NextResponse.json({ liked: true })
  }
}
