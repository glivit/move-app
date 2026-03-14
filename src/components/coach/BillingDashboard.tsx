'use client'

import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { PackageBadge } from '@/components/ui/PackageBadge'
import { SubscriptionBadge } from '@/components/ui/SubscriptionBadge'
import { format } from 'date-fns'
import { nlBE } from 'date-fns/locale'

interface SubscriptionData {
  id: string
  full_name: string
  email: string
  package: 'essential' | 'performance' | 'elite'
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'trialing' | null
  stripe_subscription_id: string | null
  created_at: string
}

interface BillingDashboardProps {
  clients: SubscriptionData[]
  mrr: number
  activeCount: number
  pastDueCount: number
  cancelledCount: number
}

export function BillingDashboard({
  clients,
  mrr,
  activeCount,
  pastDueCount,
  cancelledCount,
}: BillingDashboardProps) {
  return (
    <div className="space-y-6">
      {/* MRR Card */}
      <Card padding="lg">
        <div className="text-center">
          <p className="text-sm font-medium text-text-muted mb-2">Maandelijkse terugkerende inkomsten</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-display font-semibold text-text-primary">
              €{mrr.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-lg text-text-secondary">/maand</span>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Actieve abonnementen"
          value={activeCount}
          type="positive-up"
        />
        <MetricCard
          label="Achterstallig"
          value={pastDueCount}
          type="positive-down"
        />
        <MetricCard
          label="Geannuleerd"
          value={cancelledCount}
        />
      </div>

      {/* Clients Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">Naam</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">Pakket</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">Startdatum</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-text-muted">
                    Geen abonnementen gevonden
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-border hover:bg-surface-muted transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{client.full_name}</p>
                        <p className="text-xs text-text-muted">{client.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <PackageBadge tier={client.package} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <SubscriptionBadge status={client.subscription_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {format(new Date(client.created_at), 'dd MMM yyyy', { locale: nlBE })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
