import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkInSchema } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const clientId = url.searchParams.get('client_id')

  let query = supabase.from('checkins').select('*').order('date', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const response = NextResponse.json(data)
  response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=600')
  return response
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Validate request body with zod
  const validation = checkInSchema.safeParse({
    ...body,
    client_id: user.id,
  })
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    return NextResponse.json(
      {
        error: 'Validatiefout',
        fields: errors,
      },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('checkins')
    .insert(validation.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
