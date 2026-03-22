import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id') || user.id

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Get checkins with photos
    const { data: checkins, error } = await db
      .from('checkins')
      .select('id, date, weight_kg, body_fat_pct, photo_front_url, photo_back_url, photo_left_url, photo_right_url')
      .eq('client_id', clientId)
      .order('date', { ascending: true })

    if (error) throw error

    // Filter to only those with at least one photo
    const withPhotos = (checkins || []).filter((c: any) =>
      c.photo_front_url || c.photo_back_url || c.photo_left_url || c.photo_right_url
    )

    // Also get intake form photos
    const { data: intake } = await db
      .from('intake_forms')
      .select('photo_front_url, photo_back_url, photo_left_url, photo_right_url, created_at')
      .eq('client_id', clientId)
      .single()

    let intakePhotos = null
    if (intake && (intake.photo_front_url || intake.photo_back_url || intake.photo_left_url || intake.photo_right_url)) {
      intakePhotos = {
        id: 'intake',
        date: intake.created_at?.split('T')[0] || 'Intake',
        label: 'Intake',
        photo_front_url: intake.photo_front_url,
        photo_back_url: intake.photo_back_url,
        photo_left_url: intake.photo_left_url,
        photo_right_url: intake.photo_right_url,
      }
    }

    const allPhotoDates = [
      ...(intakePhotos ? [intakePhotos] : []),
      ...withPhotos.map((c: any) => ({
        ...c,
        label: new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
      })),
    ]

    return NextResponse.json({
      data: allPhotoDates,
      total: allPhotoDates.length,
    })
  } catch (error: any) {
    console.error('Error fetching progress photos:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
