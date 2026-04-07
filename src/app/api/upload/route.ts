import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

// POST: Upload a file to Supabase storage (bypasses RLS via admin client)
export async function POST(request: NextRequest) {
  // Auth check via regular client
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'message-attachments'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Use admin client for storage upload to bypass RLS
    let db: any
    try { db = createAdminClient() } catch { db = supabase }

    const fileExt = file.name.split('.').pop() || 'mp4'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await db.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = db.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      fileName,
    })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
