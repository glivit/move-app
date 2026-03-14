# MŌVE Coaching App — Architecture & Scaling Guide

This document outlines the current single-coach architecture and the changes required to scale to multi-coach, enterprise, and large-scale deployments.

## Current Architecture (MVP — Single Coach)

### Data Model Overview

The MVP is designed around a **single-coach, many-clients** model. The coach owns all data, and clients are passive consumers of information.

#### Core Tables (Current)

```
┌─────────────┐         ┌──────────────┐
│  profiles   │◄────────┤  clients     │
│  (auth)     │         │  (per coach) │
└─────────────┘         └──────────────┘
      ▲                       │
      │                       ▼
      │              ┌─────────────────────────────┐
      │              │ Related Data Tables:        │
      │              │ - workouts                  │
      │              │ - workout_logs              │
      │              │ - exercises                 │
      │              │ - progress_photos           │
      │              │ - body_metrics              │
      │              │ - check_ins                 │
      │              │ - meal_plans                │
      │              │ - messages                  │
      │              │ - subscriptions             │
      │              └─────────────────────────────┘
      │
      └── All data linked to a single coach
```

### Key Characteristics

- **Ownership:** One coach ID is implicit (currently authenticated user)
- **Isolation:** Data is not explicitly scoped to a coach; relies on authentication checks in RLS policies
- **Scalability:** Works well for single coach; doesn't support multi-coach or team scenarios
- **Multi-Tenancy:** Not implemented; auth-user-based filtering only

### Current RLS Policies Example

```sql
-- Simplified current approach
CREATE POLICY "Coaches can view their own clients"
  ON clients
  FOR SELECT
  USING (auth.uid() = coach_id);  -- Assumes coach_id exists but not enforced
```

**Problem:** No explicit `coach_id` or `organization_id` column, making it difficult to:
- Support multiple coaches in one account
- Transfer clients between coaches
- Create team-based workspaces
- Implement role-based access control (RBAC)

---

## Multi-Coach Architecture (Phase 10)

### Changes Required

#### 1. Add Organization Concept

Create an `organizations` table to group coaches and clients:

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  stripe_customer_id VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'starter', -- starter, pro, enterprise
  max_coaches INT DEFAULT 1,
  max_clients INT DEFAULT 100,
  features JSONB DEFAULT '{}'
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
```

**Effort:** Low (1-2 days)

#### 2. Add Coach-Organization Relationship

Add explicit coach references and organization linking:

```sql
-- Alter profiles table
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN role VARCHAR(50) DEFAULT 'coach'; -- coach, admin, assistant
ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;

CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Add table for explicit coach permissions
CREATE TABLE coach_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  permission VARCHAR(100) NOT NULL, -- view_analytics, manage_clients, manage_team, billing
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(coach_id, organization_id, permission)
);
```

**Effort:** Medium (3-4 days)

#### 3. Add Explicit Coach References to All Tables

Add `coach_id` and `organization_id` to all existing data tables:

```sql
ALTER TABLE clients ADD COLUMN coach_id UUID NOT NULL REFERENCES profiles(id);
ALTER TABLE clients ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id);
ALTER TABLE clients ADD CONSTRAINT fk_clients_org FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- Repeat for all tables:
-- workouts, workout_logs, exercises, progress_photos, body_metrics,
-- check_ins, meal_plans, messages, subscriptions, etc.

-- Add indexes for performance
CREATE INDEX idx_clients_coach_org ON clients(coach_id, organization_id);
CREATE INDEX idx_clients_org ON clients(organization_id);
```

**Effort:** High (3-5 days) — systematic addition to ~15+ tables

#### 4. Update RLS Policies

Implement granular, multi-tenant RLS policies:

```sql
-- Example: Updated RLS policy for multi-coach
CREATE POLICY "Users can view clients in their organization"
  ON clients
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- Coach can see their own clients
      coach_id = auth.uid()
      -- OR admins can see all clients in org
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND organization_id = clients.organization_id
          AND role IN ('admin', 'owner')
      )
      -- OR coaches with 'view_all_clients' permission
      OR EXISTS (
        SELECT 1 FROM coach_permissions
        WHERE coach_id = auth.uid()
          AND organization_id = clients.organization_id
          AND permission = 'view_all_clients'
      )
    )
  );

CREATE POLICY "Coaches can only edit their own clients"
  ON clients
  FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Similar policies needed for INSERT, DELETE on all tables
```

**Effort:** Very High (5-7 days) — 50+ RLS policies to review/update

#### 5. Client-Coach Assignment

Add mechanism to assign clients to coaches:

```sql
CREATE TABLE client_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  assigned_at TIMESTAMP DEFAULT now(),
  status VARCHAR(50) DEFAULT 'active', -- active, paused, transferred
  transfer_reason VARCHAR(255),
  PRIMARY KEY (client_id, coach_id, organization_id)
);

CREATE INDEX idx_assignments_coach_org ON client_assignments(coach_id, organization_id);
```

**Effort:** Low (1-2 days)

#### 6. Create Team Management UI

New screens and flows:

```
/coach/organization/settings
  ├── General (name, logo, plan tier)
  ├── Coaches (invite, manage roles, permissions)
  ├── Clients (assign to coaches, bulk operations)
  └── Billing & Subscription

/coach/team
  ├── Team members list
  ├── Activity feed (who did what)
  └── Shared resources (templates, exercises)
```

**Effort:** Medium (3-4 days)

#### 7. Update API & Database Queries

Modify all existing queries to include `organization_id`:

```javascript
// Before (single coach)
const { data: clients } = await supabase
  .from('clients')
  .select()
  .eq('coach_id', user.id)

// After (multi-coach)
const { data: clients } = await supabase
  .from('clients')
  .select()
  .eq('organization_id', user.organization_id)
  .eq('coach_id', user.id) // or .in('coach_id', [assigned_coaches])
```

**Effort:** Very High (5-7 days) — touch 50+ queries across app

---

## Enterprise & Large-Scale Considerations

### Performance Optimizations

#### 1. Database Indexing Strategy

```sql
-- Add indexes for common queries
CREATE INDEX idx_clients_org_status ON clients(organization_id, status);
CREATE INDEX idx_workout_logs_client_date ON workout_logs(client_id, logged_at DESC);
CREATE INDEX idx_messages_thread ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_body_metrics_client_date ON body_metrics(client_id, measured_date DESC);
```

**Estimated Effort:** 1 day
**Impact:** 10-50x faster queries for analytics dashboards

#### 2. Materialized Views for Analytics

```sql
CREATE MATERIALIZED VIEW client_progress_summary AS
SELECT
  client_id,
  coach_id,
  organization_id,
  COUNT(DISTINCT DATE(logged_at)) as workout_days_this_month,
  AVG(mood) as avg_mood,
  MAX(current_weight) as latest_weight,
  EXTRACT(DAY FROM (MAX(measured_date) - MIN(measured_date))) as days_tracking
FROM (
  SELECT ... FROM workout_logs
  UNION ALL SELECT ... FROM body_metrics
  UNION ALL SELECT ... FROM check_ins
)
GROUP BY client_id, coach_id, organization_id;

CREATE INDEX idx_progress_summary_org ON client_progress_summary(organization_id);
```

**Estimated Effort:** 2-3 days
**Impact:** Real-time dashboards load in <500ms vs. 5-10s

#### 3. Caching Strategy

Implement Redis caching for hot data:

```typescript
// Cache coach dashboard stats for 1 hour
const cacheKey = `dashboard:${coachId}:${orgId}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const stats = await fetchDashboardStats(coachId, orgId)
await redis.setex(cacheKey, 3600, JSON.stringify(stats))
return stats
```

**Estimated Effort:** 3-5 days
**Impact:** Reduce database load by 70%, faster page loads

#### 4. Pagination & Lazy Loading

```typescript
// Load client list in batches of 20
const { data: clients, count } = await supabase
  .from('clients')
  .select('*', { count: 'exact' })
  .eq('organization_id', orgId)
  .range(0, 19)
  .order('created_at', { ascending: false })
```

**Estimated Effort:** 2-3 days
**Impact:** Handles 1000+ clients without UI lag

---

### Data Management

#### 1. Bulk Operations

Add background job support for bulk operations:

```typescript
// API for bulk client import
POST /api/organizations/:id/bulk-import
{
  clients: [
    { email, name, phone },
    ...
  ]
}

// Queued as background job (Bull.js)
// Sends confirmation email after processing
```

**Estimated Effort:** 3-4 days

#### 2. Data Export/Import

```typescript
// Export all client data as CSV/JSON
GET /api/organizations/:id/export?format=csv&include=clients,workouts,metrics

// Import data from another platform
POST /api/organizations/:id/import
```

**Estimated Effort:** 2-3 days

#### 3. Data Retention & Cleanup

```sql
-- Auto-delete inactive client data after 1 year
CREATE POLICY "auto_delete_inactive_data"
  ON clients
  FOR DELETE
  USING (
    status = 'inactive'
    AND updated_at < now() - INTERVAL '1 year'
  );
```

**Estimated Effort:** 1 day

---

### Monitoring & Observability

#### 1. Application Performance Monitoring (APM)

Integrate Datadog or New Relic:

```typescript
import { initDatadog } from '@datadog/browser-rum'

initDatadog({
  applicationId: process.env.DATADOG_APP_ID,
  clientToken: process.env.DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'move-coaching-app',
  env: process.env.NODE_ENV,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
})
```

**Estimated Effort:** 2-3 days
**Cost:** ~$15-30/month (low volume)

#### 2. Database Query Monitoring

```typescript
// Log slow queries
const { data, error } = await supabase
  .from('clients')
  .select()
  .eq('organization_id', orgId)
  .timeout(5000) // Warn if slower than 5s

if (error?.code === 'PGRST500') {
  logSlowQuery(error) // Send to monitoring service
}
```

**Estimated Effort:** 1-2 days

#### 3. Error Tracking at Scale

Use Sentry instead of custom error logger:

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

**Estimated Effort:** 2 days
**Cost:** ~$25/month (10k events/month)

---

### Security Considerations

#### 1. Row-Level Security (RLS) Audit

Regular audit of RLS policies:

```sql
-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema');

-- Test policies with different roles
SELECT * FROM clients
  WHERE coach_id = auth.uid()
  AND organization_id = '...';
```

**Estimated Effort:** 2-3 days (quarterly)

#### 2. RBAC Implementation

Define clear roles and permissions:

```typescript
const ROLES = {
  owner: ['manage_team', 'manage_billing', 'view_analytics'],
  admin: ['manage_team', 'manage_clients', 'view_analytics'],
  coach: ['view_my_clients', 'message_clients'],
  assistant: ['view_assigned_clients', 'view_workouts'],
  client: ['view_own_data', 'log_workouts'],
}
```

**Estimated Effort:** 2-3 days

#### 3. Audit Logging

Log all admin/sensitive actions:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL, -- 'create_coach', 'delete_client', 'update_billing'
  resource_type VARCHAR(50), -- 'coach', 'client', 'subscription'
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_logs_org_time ON audit_logs(organization_id, created_at DESC);
```

**Estimated Effort:** 2-3 days

---

## Migration Path

### Phase 1: Foundation (Weeks 1-2)

1. Create `organizations` table
2. Add `organization_id` and `coach_id` to all tables
3. Write migration scripts
4. Add indexes

**Effort:** 5-7 days
**Risk:** Low (additive changes, backward compatible)

### Phase 2: Data Migration (Weeks 2-3)

1. Migrate existing data to organizations
2. Create organization for single coach
3. Set all clients to existing coach
4. Test data integrity

**Effort:** 3-5 days
**Risk:** Medium (data transformation)

### Phase 3: RLS Updates (Weeks 3-4)

1. Update all RLS policies
2. Test with multiple user roles
3. Implement permission system
4. Audit security

**Effort:** 5-7 days
**Risk:** High (security-critical)

### Phase 4: UI & API Updates (Weeks 4-6)

1. Update all queries to include org_id
2. Build team management UI
3. Implement client assignment flow
4. Update coach dashboard

**Effort:** 10-14 days
**Risk:** Medium (many changes, but gradual rollout)

### Phase 5: Testing & Rollout (Weeks 6-7)

1. End-to-end testing with multi-coach setup
2. Performance testing at scale
3. Gradual rollout to beta users
4. Monitor and fix issues

**Effort:** 5-7 days
**Risk:** Medium (production deployment)

### Total Estimated Effort: 5-6 Weeks (1 Senior Engineer)

---

## Cost Implications

### Infrastructure

| Component | Single Coach | 10 Coaches | 100 Coaches |
|-----------|-------------|-----------|------------|
| Database (Supabase) | $25/mo | $100/mo | $500/mo |
| Storage | $5/mo | $25/mo | $100/mo |
| Bandwidth | $0-10/mo | $10-50/mo | $50-200/mo |
| Monitoring | $0 | $25/mo | $50/mo |
| **Total** | **~$50/mo** | **~$200/mo** | **~$800/mo** |

### Development

| Phase | Effort | Cost (@ $100/hr) |
|-------|--------|-----------------|
| Foundation | 6 days | ~$4,800 |
| Data Migration | 4 days | ~$3,200 |
| RLS Updates | 6 days | ~$4,800 |
| UI & API | 12 days | ~$9,600 |
| Testing | 6 days | ~$4,800 |
| **Total** | **34 days** | **~$27,200** |

---

## Recommended Migration Sequence

1. **Start multi-coach support early** (Phase 9, not Phase 10)
   - Cleaner architecture from the beginning
   - Easier to add features on top
   - Can introduce as paid feature later

2. **Use Supabase multi-tenancy guides**
   - Well-documented patterns
   - Battle-tested RLS policies
   - Community support

3. **Implement backward compatibility**
   - Don't break single-coach workflows
   - Gradual rollout of multi-coach features
   - Old clients still work unchanged

4. **Monitor performance closely**
   - Add APM before scaling
   - Track query performance
   - Optimize hot paths early

---

## Conclusion

The current MVP architecture works well for single-coach scenarios but will require substantial refactoring to support multi-coach and enterprise features.

**Key Takeaway:** Add `organization_id` and `coach_id` to all tables early, even if not immediately used. The refactoring cost later will be much higher.

**Recommended Approach:** Plan a 5-6 week sprint in Phase 9-10 dedicated to multi-coach support. This unlocks enterprise revenue and sets foundation for large-scale deployments.

---

**Document Version:** 1.0
**Last Updated:** March 13, 2026
**Next Review:** June 2026 (before Phase 9 planning)
