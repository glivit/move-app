'use client'

import { useState } from 'react'
import { ShieldCheck, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Dumbbell, UtensilsCrossed, Eye } from 'lucide-react'

export interface ClientSummary {
  client_id: string
  full_name: string
  total_days: number
  workouts_missed: number
  nutrition_missed: number
  unresponded: number
  latest_reasons: {
    date: string
    workout_completed: boolean
    nutrition_logged: boolean
    workout_reason: string | null
    nutrition_reason: string | null
    responded: boolean
    responded_at: string | null
  }[]
}

interface AccountabilityViewProps {
  initialClients: ClientSummary[]
}

export default function AccountabilityView({ initialClients }: AccountabilityViewProps) {
  const [clients, setClients] = useState<ClientSummary[]>(initialClients)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState(7)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  async function loadData(days: number) {
    try {
      setLoading(true)
      setPeriod(days)
      const res = await fetch(`/api/accountability/coach?days=${days}`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-client-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-semibold text-text-primary">Accountability</h1>
          <p className="mt-2 text-[15px] text-client-text-secondary">
            Overzicht van klant accountability afgelopen {period} dagen
          </p>
        </div>
        <div className="flex gap-2 mb-6">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => loadData(d)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                period === d
                  ? 'bg-accent text-white'
                  : 'bg-[#A6ADA7] border border-client-border text-text-primary hover:bg-client-surface-muted'
              }`}
            >
              {d} dagen
            </button>
          ))}
        </div>
        {/* Summary stats skeleton */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#A6ADA7] rounded-2xl p-4 border border-client-border text-center">
              <div className="h-7 w-10 bg-[#A6ADA7] rounded mx-auto mb-2" />
              <div className="h-3 w-24 bg-[#A6ADA7] rounded mx-auto" />
            </div>
          ))}
        </div>
        {/* Client list skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#A6ADA7] rounded-2xl p-5 border border-client-border animate-pulse">
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

  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-[32px] font-semibold text-text-primary">Accountability</h1>
        <p className="mt-2 text-[15px] text-client-text-secondary">
          Overzicht van klant accountability afgelopen {period} dagen
        </p>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30].map(d => (
          <button
            key={d}
            onClick={() => loadData(d)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
              period === d
                ? 'bg-accent text-white'
                : 'bg-[#A6ADA7] border border-client-border text-text-primary hover:bg-client-surface-muted'
            }`}
          >
            {d} dagen
          </button>
        ))}
      </div>

      {/* Summary stats */}
      {clients.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#A6ADA7] rounded-2xl p-4 border border-client-border text-center">
            <p className="text-[24px] font-bold text-[#B55A4A]">
              {clients.reduce((sum, c) => sum + c.unresponded, 0)}
            </p>
            <p className="text-[12px] text-client-text-secondary mt-1">Onbeantwoord</p>
          </div>
          <div className="bg-[#A6ADA7] rounded-2xl p-4 border border-client-border text-center">
            <p className="text-[24px] font-bold text-[#D9A645]">
              {clients.reduce((sum, c) => sum + c.workouts_missed, 0)}
            </p>
            <p className="text-[12px] text-client-text-secondary mt-1">Trainingen gemist</p>
          </div>
          <div className="bg-[#A6ADA7] rounded-2xl p-4 border border-client-border text-center">
            <p className="text-[24px] font-bold text-[#8A7BA8]">
              {clients.reduce((sum, c) => sum + c.nutrition_missed, 0)}
            </p>
            <p className="text-[12px] text-client-text-secondary mt-1">Voeding gemist</p>
          </div>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="bg-[#A6ADA7] rounded-2xl p-8 border border-client-border text-center">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#2FA65A] mx-auto mb-3" />
          <p className="font-semibold text-text-primary text-lg">Alle klanten op schema!</p>
          <p className="text-[14px] text-client-text-secondary mt-2">
            Er zijn geen accountability logs in de afgelopen {period} dagen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const isExpanded = expandedClient === client.client_id
            return (
              <div key={client.client_id} className="bg-[#A6ADA7] rounded-2xl border border-client-border overflow-hidden">
                {/* Client header */}
                <button
                  onClick={() => setExpandedClient(isExpanded ? null : client.client_id)}
                  className="w-full p-5 flex items-center gap-4 text-left hover:bg-client-surface-muted transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    client.unresponded > 0 ? 'bg-[#B55A4A]/10' : 'bg-[#2FA65A]/10'
                  }`}>
                    {client.unresponded > 0 ? (
                      <AlertCircle size={20} strokeWidth={1.5} className="text-[#B55A4A]" />
                    ) : (
                      <CheckCircle2 size={20} strokeWidth={1.5} className="text-[#2FA65A]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{client.full_name}</p>
                    <div className="flex gap-3 mt-1 text-[12px] text-client-text-secondary">
                      <span>{client.total_days} logs</span>
                      <span>•</span>
                      <span className={client.workouts_missed > 0 ? 'text-[#D9A645] font-medium' : ''}>
                        {client.workouts_missed} training gemist
                      </span>
                      <span>•</span>
                      <span className={client.nutrition_missed > 0 ? 'text-[#8A7BA8] font-medium' : ''}>
                        {client.nutrition_missed} voeding gemist
                      </span>
                    </div>
                  </div>
                  {client.unresponded > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-[#B55A4A] text-white text-[11px] font-bold shrink-0">
                      {client.unresponded}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={18} className="text-client-text-secondary shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-client-text-secondary shrink-0" />
                  )}
                </button>

                {/* Expanded logs */}
                {isExpanded && client.latest_reasons.length > 0 && (
                  <div className="border-t border-client-border divide-y divide-client-border">
                    {client.latest_reasons.map((log, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[13px] font-medium text-text-primary">
                            {new Date(log.date).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          {log.responded ? (
                            <span className="text-[11px] font-medium text-[#2FA65A] bg-[#2FA65A]/10 px-2 py-0.5 rounded-full">
                              Beantwoord
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-[#B55A4A] bg-[#B55A4A]/10 px-2 py-0.5 rounded-full">
                              Wacht op antwoord
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {!log.workout_completed && (
                            <div className="flex items-start gap-2">
                              <Dumbbell size={14} strokeWidth={1.5} className="text-[#D9A645] mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[12px] font-medium text-[#D9A645]">Training gemist</p>
                                {log.workout_reason && (
                                  <p className="text-[13px] text-client-text-secondary mt-0.5 italic">
                                    &ldquo;{log.workout_reason}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {!log.nutrition_logged && (
                            <div className="flex items-start gap-2">
                              <UtensilsCrossed size={14} strokeWidth={1.5} className="text-[#8A7BA8] mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[12px] font-medium text-[#8A7BA8]">Voeding niet gelogd</p>
                                {log.nutrition_reason && (
                                  <p className="text-[13px] text-client-text-secondary mt-0.5 italic">
                                    &ldquo;{log.nutrition_reason}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
