import { createAdminClient } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Geen webhook signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get client by Stripe customer ID
        const { data: client } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (client) {
          const status = subscription.status as 'active' | 'past_due' | 'cancelled' | 'trialing'
          await admin
            .from('profiles')
            .update({
              subscription_status: status,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', client.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get client by Stripe customer ID
        const { data: client } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (client) {
          await admin
            .from('profiles')
            .update({
              subscription_status: 'cancelled',
            })
            .eq('id', client.id)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Get client by Stripe customer ID
        const { data: client } = await admin
          .from('profiles')
          .select('id, coach_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (client) {
          // Update subscription status
          await admin
            .from('profiles')
            .update({
              subscription_status: 'active',
            })
            .eq('id', client.id)

          // Create notification for coach if available
          if (client.coach_id) {
            const amount = invoice.amount_paid
              ? (invoice.amount_paid / 100).toFixed(2)
              : 'N/A'
            const amountCurrency = invoice.currency?.toUpperCase() || 'EUR'

            const { error: notifError } = await admin
              .from('notifications')
              .insert({
                user_id: client.coach_id,
                type: 'payment_received',
                title: 'Betaling ontvangen',
                message: `Betaling van €${amount} ${amountCurrency} ontvangen van client. Abonnement actief.`,
                read: false,
                created_at: new Date().toISOString(),
              })
            if (notifError) {
              console.error('Failed to create coach notification:', notifError)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Get client by Stripe customer ID
        const { data: client } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (client) {
          await admin
            .from('profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', client.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
