import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ isTestUser: false })
    }

    // Use admin client to bypass RLS and check first 15 users
    const admin = createAdminClient()
    const { data: earlyUsers } = await admin
      .from('profiles')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(15)

    const ids = (earlyUsers || []).map((u: any) => u.id)
    const response = NextResponse.json({ isTestUser: ids.includes(user.id) })
    response.headers.set('Cache-Control', 'private, max-age=3600, stale-while-revalidate=86400')
    return response
  } catch {
    return NextResponse.json({ isTestUser: false })
  }
}
