import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Lazy-initialize Stripe server client (avoids build-time crash when env var is missing)
let _stripe: Stripe | null = null

export function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
    })
  }
  return _stripe
}

// Keep backward-compatible export (lazy getter)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeServer() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Initialize Stripe.js for client-side
let stripePromise: ReturnType<typeof loadStripe>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')
  }
  return stripePromise
}

// Package prices mapping
export const PACKAGE_PRICES = {
  essential: process.env.STRIPE_PRICE_ESSENTIAL || 'price_essential',
  performance: process.env.STRIPE_PRICE_PERFORMANCE || 'price_performance',
  elite: process.env.STRIPE_PRICE_ELITE || 'price_elite',
} as const

// Package price in cents
export const PACKAGE_AMOUNTS = {
  essential: 29700, // €297.00 in cents
  performance: 49700, // €497.00 in cents
  elite: 79700, // €797.00 in cents
} as const

// Get package price in cents
export function getPackagePrice(tier: keyof typeof PACKAGE_AMOUNTS): number {
  return PACKAGE_AMOUNTS[tier]
}

// Get package display price (in euros)
export function getPackageDisplayPrice(tier: keyof typeof PACKAGE_AMOUNTS): string {
  const cents = PACKAGE_AMOUNTS[tier]
  const euros = cents / 100
  return euros.toFixed(2)
}

// Get package price ID from Stripe
export function getPriceId(tier: keyof typeof PACKAGE_PRICES): string {
  return PACKAGE_PRICES[tier]
}
