# MŌVE Coaching Platform

A Next.js-based coaching application that enables coaches to manage clients, conduct video sessions, and deliver personalized workout and nutrition programs.

## Project Overview

MŌVE is a comprehensive coaching platform designed to help fitness coaches and nutritionists manage their client relationships, deliver coaching content, and track client progress. The platform includes video coaching capabilities, progress check-ins, personalized meal plans, and real-time messaging.

### Key Features

- Coach dashboard with client management.
- Real-time video coaching sessions via Daily.co
- Client check-in system with metrics tracking
- Personalized meal plan generation
- Prompt-based coaching interactions
- Subscription management via Stripe
- Real-time messaging between coaches and clients
- Resource library for clients
- Progress analytics and reporting

## Tech Stack

- **Frontend Framework**: Next.js 16 with React 19
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Video**: Daily.co
- **Styling**: Tailwind CSS 4
- **Forms**: React Hook Form with Zod validation
- **Additional**: Daily.co API, Hevy API for workout tracking

## Prerequisites

Before getting started, ensure you have:

- Node.js 18+ and npm 9+ installed
- A Supabase account (free tier available at supabase.com)
- A Stripe account (free tier available at stripe.com)
- A Daily.co account for video capabilities
- Git installed

## Local Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/move-app.git
cd move-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your actual values:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ESSENTIAL=price_...
STRIPE_PRICE_PERFORMANCE=price_...
STRIPE_PRICE_ELITE=price_...

# Daily.co (required for video)
DAILY_API_KEY=your-api-key
NEXT_PUBLIC_DAILY_DOMAIN=your-domain.daily.co

# Cron Jobs (required)
CRON_SECRET=your-secure-random-string

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

#### Creating a Supabase Project

1. Log in to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API to find your URL and keys
4. Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Go to Settings > Database > Roles and copy `SUPABASE_SERVICE_ROLE_KEY`

#### Database Schema

The application requires the following tables:

```sql
-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('coach', 'client')),
  full_name TEXT,
  email TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing')),
  coach_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Clients (relationships)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(coach_id, client_id)
);

-- Check-ins
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE,
  weight DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Prompts
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  send_day INTEGER,
  send_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Prompt Responses
CREATE TABLE public.prompt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.prompts(id),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  response TEXT,
  coach_seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Meal Plans
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT,
  duration_weeks INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Video Sessions
CREATE TABLE public.video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  room_name TEXT UNIQUE,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cron Logs (optional, for monitoring)
CREATE TABLE public.cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('success', 'failed', 'running')),
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

For detailed schema setup, refer to the Supabase documentation or use SQL migrations.

### 5. Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 6. Running Tests

```bash
npm run test
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_ESSENTIAL` | Yes | Stripe price ID for Essential tier |
| `STRIPE_PRICE_PERFORMANCE` | Yes | Stripe price ID for Performance tier |
| `STRIPE_PRICE_ELITE` | Yes | Stripe price ID for Elite tier |
| `DAILY_API_KEY` | Yes | Daily.co API key |
| `NEXT_PUBLIC_DAILY_DOMAIN` | Yes | Daily.co domain |
| `HEVY_API_KEY` | No | Hevy API key for workout tracking |
| `CRON_SECRET` | Yes | Secret for cron job authentication |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application URL |

## Deployment

### Deploying to Vercel

The easiest way to deploy MŌVE is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Clients
- `GET /api/clients` - List all clients for a coach
- `POST /api/clients` - Add a new client
- `GET /api/clients/[id]` - Get client details

### Subscriptions
- `POST /api/subscriptions/create` - Create a subscription
- `POST /api/subscriptions/cancel` - Cancel a subscription
- `GET /api/stripe/customer-portal` - Access Stripe customer portal

### Messages
- `GET /api/messages` - Get messages for a conversation
- `POST /api/messages` - Send a message
- `PATCH /api/messages/[id]/read` - Mark message as read

### Check-ins
- `GET /api/checkins` - Get check-ins for a client
- `POST /api/checkins` - Create a check-in

### Video Sessions
- `GET /api/video-sessions` - List video sessions
- `POST /api/video-sessions` - Create a video session
- `GET /api/video-sessions/[id]` - Get session details

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Cron Jobs
- `GET /api/cron/send-prompts` - Send scheduled prompts
- `GET /api/cron/check-in-reminders` - Send check-in reminders
- `GET /api/cron/test` - Health check for cron jobs

## Cron Jobs

The application includes scheduled tasks that should be set up in your deployment environment:

### Send Prompts (`/api/cron/send-prompts`)
- **Frequency**: Hourly
- **Description**: Sends scheduled prompts to clients
- **Authentication**: Requires `CRON_SECRET` Bearer token

### Check-in Reminders (`/api/cron/check-in-reminders`)
- **Frequency**: Daily
- **Description**: Sends monthly check-in reminders to clients
- **Authentication**: Requires `CRON_SECRET` Bearer token

### Setup Cron Jobs

For Vercel deployments, use [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs):

```json
// vercel.json
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

## Project Structure

```
move-app/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── (auth)/            # Authentication pages
│   │   ├── coach/             # Coach dashboard
│   │   ├── client/            # Client portal
│   │   ├── api/               # API routes
│   │   │   ├── cron/         # Scheduled jobs
│   │   │   ├── webhooks/     # External webhooks
│   │   │   └── ...           # Other API routes
│   │   ├── layout.tsx         # Root layout
│   │   └── ...
│   ├── components/            # Reusable React components
│   ├── lib/                   # Utility functions
│   │   ├── supabase-*.ts      # Supabase clients
│   │   ├── stripe.ts          # Stripe configuration
│   │   └── ...
│   ├── types/                 # TypeScript types
│   └── middleware.ts          # Next.js middleware
├── public/                    # Static assets
├── scripts/                   # Build and deploy scripts
├── .env.example               # Environment variables template
├── package.json
└── tsconfig.json
```

## Code Conventions

- **Supabase**: Use untyped clients (no `<Database>` generic)
- **Next.js 16 API Routes**: Params must be `Promise<{...}>` and unwrapped with `await`
- **Server Supabase**: Import from `@/lib/supabase-server` with `createServerSupabaseClient` (needs `await`)
- **Admin Supabase**: Import from `@/lib/supabase-admin` with `createAdminClient`

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For issues or questions, contact the development team.
