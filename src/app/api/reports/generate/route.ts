import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateCheckInPDF } from '@/lib/pdf-generator'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface GenerateReportRequest {
  checkin_id: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: GenerateReportRequest = await request.json()
    const { checkin_id } = body

    if (!checkin_id) {
      return NextResponse.json(
        { error: 'Missing checkin_id' },
        { status: 400 }
      )
    }

    // Get the check-in data
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .select('*')
      .eq('id', checkin_id)
      .single()

    if (checkinError || !checkin) {
      return NextResponse.json(
        { error: 'Check-in not found' },
        { status: 404 }
      )
    }

    // Get client profile for name
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', checkin.client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check authorization - user must be the coach or the client
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (clientProfile?.role !== 'coach' && checkin.client_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Generate PDF
    const pdfBuffer = await generateCheckInPDF({
      clientName: client.full_name,
      date: checkin.date,
      weight_kg: checkin.weight_kg,
      body_fat_pct: checkin.body_fat_pct,
      muscle_mass_kg: checkin.muscle_mass_kg,
      waist_cm: checkin.waist_cm,
      chest_cm: checkin.chest_cm,
      hips_cm: checkin.hips_cm,
      left_arm_cm: checkin.left_arm_cm,
      right_arm_cm: checkin.right_arm_cm,
      left_thigh_cm: checkin.left_thigh_cm,
      right_thigh_cm: checkin.right_thigh_cm,
      left_calf_cm: checkin.left_calf_cm,
      right_calf_cm: checkin.right_calf_cm,
      coachNotes: checkin.coach_notes,
    })

    // Upload PDF to Supabase Storage
    const fileName = `${checkin.client_id}/${checkin.id}_${new Date().getTime()}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName)

    const pdfUrl = publicUrlData.publicUrl

    // Create report record in database
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([
        {
          client_id: checkin.client_id,
          checkin_id: checkin.id,
          pdf_url: pdfUrl,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (reportError) {
      console.error('Error creating report record:', reportError)
      return NextResponse.json(
        { error: 'Failed to create report record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        pdf_url: pdfUrl,
        created_at: report.created_at,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
