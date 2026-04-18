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
        {/* Header */}
        <div className="mb-8 animate-pulse">
          <div className="h-9 w-48 bg-[#A6ADA7] rounded-xl" />
          <div className="h-4 w-72 bg-[#A6ADA7] rounded mt-2" />
        </div>
        {/* Period filter pills */}
        <div className="flex gap-2 mb-6 animate-pulse">
          <div className="h-9 w-20 bg-[#A6ADA7] rounded-full" />
          <div className="h-9 w-20 bg-[#A6ADA7] rounded-full" />
          <div className="h-9 w-20 bg-[#A6ADA7] rounded-full" />
        </div>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#A6ADA7] rounded-2xl p-4 border border-[#A6ADA7] text-center">
              <div className="h-7 w-10 bg-[#A6ADA7] rounded mx-auto mb-2" />
              <div className="h-3 w-24 bg-[#A6ADA7] rounded mx-auto" />
            </div>
          ))}
        </div>
        {/* Client list */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[#A6ADA7] rounded-2xl p-5 border border-[#A6ADA7] animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#A6ADA7] shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-[#A6ADA7] rounded mb-2" />
                  <div className="flex gap-3">
                    <div className="h-3 w-16 bg-[#A6ADA7] rounded" />
                    <div className="h-3 w-28 bg-[#A6ADA7] rounded" />
                    <div className="h-3 w-24 bg-[#A6ADA7] rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return <AccountabilityView initialClients={clients} />
}
