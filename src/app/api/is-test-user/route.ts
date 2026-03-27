import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

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
    return NextResponse.json({ isTestUser: ids.includes(user.id) })
  } catch {
    return NextResponse.json({ isTestUser: false })
  }
}
