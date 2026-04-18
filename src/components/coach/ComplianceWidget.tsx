'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ClientCompliance {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  workoutsThisWeek: number
  expectedPerWeek: number
  compliancePercent: number
  streak: number
}

export function ComplianceWidget() {
  const [clients, setClients] = useState<ClientCompliance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCompliance = async () => {
      try {
        const supabase = createClient()

        // Get all active clients with their programs
        const { data: clientsData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .eq('role', 'client')

        if (!clientsData) return

        // Get this week's workout sessions for all clients
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
        weekStart.setHours(0, 0, 0, 0)

        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('client_id, completed_at')
          .gte('started_at', weekStart.toISOString())
          .not('completed_at', 'is', null)

        // Get client programs for expected days/week
        const { data: programs } = await supabase
          .from('client_programs')
          .select('client_id, program_templates(days_per_week)')
          .eq('status', 'active')

        // Calculate streak — count consecutive weeks with at least 1 workout
        const { data: allSessions } = await supabase
          .from('workout_sessions')
          .select('client_id, started_at, completed_at')
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })

        const complianceData: ClientCompliance[] = clientsData.map((client: any) => {
          const clientSessions = (sessions || []).filter((s: any) => s.client_id === client.id)
          const clientProgram = (programs || []).find((p: any) => p.client_id === client.id)
          const expectedPerWeek = (clientProgram as any)?.program_templates?.days_per_week || 3
          const workoutsThisWeek = clientSessions.length
          const compliancePercent = Math.min(100, Math.round((workoutsThisWeek / expectedPerWeek) * 100))

          // Calculate streak
          let streak = 0
          const clientAllSessions = (allSessions || []).filter((s: any) => s.client_id === client.id)
          if (clientAllSessions.length > 0) {
            const now = new Date()
            let checkWeek = new Date(weekStart)
            // If they have workouts this week, count it
            if (workoutsThisWeek > 0) streak = 1
            // Check previous weeks
            for (let i = 0; i < 52; i++) {
              checkWeek.setDate(checkWeek.getDate() - 7)
              const weekEnd = new Date(checkWeek)
              weekEnd.setDate(weekEnd.getDate() + 7)
              const hasWorkout = clientAllSessions.some((s: any) => {
                const d = new Date(s.started_at)
                return d >= checkWeek && d < weekEnd
              })
              if (hasWorkout) {
                streak++
              } else {
                break
              }
            }
          }

          return {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            avatar_url: client.avatar_url,
            workoutsThisWeek,
            expectedPerWeek,
            compliancePercent,
            streak,
          }
        })

        // Sort: lowest compliance first (need attention)
        complianceData.sort((a, b) => a.compliancePercent - b.compliancePercent)
        setClients(complianceData)
      } catch (error) {
        console.error('Error loading compliance:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCompliance()
  }, [])

  if (loading) {
    return (
      <div className="bg-[#A6ADA7] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] p-6">
        <div className="h-5 w-40 bg-[#A6ADA7] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[#A6ADA7] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const avgCompliance = clients.length > 0
    ? Math.round(clients.reduce((sum, c) => sum + c.compliancePercent, 0) / clients.length)
    : 0

  const atRisk = clients.filter(c => c.compliancePercent < 50)
  const onTrack = clients.filter(c => c.compliancePercent >= 80)

  return (
    <div className="bg-[#A6ADA7] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[17px] font-semibold text-[#FDFDFE]">Compliance deze week</h3>
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <span className={avgCompliance >= 70 ? 'text-[#2FA65A]' : avgCompliance >= 40 ? 'text-[#E8B948]' : 'text-[#B55A4A]'}>
            {avgCompliance}% gemiddeld
          </span>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-[#2FA65A]/10 text-[#2FA65A] text-[12px] font-semibold px-3 py-1.5 rounded-full">
          <TrendingUp size={14} /> {onTrack.length} op schema
        </div>
        {atRisk.length > 0 && (
          <div className="flex items-center gap-1.5 bg-[#B55A4A]/10 text-[#B55A4A] text-[12px] font-semibold px-3 py-1.5 rounded-full">
            <TrendingDown size={14} /> {atRisk.length} achter
          </div>
        )}
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {clients.slice(0, 8).map((client) => {
          const statusColor = client.compliancePercent >= 80
            ? '#2FA65A'
            : client.compliancePercent >= 50
              ? '#E8B948'
              : '#B55A4A'

          return (
            <div key={client.id} className="flex items-center gap-3 py-2">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#A6ADA7] flex items-center justify-center text-[12px] font-semibold text-[#D6D9D6] flex-shrink-0 overflow-hidden">
                {client.avatar_url ? (
                  <Image src={client.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized loading="lazy" />
                ) : (
                  `${client.first_name?.[0] || ''}${client.last_name?.[0] || ''}`
                )}
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#FDFDFE] truncate">
                  {client.first_name} {client.last_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-[#A6ADA7] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${client.compliancePercent}%`, backgroundColor: statusColor }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#D6D9D6] tabular-nums w-14 text-right">
                    {client.workoutsThisWeek}/{client.expectedPerWeek} sessies
                  </span>
                </div>
              </div>

              {/* Streak */}
              {client.streak > 1 && (
                <div className="flex items-center gap-0.5 text-[#E8B948] text-[12px] font-semibold flex-shrink-0">
                  <Flame size={14} />
                  {client.streak}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
