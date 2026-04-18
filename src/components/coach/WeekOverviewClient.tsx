'use client'

import { useState, useMemo, useTransition, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  AlertTriangle,
  ChevronRight,
  MessageCircle,
  CheckCircle2,
  UtensilsCrossed,
  Sparkles,
  Send,
  X,
  Dumbbell,
  Circle,
  CircleDashed,
  CircleAlert,
} from 'lucide-react'
import type { CoachWeekOverview, ClientWeekRow, WeekDay, ProgramDayEntry } from '@/lib/coach-week-data'
import { SwipeableRow } from './SwipeableRow'
import { isSnoozed, snooze, unsnooze, snoozeKey } from '@/lib/coach-snooze'
import { useCoachLiveUpdates } from '@/hooks/useCoachLiveUpdates'

interface Props {
  initialData: CoachWeekOverview | null
  coachFirstName: string
  coachId?: string | null
}

type FilterMode = 'needs' | 'all' | 'ok'

const DAY_LABELS = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']
const FULL_DAY_LABELS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export function WeekOverviewClient({ initialData, coachFirstName, coachId }: Props) {
  const [data, setData] = useState<CoachWeekOverview | null>(initialData)
  const [filter, setFilter] = useState<FilterMode>('needs')
  const [, startTransition] = useTransition()
  const [composeFor, setComposeFor] = useState<ClientWeekRow | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Triage state: client IDs that have been cleared/snoozed this session.
  // We bump this counter to force a re-filter after localStorage changes.
  const [triageTick, setTriageTick] = useState(0)
  const [toast, setToast] = useState<null | {
    kind: 'seen' | 'snoozed'
    clientId: string
    clientName: string
  }>(null)

  // Live-update state for subtle "just updated" flash
  const [justUpdated, setJustUpdated] = useState(false)

  // Refetch strategy — single source of truth, used by both manual reload
  // fallback and the realtime hook below.
  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/week-overview', {
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = (await res.json()) as CoachWeekOverview
      setData(json)
      setJustUpdated(true)
      window.setTimeout(() => setJustUpdated(false), 1200)
    } catch {
      // ignore — next focus/realtime event will retry
    }
  }, [])

  // Revalidate on mount if no initialData (fallback)
  useEffect(() => {
    if (data) return
    refetch()
  }, [data, refetch])

  // Realtime subscription — Phase 5.
  const { connected } = useCoachLiveUpdates({
    refetch,
    coachId: coachId || undefined,
    disabled: !coachId,
  })

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const summary = data?.summary || { total: 0, needsAttention: 0, onTrack: 0 }

  // Client-side triage commits — optimistic updates + undo toast.
  const handleMarkSeen = useCallback(async (client: ClientWeekRow) => {
    // Optimistic: drop attention state so it leaves the "Aandacht" filter
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        clients: prev.clients.map((c) =>
          c.id === client.id
            ? {
                ...c,
                attention: 'ok',
                attentionReason: null,
                unreadFromClient: 0,
              }
            : c
        ),
        summary: {
          ...prev.summary,
          needsAttention:
            client.attention !== 'ok'
              ? Math.max(0, prev.summary.needsAttention - 1)
              : prev.summary.needsAttention,
          onTrack:
            client.attention !== 'ok'
              ? prev.summary.onTrack + 1
              : prev.summary.onTrack,
        },
      }
    })
    setToast({ kind: 'seen', clientId: client.id, clientName: client.fullName })

    try {
      await fetch('/api/coach-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
    } catch (err) {
      console.error('Mark-seen failed:', err)
    }
  }, [])

  const handleSnooze = useCallback((client: ClientWeekRow) => {
    snooze(snoozeKey.client(client.id))
    setTriageTick((t) => t + 1)
    setToast({ kind: 'snoozed', clientId: client.id, clientName: client.fullName })
  }, [])

  const handleUndo = useCallback(() => {
    if (!toast) return
    if (toast.kind === 'snoozed') {
      unsnooze(snoozeKey.client(toast.clientId))
      setTriageTick((t) => t + 1)
    }
    // For 'seen' we can't reliably un-mark on the server (previous state lost),
    // so Undo just closes the toast and relies on a next-fetch refresh.
    setToast(null)
  }, [toast])

  const filtered = useMemo(() => {
    let result = data?.clients || []
    if (filter === 'needs') result = result.filter((c) => c.attention !== 'ok')
    if (filter === 'ok') result = result.filter((c) => c.attention === 'ok')

    // Hide snoozed clients from the "Aandacht" view (they re-appear tomorrow).
    if (filter === 'needs') {
      result = result.filter((c) => !isSnoozed(snoozeKey.client(c.id)))
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) result = result.filter((c) => c.fullName.toLowerCase().includes(q))

    return result
    // triageTick is referenced so re-renders happen when snoozes change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter, searchQuery, triageTick])

  const greeting = getGreeting()

  // Attention strip
  const headlineText =
    summary.needsAttention === 0
      ? 'Alles op schema — lekker bezig'
      : summary.needsAttention === 1
      ? '1 cliënt heeft aandacht nodig'
      : `${summary.needsAttention} cliënten hebben aandacht nodig`

  return (
    <div className="pb-24 lg:pb-10">
      {/* Greeting */}
      <div className="mb-4">
        <h1
          className="text-[32px] sm:text-[38px] font-semibold text-[#FDFDFE] tracking-[-0.03em] leading-[1.05]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {greeting}, {coachFirstName}
        </h1>
      </div>

      {/* Attention strip — sticky on mobile */}
      <div
        className={`sticky top-[60px] lg:top-0 z-20 -mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 py-3 lg:py-0 mb-6 lg:mb-8 transition-colors ${
          summary.needsAttention > 0 ? 'bg-[#A6ADA7]/95 lg:bg-transparent backdrop-blur-sm' : 'bg-[#A6ADA7]/95 lg:bg-transparent backdrop-blur-sm'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 ${
            summary.needsAttention > 0
              ? 'bg-[#A6ADA7] border border-[#FFD5D1] shadow-[0_1px_3px_rgba(255,59,48,0.08)]'
              : 'bg-[#A6ADA7] border border-[#A6ADA7]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                summary.needsAttention > 0 ? 'bg-[rgba(181,90,74,0.14)]' : 'bg-[#E6F7EA]'
              }`}
            >
              {summary.needsAttention > 0 ? (
                <AlertTriangle size={17} className="text-[#B55A4A]" strokeWidth={2} />
              ) : (
                <CheckCircle2 size={17} className="text-[#2FA65A]" strokeWidth={2} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#FDFDFE] truncate">{headlineText}</p>
              <p className="text-[12px] text-[#E6E8E7] truncate flex items-center gap-1.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full transition-all ${
                    justUpdated
                      ? 'bg-[#2FA65A] animate-pulse-ring'
                      : connected
                      ? 'bg-[#2FA65A]'
                      : 'bg-[#989F99]'
                  }`}
                  title={connected ? 'Live' : 'Offline'}
                />
                {summary.total} {summary.total === 1 ? 'cliënt' : 'cliënten'} · {summary.onTrack} op schema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter pills + search */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto -mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 no-scrollbar">
        {[
          { key: 'needs' as FilterMode, label: `Aandacht (${summary.needsAttention})` },
          { key: 'all' as FilterMode, label: `Alle (${summary.total})` },
          { key: 'ok' as FilterMode, label: `Op schema (${summary.onTrack})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => startTransition(() => setFilter(f.key))}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-[#474B48] text-white'
                : 'bg-[#A6ADA7] border border-[#A6ADA7] text-[#E6E8E7] active:scale-95'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Zoek cliënt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-[#A6ADA7] border border-[#A6ADA7] text-[14px] text-[#FDFDFE] placeholder-[#E6E8E7] focus:outline-none focus:ring-2 focus:ring-[#C0FC01]/25 focus:border-transparent"
        />
      </div>

      {/* Client list */}
      {!data ? (
        <ClientListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} searchQuery={searchQuery} />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((client) => (
            <SwipeableRow
              key={client.id}
              onSwipeRight={() => handleMarkSeen(client)}
              onSwipeLeft={() => handleSnooze(client)}
              rightLabel="Gezien"
              leftLabel="Later"
            >
              <ClientRow client={client} onMessage={() => setComposeFor(client)} />
            </SwipeableRow>
          ))}
          {filter === 'needs' && filtered.length > 0 && (
            <p className="text-center text-[11px] text-[#E6E8E7] pt-2 pb-1 lg:hidden">
              Veeg → <span className="text-[#2FA65A] font-semibold">Gezien</span>  ·  Veeg ← <span className="text-[#E6E8E7] font-semibold">Later</span>
            </p>
          )}
        </div>
      )}

      {/* Quick message sheet */}
      {composeFor && (
        <QuickMessageSheet
          client={composeFor}
          onClose={() => setComposeFor(null)}
          onSent={() => setComposeFor(null)}
        />
      )}

      {/* Triage undo toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-40 animate-toast-in">
          <div className="flex items-center gap-3 bg-[#474B48] text-white rounded-full pl-4 pr-2 py-2 shadow-xl">
            <span className="text-[13px]">
              {toast.kind === 'seen' ? (
                <>
                  <span className="font-semibold">{toast.clientName}</span> gemarkeerd als gezien
                </>
              ) : (
                <>
                  <span className="font-semibold">{toast.clientName}</span> tot morgen verborgen
                </>
              )}
            </span>
            <button
              onClick={handleUndo}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
            >
              Ongedaan
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.55); }
          70% { box-shadow: 0 0 0 8px rgba(52, 199, 89, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0); }
        }
        .animate-toast-in { animation: toast-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1); }
        .animate-pulse-ring { animation: pulse-ring 1200ms ease-out; }
      `}</style>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

// ─── Client Row ──────────────────────────────────────────────

function ClientRow({ client, onMessage }: { client: ClientWeekRow; onMessage: () => void }) {
  const accent =
    client.attention === 'urgent'
      ? 'border-[#B55A4A]/25 bg-[#FFF8F7]'
      : client.attention === 'attention'
      ? 'border-[#E8B948]/25 bg-[#FFFCF4]'
      : 'border-[#A6ADA7] bg-[#A6ADA7]'

  return (
    <div
      className={`relative rounded-2xl border ${accent} shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all active:scale-[0.995]`}
    >
      <Link href={`/coach/clients/${client.id}/week`} className="block px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-[#A6ADA7] flex items-center justify-center text-[13px] font-semibold text-[#E6E8E7] flex-shrink-0 overflow-hidden">
            {client.avatarUrl ? (
              <Image
                src={client.avatarUrl}
                alt=""
                width={44}
                height={44}
                className="w-full h-full object-cover"
                unoptimized
                loading="lazy"
              />
            ) : (
              client.initials
            )}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-[#FDFDFE] truncate">{client.fullName}</p>
              {client.unreadFromClient > 0 && (
                <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C0FC01] text-white text-[10px] font-bold flex items-center justify-center">
                  {client.unreadFromClient}
                </span>
              )}
            </div>
            <p
              className={`text-[12px] truncate mt-0.5 ${
                client.attention === 'urgent'
                  ? 'text-[#B55A4A] font-medium'
                  : client.attention === 'attention'
                  ? 'text-[#D9A645] font-medium'
                  : 'text-[#E6E8E7]'
              }`}
            >
              {client.attentionReason || client.lastActivityLabel || 'Geen activiteit'}
            </p>
          </div>

          <ChevronRight size={16} className="text-[#989F99] flex-shrink-0" strokeWidth={1.5} />
        </div>
      </Link>

      {/* Week strip */}
      <div className="px-4 pt-1 pb-3">
        <div className="flex items-center justify-between gap-1">
          {client.week.map((day) => (
            <WeekDot key={day.dayNumber} day={day} />
          ))}
        </div>
      </div>

      {/* Program checklist */}
      {client.programDays.length > 0 && (
        <div className="px-4 pb-3 pt-0.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Dumbbell size={11} className="text-[#E6E8E7]" strokeWidth={2} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#E6E8E7]">
              Programma · {client.doneThisWeek}/{client.plannedThisWeek}
            </span>
          </div>
          <ul className="space-y-0.5">
            {client.programDays.map((pd, i) => (
              <ProgramDayRow key={`${pd.templateDayId}-${i}`} entry={pd} />
            ))}
          </ul>
        </div>
      )}

      {/* Footer: nutrition + message button */}
      <div className="px-4 py-2.5 border-t border-[#A6ADA7] flex items-center gap-3">
        {/* Nutrition */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UtensilsCrossed
            size={13}
            className={client.nutritionLoggedToday ? 'text-[#C0FC01]' : 'text-[#989F99]'}
            strokeWidth={1.5}
          />
          {client.hasNutritionPlan ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    client.nutritionTodayPct >= 80
                      ? 'text-[#2FA65A]'
                      : client.nutritionTodayPct > 0
                      ? 'text-[#C0FC01]'
                      : 'text-[#E6E8E7]'
                  }`}
                >
                  {client.nutritionTodayPct}%
                </span>
                <span className="text-[10px] text-[#E6E8E7]">voeding</span>
              </div>
              <div className="h-1 bg-[#A6ADA7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${client.nutritionTodayPct}%`,
                    backgroundColor:
                      client.nutritionTodayPct >= 80
                        ? '#2FA65A'
                        : client.nutritionTodayPct > 0
                        ? '#C0FC01'
                        : '#A6ADA7',
                  }}
                />
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-[#989F99]">Geen voedingsplan</span>
          )}
        </div>

        {/* Message button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            onMessage()
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A6ADA7] text-[11px] font-semibold text-[#E6E8E7] active:scale-95 transition-transform flex-shrink-0"
        >
          <MessageCircle size={13} strokeWidth={2} />
          Bericht
        </button>
      </div>
    </div>
  )
}

// ─── Program Day Row ─────────────────────────────────────────

function ProgramDayRow({ entry }: { entry: ProgramDayEntry }) {
  // Icon + styling per status
  let icon: React.ReactNode
  let nameClass = 'text-[#FDFDFE]'
  const labelClass = 'text-[#E6E8E7]'
  let suffix: string | null = null

  switch (entry.status) {
    case 'done':
      icon = <CheckCircle2 size={13} className="text-[#2FA65A] flex-shrink-0" strokeWidth={2.25} />
      nameClass = 'text-[#E6E8E7] line-through decoration-[#989F99] decoration-1'
      if (entry.completedOnLabel) suffix = `gedaan ${entry.completedOnLabel.toLowerCase()}`
      break
    case 'today':
      icon = <Circle size={13} className="text-[#C0FC01] flex-shrink-0" strokeWidth={2.25} />
      nameClass = 'text-[#FDFDFE] font-semibold'
      suffix = 'vandaag'
      break
    case 'upcoming':
      icon = <CircleDashed size={13} className="text-[#989F99] flex-shrink-0" strokeWidth={2} />
      nameClass = 'text-[#E6E8E7]'
      break
    case 'missed':
      icon = <CircleAlert size={13} className="text-[#B55A4A] flex-shrink-0" strokeWidth={2.25} />
      nameClass = 'text-[#B55A4A] font-medium'
      suffix = 'gemist'
      break
  }

  return (
    <li className="flex items-center gap-2 text-[12px] leading-tight py-0.5">
      {icon}
      <span className={`truncate ${nameClass}`}>{entry.name}</span>
      <span className={`text-[10px] uppercase tracking-wider tabular-nums ${labelClass}`}>
        {entry.scheduledDayLabel}
      </span>
      {suffix && (
        <span
          className={`ml-auto text-[10px] ${
            entry.status === 'missed'
              ? 'text-[#B55A4A]'
              : entry.status === 'today'
              ? 'text-[#C0FC01] font-semibold'
              : 'text-[#E6E8E7]'
          }`}
        >
          {suffix}
        </span>
      )}
    </li>
  )
}

// ─── Week Dot ────────────────────────────────────────────────

function WeekDot({ day }: { day: WeekDay }) {
  const label = DAY_LABELS[day.dayNumber - 1]

  // Visual state
  let dotClass = ''
  let innerClass = ''
  let tooltipTitle = `${FULL_DAY_LABELS[day.dayNumber - 1]}`

  switch (day.state) {
    case 'done_planned':
      dotClass = 'bg-[#FDFDFE] border-[#FDFDFE]'
      tooltipTitle += ` · ${day.completedDayName || 'Training'} voltooid`
      break
    case 'done_moved':
      dotClass = 'bg-[#FDFDFE] border-[#FDFDFE]'
      innerClass = 'bg-[#E8B948]'
      tooltipTitle += ` · ${day.completedDayName || 'Training'} voltooid${
        day.movedFromDayName ? ` (van ${day.movedFromDayName})` : ''
      }`
      break
    case 'done_bonus':
      dotClass = 'bg-[#2FA65A] border-[#2FA65A]'
      tooltipTitle += ` · Bonus training`
      break
    case 'missed':
      dotClass = 'bg-[#A6ADA7] border-[#B55A4A] border-[1.5px]'
      tooltipTitle += ` · ${day.plannedDayName || 'Training'} gemist`
      break
    case 'today_open':
      dotClass = 'bg-[rgba(232,185,72,0.14)] border-[#E8B948] border-[1.5px]'
      tooltipTitle += ` · ${day.plannedDayName || 'Training'} vandaag`
      break
    case 'upcoming':
      dotClass = 'bg-[#A6ADA7] border-[#989F99] border-dashed'
      tooltipTitle += ` · ${day.plannedDayName || 'Training'} gepland`
      break
    case 'rest':
    default:
      dotClass = 'bg-[#A6ADA7] border-[#A6ADA7]'
      tooltipTitle += ' · Rust'
      break
  }

  const isSmall = day.state === 'rest'

  return (
    <div
      className="flex flex-col items-center gap-1 flex-1"
      title={tooltipTitle}
    >
      <div
        className={`${
          isSmall ? 'w-2 h-2' : 'w-[22px] h-[22px]'
        } rounded-full border flex items-center justify-center transition-transform ${dotClass} ${
          day.isToday && !isSmall ? 'ring-2 ring-[#C0FC01]/30 ring-offset-1 ring-offset-white' : ''
        }`}
      >
        {innerClass && <div className={`w-1.5 h-1.5 rounded-full ${innerClass}`} />}
      </div>
      <span
        className={`text-[9px] font-medium uppercase tracking-wider ${
          day.isToday ? 'text-[#FDFDFE]' : 'text-[#E6E8E7]'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────

function ClientListSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[140px] bg-[#A6ADA7] rounded-2xl border border-[#A6ADA7] animate-pulse"
        />
      ))}
    </div>
  )
}

function EmptyState({ filter, searchQuery }: { filter: FilterMode; searchQuery: string }) {
  if (searchQuery) {
    return (
      <div className="bg-[#A6ADA7] border border-[#A6ADA7] rounded-2xl p-10 text-center">
        <p className="text-[14px] text-[#E6E8E7]">Geen cliënten gevonden voor &ldquo;{searchQuery}&rdquo;</p>
      </div>
    )
  }
  if (filter === 'needs') {
    return (
      <div className="bg-[#A6ADA7] border border-[#A6ADA7] rounded-2xl p-10 text-center">
        <div className="w-11 h-11 rounded-full bg-[#E6F7EA] flex items-center justify-center mx-auto mb-3">
          <Sparkles size={18} className="text-[#2FA65A]" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-semibold text-[#FDFDFE]">Alles op schema</p>
        <p className="text-[12px] text-[#E6E8E7] mt-1">Geen cliënten die aandacht nodig hebben</p>
      </div>
    )
  }
  return (
    <div className="bg-[#A6ADA7] border border-[#A6ADA7] rounded-2xl p-10 text-center">
      <p className="text-[14px] text-[#E6E8E7]">Geen cliënten</p>
    </div>
  )
}

// ─── Quick Message Sheet ─────────────────────────────────────

function QuickMessageSheet({
  client,
  onClose,
  onSent,
}: {
  client: ClientWeekRow
  onClose: () => void
  onSent: () => void
}) {
  const firstName = client.fullName.split(' ')[0]
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const todayPlanned = client.week.find((d) => d.isToday)
  const hasTodayOpen = todayPlanned?.state === 'today_open'

  const suggestions: string[] = []
  if (hasTodayOpen) {
    suggestions.push(
      `${firstName}, heb je vandaag al getraind? ${todayPlanned?.plannedDayName || 'Je sessie'} staat nog open.`
    )
  }
  if (client.missedSoFar > 0) {
    suggestions.push(
      `Hey ${firstName}, ik zie dat je wat trainingen hebt gemist deze week. Alles oké? Kan ik ergens mee helpen?`
    )
  }
  if (client.hasNutritionPlan && !client.nutritionLoggedToday) {
    suggestions.push(`${firstName}, vergeet je voeding vandaag niet bij te houden 💪`)
  }
  if (suggestions.length === 0) {
    suggestions.push(
      `Hey ${firstName}, hoe gaat het? Laat me weten als je ergens tegenaan loopt.`,
      `${firstName}, super bezig deze week. Keep it up!`
    )
  }

  async function handleSend() {
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSending(false)
        return
      }
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: client.id,
        content: message.trim(),
        message_type: 'text',
      })
      if (!error) {
        onSent()
      } else {
        setSending(false)
      }
    } catch {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative bg-[#A6ADA7] w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl p-5 pb-8 lg:pb-5 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle / close */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E6E8E7]">
              Bericht aan
            </p>
            <p className="text-[18px] font-semibold text-[#FDFDFE]">{client.fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#A6ADA7] flex items-center justify-center active:scale-95"
          >
            <X size={16} className="text-[#E6E8E7]" />
          </button>
        </div>

        {/* Suggestions */}
        <div className="space-y-2 mb-4">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setMessage(s)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#A6ADA7] border border-[#A6ADA7] text-[13px] text-[#FDFDFE] leading-snug active:scale-[0.99] transition-transform"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Typ een bericht..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-[#A6ADA7] border border-[#A6ADA7] text-[14px] text-[#FDFDFE] placeholder-[#E6E8E7] focus:outline-none focus:ring-2 focus:ring-[#C0FC01]/25 focus:border-transparent resize-none mb-3"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="w-full py-3.5 rounded-xl bg-[#474B48] text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Versturen...
            </>
          ) : (
            <>
              <Send size={15} strokeWidth={2} />
              Verstuur
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 200ms ease-out;
        }
        .animate-slide-up {
          animation: slide-up 280ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}
