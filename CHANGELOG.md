# MŌVE Coaching App — Changelog

All notable changes to the MŌVE coaching platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-03-13

### MVP Launch 🚀

**MŌVE Coaching App** launches as a comprehensive, single-coach platform for managing client transformations.

#### Added

**Core Features:**
- **Authentication:** Secure sign-in with email/password and magic links
- **Coach Dashboard:** Comprehensive overview of all clients, daily schedule, and key metrics
- **Client Management:** Add clients with onboarding, manage profiles, track subscriptions
- **Progress Tracking:**
  - Body composition tracking with before/after photos and measurements
  - Workout logging with exercise tracking, sets, reps, and weight
  - Strength progression analytics and historical charts
- **Training Programs:**
  - Create custom workout programs and assign to clients
  - Structured workout builder with exercise library
  - Workout previews and modifications
- **Messaging & Communication:**
  - Real-time coach-to-client messaging
  - Message history and search
  - Photo and file sharing in messages
  - Offline message queueing
- **Billing & Subscriptions:**
  - Multiple subscription tiers (Basic, Pro, Elite)
  - Stripe integration for secure payments
  - Automatic invoice generation
  - Subscription management and status tracking
- **Video Integration:**
  - Vimeo embed support for instructional videos
  - Video playback within workout context
  - Performance optimization for slow connections
- **PDF Reports:**
  - Generate client progress reports
  - Downloadable summaries of transformations
- **Push Notifications:**
  - Real-time notifications for messages and reminders
  - Web push support
  - Offline notification queuing
- **Offline Support:**
  - PWA (Progressive Web App) with service worker
  - Offline workout completion
  - Automatic sync when online
  - Offline indicator in UI
- **Performance:**
  - Web Vitals monitoring (LCP, FID, CLS)
  - Analytics tracking (pageviews and events)
  - Error logging and reporting
  - Lightweight error logger (extensible to Sentry)
- **Mobile-Optimized:**
  - Fully responsive design
  - Touch-friendly interface
  - Mobile app installable via manifest
- **Accessibility:**
  - WCAG 2.1 compliance
  - Keyboard navigation
  - Screen reader support
  - Color contrast standards met
- **User Experience:**
  - Feedback widget for continuous improvement
  - Smooth animations and transitions
  - Loading states and skeletons
  - Error boundaries and graceful error handling
  - Empty states with helpful guidance
- **Internationalization:**
  - Dutch (Flemish) language support
  - Locale-aware formatting (dates, numbers)
  - Currency display for EUR/USD

#### Technical Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS with custom design system
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Authentication:** Supabase Auth with JWT
- **Payments:** Stripe API for subscriptions and invoicing
- **Storage:** Supabase Storage for photos and files
- **Real-time:** Supabase Realtime for messaging
- **Infrastructure:** Vercel for hosting and deployment
- **Monitoring:** Custom lightweight error logging, built-in analytics

#### Design System

- **Color Palette:** Warm, premium aesthetic with gold accents (#C8A96E primary)
- **Typography:**
  - Display: Cormorant Garamond (serif, elegant)
  - Body: DM Sans (sans-serif, modern)
  - Mono: DM Mono (monospace, technical)
- **Components:** Custom UI library with Button, Input, Card, Badge, and more
- **Icons:** Lucide React for consistent iconography

#### Database Schema

Core tables implemented:
- `profiles` — User profiles and settings
- `clients` — Client data and metadata
- `subscriptions` — Subscription tracking and history
- `workouts` — Workout program definitions
- `workout_logs` — Client workout completion logs
- `exercises` — Exercise library with descriptions
- `progress_photos` — Before/after and progress photos
- `body_metrics` — Weight, measurements, and body composition
- `messages` — Coach-client messages
- `feedback` — User feedback collection

#### Environment Configuration

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `VIMEO_ACCESS_TOKEN`

#### Known Limitations

- Single-coach architecture (multi-coach support planned for Phase 10)
- Community features not included (planned for Phase 11)
- No native mobile app yet (planned for Phase 11)
- AI insights not available (planned for Phase 10)
- Limited wearables integration (planned for Phase 9)

#### Testing & Quality Assurance

- Manual QA across desktop and mobile
- Performance tested on 4G networks
- Cross-browser tested (Chrome, Safari, Firefox, Edge)
- Accessibility audit performed

#### Deployment

- Vercel deployment with automatic preview deployments
- Database migrations managed via Supabase
- Environment-based configuration
- Automatic SSL/TLS certificates

---

## [Unreleased] — Upcoming

See [ROADMAP-FUTURE.md](./ROADMAP-FUTURE.md) for planned features in upcoming phases:

- **Phase 8:** Advanced Analytics, Voice Messages, Batch Operations
- **Phase 9:** Wearables Integration, Advanced Scheduling, Flexible Payments
- **Phase 10:** Multi-Coach Support, AI Insights, Community Features
- **Phase 11+:** Native Mobile Apps, Enterprise Features

---

## Versioning Scheme

- **Major** (1.0.0): Significant features, breaking changes
- **Minor** (1.x.0): New features, backward compatible
- **Patch** (1.0.x): Bug fixes, minor improvements

---

## Credits

**Built with ❤️ by MŌVE Team**

MŌVE is a premium coaching platform designed to help coaches transform their clients' bodies and minds.

---

**Last Updated:** March 13, 2026
