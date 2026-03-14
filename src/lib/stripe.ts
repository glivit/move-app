import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe server client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover',
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
