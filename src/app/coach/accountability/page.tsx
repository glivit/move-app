'use client'

import { useState, useEffect } from 'react'
import AccountabilityView from './AccountabilityView'
import type { ClientSummary } from './AccountabilityView'

export default function CoachAccountabilityPage() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/accountability/coach?days=7')
        if (res.ok) {
          const data = await res.json()
          setClients(data.data?.summary || [])
        }
      } catch (err) {
        console.error('Error loading accountability:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-client-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-semibold text-text-primary">Accountability</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return <AccountabilityView initialClients={clients} />
}
