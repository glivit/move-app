import { createServerSupabaseClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

interface CustomerPortalRequest {
  client_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as CustomerPortalRequest
    const clientId = body.client_id || user.id

    // Get client profile
    const { data: clientProfile, error: clientError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', clientId)
      .single()

    if (clientError || !clientProfile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe klant niet gevonden' },
        { status: 404 }
      )
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: clientProfile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/billing`,
    })

    return NextResponse.json(
      {
        success: true,
        url: session.url,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Customer portal error:', error)
    return NextResponse.json(
      { error: 'Fout bij het maken van facturatieportaal' },
      { status: 500 }
    )
  }
}
