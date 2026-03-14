'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ClientCard } from '@/components/ui/ClientCard'
import { Button } from '@/components/ui/Button'
import { Search, UserPlus } from 'lucide-react'
import type { Profile } from '@/types'
import type { PackageTier } from '@/types/database'

interface ClientsListViewProps {
  clients: Profile[]
}

type FilterTab = 'all' | 'essential' | 'performance' | 'elite'

export function ClientsListView({ clients }: ClientsListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const filteredClients = useMemo(() => {
    let result = clients

    // Filter by package tier
    if (activeFilter !== 'all') {
      result = result.filter((client) => client.package === activeFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (client) =>
          client.full_name?.toLowerCase().includes(query) ||
          client.email?.toLowerCase().includes(query)
      )
    }

    return result
  }, [clients, searchQuery, activeFilter])

  const filterTabs: { label: string; value: FilterTab }[] = [
    { label: 'Alle', value: 'all' },
    { label: 'Essential', value: 'essential' },
    { label: 'Performance', value: 'performance' },
    { label: 'Elite', value: 'elite' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display text-text-primary">Cliënten</h1>
            <div className="bg-accent-light text-accent-dark px-3 py-1 rounded-full text-sm font-medium">
              {clients.length}
            </div>
          </div>
        </div>
        <Link href="/coach/clients/new">
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Nieuwe cliënt
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-dark"
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="Zoeken naar cliënt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-client-border bg-client-surface-muted text-text-primary placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-client-border">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-4 py-3 font-medium text-[13px] transition-colors border-b-2 -mb-[2px] ${
              activeFilter === tab.value
                ? 'border-accent text-accent-dark'
                : 'border-transparent text-client-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Client Grid or Empty State */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-client-border rounded-2xl shadow-clean p-16 text-center">
          {searchQuery || activeFilter !== 'all' ? (
            <>
              <p className="text-text-primary font-medium">Geen resultaten gevonden</p>
              <p className="text-[13px] text-client-text-secondary mt-1">
                Probeer de zoekterm of filter aan te passen
              </p>
            </>
          ) : (
            <>
              <p className="text-text-primary font-medium">Nog geen cliënten</p>
              <p className="text-[13px] text-client-text-secondary mt-1">
                Voeg je eerste cliënt toe om te beginnen
              </p>
              <Link href="/coach/clients/new" className="inline-block mt-4">
                <Button size="sm" variant="secondary">
                  <UserPlus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Cliënt toevoegen
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
