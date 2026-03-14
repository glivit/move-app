import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

interface CancelSubscriptionRequest {
  client_id: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is a coach
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as CancelSubscriptionRequest
    const { client_id } = body

    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id is verplicht' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Get client subscription
    const { data: clientData, error: clientError } = await admin
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', client_id)
      .single()

    if (clientError || !clientData?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Abonnement niet gevonden' },
        { status: 404 }
      )
    }

    // Cancel subscription at period end (graceful cancellation)
    const subscription = await stripe.subscriptions.update(
      clientData.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    )

    // Update profile status
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        subscription_status: 'cancelled' as const,
      })
      .eq('id', client_id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Fout bij het bijwerken van het profiel' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        subscription_id: subscription.id,
        status: 'cancelled',
        cancel_at: subscription.cancel_at,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Subscription cancellation error:', error)
    return NextResponse.json(
      { error: 'Fout bij het annuleren van abonnement' },
      { status: 500 }
    )
  }
}
