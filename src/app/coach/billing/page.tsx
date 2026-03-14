'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { PackageBadge } from '@/components/ui/PackageBadge';
import { Euro, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface ClientSubscription {
  id: string;
  full_name: string;
  email: string;
  package: 'essential' | 'performance' | 'elite';
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'trialing' | null;
  start_date: string;
}

type SubscriptionStatus = 'all' | 'active' | 'past_due' | 'cancelled';

const PACKAGE_PRICES = {
  essential: 297,
  performance: 497,
  elite: 797,
};

const statusColorMap = {
  active: 'data-green',
  past_due: 'data-orange',
  cancelled: 'data-red',
  trialing: 'data-blue',
};

export default function BillingPage() {
  const [clients, setClients] = useState<ClientSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SubscriptionStatus>('all');
  const supabase = createClient();

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, package, start_date, subscription_status')
        .eq('role', 'client')
        .order('full_name');

      if (error) {
        console.error('Error loading clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = filter === 'all'
    ? clients
    : clients.filter((client) => client.subscription_status === filter);

  const mrr = filteredClients.reduce((total, client) => {
    if (client.subscription_status === 'active' && client.package) {
      return total + PACKAGE_PRICES[client.package];
    }
    return total;
  }, 0);

  const activeCount = clients.filter((c) => c.subscription_status === 'active').length;
  const pastDueCount = clients.filter((c) => c.subscription_status === 'past_due').length;
  const cancelledCount = clients.filter((c) => c.subscription_status === 'cancelled').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-client-bg">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-[32px] font-display text-text-primary mb-2">
            Facturatie
          </h1>
          <p className="text-client-text-secondary">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="border-b border-client-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-[32px] font-display text-text-primary mb-2">
            Facturatie
          </h1>
          <p className="text-[15px] text-client-text-secondary">
            Beheer abonnementen en inkomsten
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* MRR Card */}
        <Card className="mb-8 p-8 bg-white border border-client-border rounded-2xl shadow-clean">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-client-text-secondary mb-2">
                Maandelijkse Herhalende Inkomsten
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-accent-dark">
                  €{(mrr / 100).toFixed(0)}
                </span>
                <span className="text-client-text-secondary">/maand</span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-accent-light">
              <Euro size={32} strokeWidth={1.5} className="text-accent-dark" />
            </div>
          </div>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border border-client-border rounded-2xl shadow-clean">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-client-text-secondary mb-1">
                  Actief
                </p>
                <p className="text-3xl font-bold text-text-primary">
                  {activeCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-data-green/10">
                <CheckCircle size={24} strokeWidth={1.5} className="text-data-green" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-client-border rounded-2xl shadow-clean">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-client-text-secondary mb-1">
                  Achterstallig
                </p>
                <p className="text-3xl font-bold text-text-primary">
                  {pastDueCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-data-orange/10">
                <AlertCircle size={24} strokeWidth={1.5} className="text-data-orange" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-client-border rounded-2xl shadow-clean">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-client-text-secondary mb-1">
                  Geannuleerd
                </p>
                <p className="text-3xl font-bold text-text-primary">
                  {cancelledCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-data-red/10">
                <Users size={24} strokeWidth={1.5} className="text-data-red" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Buttons */}
        <Card className="mb-8 p-6 bg-white border border-client-border rounded-2xl shadow-clean">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'past_due', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  filter === status
                    ? 'bg-text-primary text-white'
                    : 'bg-white border border-client-border text-text-primary hover:bg-client-surface-muted'
                }`}
              >
                {status === 'all' && 'Alle'}
                {status === 'active' && `Actief (${activeCount})`}
                {status === 'past_due' && `Achterstallig (${pastDueCount})`}
                {status === 'cancelled' && `Geannuleerd (${cancelledCount})`}
              </button>
            ))}
          </div>
        </Card>

        {/* Clients Table */}
        {filteredClients.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-client-border rounded-2xl shadow-clean">
            <p className="text-[15px] text-client-text-secondary">
              Geen cliënten gevonden voor dit filter.
            </p>
          </Card>
        ) : (
          <Card className="bg-white border border-client-border rounded-2xl shadow-clean">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-client-border">
                    <th className="px-6 py-4 text-left text-[13px] font-medium text-text-primary">
                      Cliënt
                    </th>
                    <th className="px-6 py-4 text-left text-[13px] font-medium text-text-primary">
                      Pakket
                    </th>
                    <th className="px-6 py-4 text-left text-[13px] font-medium text-text-primary">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-[13px] font-medium text-text-primary">
                      Startdatum
                    </th>
                    <th className="px-6 py-4 text-right text-[13px] font-medium text-text-primary">
                      Prijs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client, idx) => {
                    const statusLabel = {
                      active: 'Actief',
                      past_due: 'Achterstallig',
                      cancelled: 'Geannuleerd',
                      trialing: 'Proef',
                    }[client.subscription_status || 'active'];

                    const statusColor = statusColorMap[client.subscription_status as keyof typeof statusColorMap] || statusColorMap.active;

                    return (
                      <tr
                        key={client.id}
                        className={idx === filteredClients.length - 1 ? '' : 'border-b border-client-border'}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-text-primary">
                              {client.full_name}
                            </p>
                            <p className="text-[13px] text-client-text-secondary">
                              {client.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <PackageBadge tier={client.package} />
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-block px-3 py-1 rounded-xl text-[13px] font-medium bg-${statusColor}/10 text-${statusColor}`}>
                            {statusLabel}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-client-text-secondary">
                          {new Date(client.start_date).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-accent-dark">
                          €{PACKAGE_PRICES[client.package]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Stripe Dashboard Link */}
        <Card className="mt-8 p-6 bg-white border border-client-border rounded-2xl shadow-clean">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-text-primary">
                Stripe Dashboard
              </h3>
              <p className="text-[13px] mt-1 text-client-text-secondary">
                Bekijk gedetailleerde facturen en inkomstengegevens in uw Stripe-account.
              </p>
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-text-primary text-white font-medium transition-all hover:shadow-clean"
            >
              Dashboard openen →
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
