# Stripe Billing System Integration Guide

## Overview

The MŌVE coaching app now has a complete Stripe billing system for managing client subscriptions with three tiers:
- **Essential**: €297/month
- **Performance**: €497/month
- **Elite**: €797/month

## Files Created

### 1. Core Library (`src/lib/stripe.ts`)
Initializes Stripe clients and exports helper functions:
- `stripe` - Server-side Stripe instance
- `getStripe()` - Client-side Stripe promise
- `PACKAGE_PRICES` - Maps tiers to Stripe price IDs
- `PACKAGE_AMOUNTS` - Price in cents
- `getPackagePrice(tier)` - Get price in cents
- `getPackageDisplayPrice(tier)` - Get formatted price in euros
- `getPriceId(tier)` - Get Stripe price ID

### 2. API Routes

#### `src/app/api/subscriptions/create/route.ts`
**POST /api/subscriptions/create**
- Creates a new subscription for a client
- Request body:
  ```json
  {
    "client_id": "uuid",
    "package_tier": "essential" | "performance" | "elite"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "subscription_id": "sub_...",
    "status": "trialing" | "active" | "past_due" | "cancelled"
  }
  ```
- Updates profiles table with:
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `subscription_status`
  - `package`

#### `src/app/api/subscriptions/cancel/route.ts`
**POST /api/subscriptions/cancel**
- Cancels a subscription gracefully (at period end)
- Request body:
  ```json
  {
    "client_id": "uuid"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "subscription_id": "sub_...",
    "status": "cancelled",
    "cancel_at": timestamp
  }
  ```

#### `src/app/api/stripe/customer-portal/route.ts`
**POST /api/stripe/customer-portal**
- Creates Stripe Customer Portal session
- Request body (optional):
  ```json
  {
    "client_id": "uuid"  // Optional, defaults to current user
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "url": "https://billing.stripe.com/..."
  }
  ```

#### `src/app/api/webhooks/stripe/route.ts`
**POST /api/webhooks/stripe**
- Handles Stripe webhook events
- Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handles events:
  - `customer.subscription.updated` → Updates subscription_status
  - `customer.subscription.deleted` → Sets status to 'cancelled'
  - `invoice.payment_succeeded` → Sets status to 'active'
  - `invoice.payment_failed` → Sets status to 'past_due'

### 3. UI Components

#### `src/components/ui/SubscriptionBadge.tsx`
Displays subscription status with color-coded badges:
- **Actief** (green) - CheckCircle2 icon
- **Achterstallig** (amber) - AlertCircle icon
- **Geannuleerd** (red) - XCircle icon
- **Proefperiode** (blue) - Clock icon
- **Geen abonnement** (gray) - When null

Usage:
```tsx
<SubscriptionBadge status="active" size="sm" />
```

#### `src/components/billing/StripePortal.tsx`
Button to open Stripe Customer Portal:
```tsx
<StripePortal clientId={optional_client_id} />
```

Features:
- Loading state during portal creation
- Error handling
- Redirects to portal URL

#### `src/components/coach/BillingDashboard.tsx`
Complete billing dashboard showing:
- **MRR Card**: Monthly Recurring Revenue (€X.XXX/maand)
- **Stats Cards**:
  - Active subscriptions count
  - Past due subscriptions count
  - Cancelled subscriptions count
- **Client Table**:
  - Client name and email
  - Package badge (Essential/Performance/Elite)
  - Subscription status badge
  - Account creation date

Usage:
```tsx
<BillingDashboard
  clients={clients}
  mrr={1200.50}
  activeCount={5}
  pastDueCount={1}
  cancelledCount={0}
/>
```

#### `src/components/loading/BillingSkeleton.tsx`
Loading skeleton that matches the billing dashboard layout:
- MRR card skeleton
- 3 stat card skeletons
- Table row skeletons

#### `src/components/empty-states/CallsEmpty.tsx`
Empty state for video calls section:
- Title: "Geen geplande gesprekken"
- Description: "Plan een videogesprek met je coach."
- Video icon

### 4. Page Component

#### `src/app/coach/billing/page.tsx`
Billing management page for coaches:
- Loads all clients with subscription data
- Calculates MRR from active subscriptions
- Filter buttons: All, Active, Past Due, Cancelled
- Shows filtered client list in dashboard
- Link to Stripe Dashboard
- Loading state with skeleton
- "Facturatie beheren" button to open customer portal

## Environment Variables

Required environment variables (add to `.env.local`):

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe Dashboard)
# These are optional - if not provided, defaults are used
STRIPE_PRICE_ESSENTIAL=price_...
STRIPE_PRICE_PERFORMANCE=price_...
STRIPE_PRICE_ELITE=price_...
```

## Database Schema

The `profiles` table must include these columns:

```sql
ALTER TABLE profiles ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN subscription_status VARCHAR(50) DEFAULT NULL;
  -- Values: 'active', 'past_due', 'cancelled', 'trialing', NULL

-- Add indexes for faster lookups
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
```

## Setup Instructions

### 1. Configure Stripe Account

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create three products with recurring billing:
   - **MŌVE Essential** - €297/month
   - **MŌVE Performance** - €497/month
   - **MŌVE Elite** - €797/month
3. Copy the Price IDs and add to `.env.local`
4. Enable Stripe Tax (if needed for EU compliance)

### 2. Set Up Webhooks

1. Go to Developers → Webhooks
2. Add endpoint: `https://yourapp.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 3. Test Locally

Use Stripe CLI to forward webhook events:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to local endpoint
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger customer.subscription.updated
```

### 4. Database Updates

Run migrations to add the required columns to the `profiles` table.

## Integration Examples

### Creating a Subscription

```typescript
const response = await fetch('/api/subscriptions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: 'client-uuid',
    package_tier: 'performance'
  })
})

const data = await response.json()
console.log('Subscription created:', data.subscription_id)
```

### Cancelling a Subscription

```typescript
const response = await fetch('/api/subscriptions/cancel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: 'client-uuid'
  })
})

const data = await response.json()
console.log('Subscription cancelled at:', data.cancel_at)
```

### Opening Customer Portal

```typescript
const response = await fetch('/api/stripe/customer-portal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: 'optional-client-uuid'
  })
})

const data = await response.json()
window.location.href = data.url
```

## Features

✓ **MRR Calculation**: Automatic monthly revenue calculation from active subscriptions
✓ **Graceful Cancellation**: Subscriptions cancel at period end, not immediately
✓ **Real-time Updates**: Stripe webhooks update subscription status in real-time
✓ **Status Tracking**: 4 subscription states (active, past_due, cancelled, trialing)
✓ **Role-based Access**: Only coaches can manage subscriptions
✓ **Client Portal**: Self-service billing management for clients
✓ **Dutch Language**: All labels and messages in Dutch (Flemish)
✓ **Beautiful UI**: Tailored to design system with warm colors
✓ **Error Handling**: Comprehensive error messages and logging
✓ **Loading States**: Skeleton screens during data loading

## Security Notes

- All API routes validate that the requester is a coach
- Webhook signatures are verified against `STRIPE_WEBHOOK_SECRET`
- Admin client is used for profile updates (secure)
- No sensitive data is logged
- All stripe_* fields are server-only (not sent to client)

## Troubleshooting

### Webhook Events Not Being Received

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check that webhook endpoint is publicly accessible
3. Use Stripe CLI to test: `stripe trigger customer.subscription.updated`
4. Check server logs for signature verification errors

### MRR Calculation Issues

- Only subscriptions with `subscription_status = 'active'` are included
- Check that `package` field is set correctly (essential/performance/elite)
- Verify pricing amounts in `src/lib/stripe.ts`

### Customer Portal Not Opening

1. Verify `STRIPE_PUBLISHABLE_KEY` is correct
2. Check that `stripe_customer_id` is set in database
3. Ensure return_url is accessible (check environment variable)

## Testing Checklist

- [ ] Can create subscription via API
- [ ] Webhook updates subscription status correctly
- [ ] MRR displays correctly for active subscriptions
- [ ] Cancel subscription works and sets cancel_at date
- [ ] Customer portal opens and allows billing management
- [ ] Status badges display with correct colors/icons
- [ ] Filters work (All, Active, Past Due, Cancelled)
- [ ] Loading skeleton displays during data fetch
- [ ] Error messages are user-friendly (Dutch)
- [ ] Only coaches can access billing page

## Production Checklist

- [ ] Use live Stripe keys (not test)
- [ ] Test webhook endpoint with live events
- [ ] Verify HTTPS is enabled on webhook endpoint
- [ ] Set up email notifications for failed payments
- [ ] Configure tax settings if operating in EU
- [ ] Test all subscription states in production
- [ ] Verify MRR calculations with actual data
- [ ] Set up monitoring/alerts for webhook failures
- [ ] Document Stripe dashboard access for team
- [ ] Plan backup webhook delivery if needed
