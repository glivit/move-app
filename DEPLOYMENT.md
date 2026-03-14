# MŌVE Deployment Guide

This guide provides step-by-step instructions for deploying the MŌVE coaching platform to production.

## Table of Contents

1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [Deploying to Vercel](#deploying-to-vercel)
3. [Setting Up Stripe](#setting-up-stripe)
4. [Setting Up Supabase](#setting-up-supabase)
5. [Configuring Cron Jobs](#configuring-cron-jobs)
6. [Post-deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)

## Pre-deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass locally: `npm run build`
- [ ] Environment variables are configured in Vercel
- [ ] Supabase project is set up with all required tables
- [ ] Stripe products and prices are configured
- [ ] Daily.co project is created and domain is set up
- [ ] CRON_SECRET is set to a secure random value
- [ ] Application URL is configured correctly
- [ ] Database backups are configured
- [ ] SSL certificate is valid for your domain

## Deploying to Vercel

### Step 1: Prepare Your Repository

```bash
# Ensure all changes are committed
git status

# Push to your main branch
git push origin main
```

### Step 2: Create a Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New" → "Project"
4. Select your GitHub repository
5. Configure project settings:
   - **Framework**: Next.js
   - **Root Directory**: ./move-app (if using monorepo)
   - **Environment Variables**: See section below

### Step 3: Add Environment Variables in Vercel

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables for **Production**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_live_... (use live keys in production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ESSENTIAL=price_...
STRIPE_PRICE_PERFORMANCE=price_...
STRIPE_PRICE_ELITE=price_...
DAILY_API_KEY=your-daily-api-key
NEXT_PUBLIC_DAILY_DOMAIN=your-domain.daily.co
CRON_SECRET=your-secure-random-32-character-string
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Step 4: Deploy

1. Click **Deploy** button in Vercel dashboard
2. Wait for build to complete (typically 2-5 minutes)
3. Verify deployment at your Vercel URL
4. Set up custom domain if needed

## Setting Up Stripe

### Step 1: Create Stripe Products

1. Go to [stripe.com/dashboard](https://stripe.com/dashboard)
2. Navigate to **Products**
3. Create three products:
   - **Essential**: Recurring monthly subscription
   - **Performance**: Recurring monthly subscription
   - **Elite**: Recurring monthly subscription

### Step 2: Create Prices

For each product, create a monthly recurring price:

1. Click on product
2. Click **Add pricing** button
3. Set pricing tier (e.g., $29/month for Essential)
4. Set recurring frequency to **Monthly**
5. Save price ID (e.g., `price_...`)

### Step 3: Configure Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy webhook signing secret
6. Add to environment variables as `STRIPE_WEBHOOK_SECRET`

### Step 4: Get API Keys

1. Go to **Developers** → **API keys**
2. Copy **Secret key** (starts with `sk_live_`)
3. Copy **Publishable key** (starts with `pk_live_`)
4. Add to environment variables

## Setting Up Supabase

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **New project**
3. Configure:
   - **Project name**: mōve-production
   - **Database password**: Use strong password
   - **Region**: Choose region closest to users
4. Create project and wait for initialization

### Step 2: Get Connection Keys

1. Go to **Settings** → **API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Set Up Database Schema

1. Go to **SQL Editor**
2. Create a new query
3. Copy the SQL schema from `README.md` database section
4. Execute query
5. Verify all tables are created

### Step 4: Configure Row-Level Security (RLS)

Enable RLS for production security:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

### Step 5: Configure Backups

1. Go to **Settings** → **Backups**
2. Enable **Automatic backups**
3. Set backup frequency to **Daily**
4. Configure backup retention

## Configuring Cron Jobs

### For Vercel Deployments

Create or update `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-prompts",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/check-in-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Schedule definitions (cron format):

- `0 * * * *` - Every hour at the top of the hour
- `0 9 * * *` - Every day at 9:00 AM UTC
- `0 0 * * 1` - Every Monday at midnight UTC

### Testing Cron Jobs

Test cron job endpoint with:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://yourdomain.com/api/cron/test

# Expected response:
# {
#   "success": true,
#   "message": "Cron jobs health check",
#   "timestamp": "2024-03-13T10:00:00.000Z",
#   "cronJobs": [
#     {
#       "name": "Send Prompts",
#       "endpoint": "/api/cron/send-prompts",
#       "lastRun": null,
#       "status": "pending"
#     },
#     {
#       "name": "Check-in Reminders",
#       "endpoint": "/api/cron/check-in-reminders",
#       "lastRun": null,
#       "status": "pending"
#     }
#   ],
#   "totalJobs": 2,
#   "databaseConnected": true
# }
```

## Post-deployment Verification

### Step 1: Verify Application Loads

1. Visit your application URL: `https://yourdomain.com`
2. Check that page loads without errors
3. Verify styling and assets are loaded

### Step 2: Test Authentication

1. Create a test coach account
2. Create a test client account
3. Verify login/logout functionality
4. Test password reset

### Step 3: Test Payments

1. Use Stripe test card: `4242 4242 4242 4242`
2. Expiry: any future date
3. CVC: any 3 digits
4. Create a test subscription
5. Verify subscription status in database
6. Check that coach notification was created

### Step 4: Verify Notifications

Query the notifications table:

```sql
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

Check for payment notifications and other system notifications.

### Step 5: Test Video Functionality

1. Create a video session
2. Verify Daily.co room is created
3. Test joining from browser
4. Verify video/audio works

### Step 6: Verify Cron Jobs

```bash
# Test send-prompts cron
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://yourdomain.com/api/cron/send-prompts

# Test check-in-reminders cron
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://yourdomain.com/api/cron/check-in-reminders

# Check cron job status
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://yourdomain.com/api/cron/test
```

## Monitoring & Maintenance

### View Application Logs

In Vercel dashboard:

1. Go to your project
2. Click **Deployments**
3. Select latest deployment
4. Click **Logs** tab
5. Filter by function, date, etc.

### Monitor Database

In Supabase dashboard:

1. Go to **Monitoring** → **Database**
2. View query performance
3. Check disk usage
4. Monitor connections

### Set Up Alerts

Configure Vercel alerts:

1. Go to **Settings** → **Integrations**
2. Add Slack or email notifications for:
   - Build failures
   - Deployment errors
   - Performance issues

### Regular Maintenance Tasks

**Weekly:**
- Review error logs in Vercel
- Check Supabase query performance
- Verify cron jobs ran successfully

**Monthly:**
- Review Stripe transactions
- Clean up old logs/notifications
- Update dependencies: `npm update`

**Quarterly:**
- Full security audit
- Database optimization
- Load testing

### Rollback Procedure

If you need to rollback to a previous version:

1. In Vercel dashboard, go to **Deployments**
2. Find the stable deployment
3. Click the three dots menu
4. Select **Promote to Production**
5. Verify rollback succeeded

### Database Backups

Supabase automatically backs up your database daily. To restore:

1. Go to Supabase dashboard
2. **Settings** → **Backups**
3. Click **Restore** on desired backup
4. Select target database
5. Confirm restoration

## Troubleshooting

### Build Fails

1. Check Vercel build logs
2. Ensure all environment variables are set
3. Run `npm install && npm run build` locally
4. Commit and push fixes

### Environment Variables Not Loading

1. Verify variables are set in Vercel dashboard
2. Redeploy after adding variables
3. Check variable names match exactly
4. Verify no extra spaces in values

### Cron Jobs Not Running

1. Check `vercel.json` is in project root
2. Verify CRON_SECRET is set
3. Test endpoint manually with curl
4. Check Vercel deployment logs

### Stripe Webhooks Not Firing

1. Verify webhook endpoint is correct in Stripe dashboard
2. Check `STRIPE_WEBHOOK_SECRET` is set
3. Review webhook logs in Stripe dashboard
4. Test webhook with Stripe CLI: `stripe listen --forward-to yourdomain.com/api/webhooks/stripe`

### Database Connection Issues

1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Check Supabase project is running
3. Verify database is not in maintenance mode
4. Check connection limits not exceeded

## Performance Optimization

### Content Delivery

1. Enable Vercel edge caching for static assets
2. Configure ISR (Incremental Static Regeneration) for pages
3. Use Next.js image optimization

### Database

1. Create indexes on frequently queried columns
2. Monitor slow queries in Supabase
3. Archive old notifications/messages periodically
4. Implement connection pooling

### Monitoring

1. Set up performance monitoring with Vercel Analytics
2. Monitor Core Web Vitals
3. Track API response times
4. Monitor database query times

## Security Checklist

- [ ] All environment variables use production values
- [ ] Stripe uses live API keys (not test keys)
- [ ] CRON_SECRET is strong and unique
- [ ] Supabase RLS policies are enabled
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Database backups are automated
- [ ] Sensitive logs are not exposed
- [ ] Regular security audits are scheduled

## Next Steps

1. Set up monitoring and alerts
2. Configure email notifications for important events
3. Create runbooks for common issues
4. Schedule regular maintenance windows
5. Plan capacity and scaling strategy
