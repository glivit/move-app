import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { stripe, getPriceId } from '@/lib/stripe'
import { subscriptionSchema } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

interface CreateSubscriptionRequest {
  client_id: string
  package_tier: 'essential' | 'performance' | 'elite'
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

    const body = await request.json() as CreateSubscriptionRequest

    // Validate request body with zod
    const validation = subscriptionSchema.safeParse(body)
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

    const { client_id, package_tier } = validation.data

    const admin = createAdminClient()

    // Get client profile
    const { data: clientProfile, error: clientError } = await admin
      .from('profiles')
      .select('id, email')
      .eq('id', client_id)
      .single()

    if (clientError || !clientProfile) {
      return NextResponse.json(
        { error: 'Client niet gevonden' },
        { status: 404 }
      )
    }

    // Check if client already has a subscription
    const { data: existingSubscription } = await admin
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', client_id)
      .single()

    let stripeCustomerId = existingSubscription?.stripe_customer_id

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: clientProfile.email,
        metadata: {
          client_id,
        },
      })
      stripeCustomerId = customer.id
    }

    // Create subscription
    const priceId = getPriceId(package_tier)

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    })

    // Update profile with subscription data
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status as 'active' | 'past_due' | 'cancelled' | 'trialing',
        package: package_tier,
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
        status: subscription.status,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: 'Fout bij het maken van abonnement' },
      { status: 500 }
    )
  }
}
