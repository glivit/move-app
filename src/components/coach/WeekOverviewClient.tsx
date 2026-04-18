'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type {
  CoachWeekOverview,
  ClientWeekRow,
  WeekDay,
  DietDay,
  DayState,
  DietDayState,
} from '@/lib/coach-week-data'
import { useCoachLiveUpdates } from '@/hooks/useCoachLiveUpdates'

interface Props {
  initialData: CoachWeekOverview | null
  coachFirstName: string
  coachId?: string | null
}

const DAY_LETTERS = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']

type DotClass = 'done' | 'today' | 'missed' | 'open' | 'rest'

function workoutDotClass(state: DayState): DotClass {
  switch (state) {
    case 'done_planned':
    case 'done_moved':
    case 'done_bonus':
      return 'done'
    case 'today_open':
      return 'today'
    case 'missed':
      return 'missed'
    case 'upcoming':
      return 'open'
    case 'rest':
    default:
      return 'rest'
  }
}

function dietDotClass(state: DietDayState): DotClass {
  // DietDayState is already 1:1 with our dot classes — no 'rest' for diet.
  return state as DotClass
}

// ISO 8601 week number
function getIsoWeekNumber(dateIso: string): number {
  const d = new Date(dateIso + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function WeekOverviewClient({ initialData, coachFirstName, coachId }: Props) {
  const [data, setData] = useState<CoachWeekOverview | null>(initialData)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/week-overview', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as CoachWeekOverview
      setData(json)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch() awaits a fetch before updating state
    refetch()
  }, [data, refetch])

  useCoachLiveUpdates({
    refetch,
    coachId: coachId || undefined,
    disabled: !coachId,
  })

  const weekNumber = data ? getIsoWeekNumber(data.weekStartIso) : null
  const clients = data?.clients || []

  return (
    <div className="pb-32">
      {/* Brand */}
      <div className="pt-[22px] pb-0 px-0.5 text-[22px] font-medium tracking-[0.08em] text-[#FDFDFE]">
        <span className="font-light">M</span>ŌVE
      </div>

      {/* Greeting */}
      <h1
        className="pt-[30px] pb-2 px-0.5 text-[34px] font-light tracking-[-0.02em] leading-[1.1] text-[#FDFDFE]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Dag {coachFirstName}.
      </h1>

      {/* Eyebrow */}
      <div className="pt-5 pb-3 px-0.5 text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)]">
        {weekNumber
          ? `Cliënten · week ${weekNumber}`
          : 'Cliënten'}
      </div>

      {/* Client cards */}
      {!data ? (
        <CardSkeletons />
      ) : clients.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes coach-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.72); }
        }
      `}</style>
    </div>
  )
}

// ─── Client Card ────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientWeekRow }) {
  const [tab, setTab] = useState<'workout' | 'dieet'>('workout')

  const workoutDots: DotClass[] = client.week.map((d) => workoutDotClass(d.state))
  const dietDots: DotClass[] = (client.dietWeek || []).map((d) => dietDotClass(d.state))

  const isToday = (idx: number): boolean =>
    tab === 'workout'
      ? !!client.week[idx]?.isToday
      : !!(client.dietWeek && client.dietWeek[idx]?.isToday)

  const dots = tab === 'workout' ? workoutDots : dietDots
  const summary = tab === 'workout' ? client.workoutSummary : client.dietSummary

  return (
    <Link
      href={`/coach/clients/${client.id}/week`}
      className="block bg-[#474B48] rounded-[22px] px-[22px] pt-5 pb-[22px] mb-[14px] active:scale-[0.995] transition-transform"
    >
      {/* Head row */}
      <div className="flex items-center gap-[14px]">
        <div className="w-[42px] h-[42px] rounded-full bg-[#5c6361] text-[#FDFDFE] text-[12px] font-semibold tracking-[0.04em] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {client.avatarUrl ? (
            <Image
              src={client.avatarUrl}
              alt=""
              width={42}
              height={42}
              className="w-full h-full object-cover"
              unoptimized
              loading="lazy"
            />
          ) : (
            client.initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-medium tracking-[-0.01em] leading-[1.2] text-[#FDFDFE] truncate">
            {client.fullName}
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[rgba(253,253,254,0.40)] mt-[3px]">
            {client.packageTier || '—'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav
        className="flex gap-7 mt-[22px] mb-[18px] border-b border-[rgba(253,253,254,0.08)]"
        role="tablist"
      >
        <TabButton active={tab === 'workout'} onClick={() => setTab('workout')}>
          Workout
        </TabButton>
        <TabButton active={tab === 'dieet'} onClick={() => setTab('dieet')}>
          Dieet
        </TabButton>
      </nav>

      {/* Week dots */}
      <div className="grid grid-cols-7 mb-4">
        {dots.map((dot, idx) => (
          <DayColumn
            key={idx}
            dot={dot}
            letter={DAY_LETTERS[idx]}
            isToday={isToday(idx)}
          />
        ))}
      </div>

      {/* Summary */}
      <p className="text-[13.5px] leading-[1.45] tracking-[-0.005em] text-[rgba(253,253,254,0.62)] m-0">
        {summary}
      </p>
    </Link>
  )
}

// ─── Tab button ─────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={`relative bg-transparent border-0 p-0 pb-2.5 text-[14px] font-medium tracking-[-0.005em] transition-colors cursor-pointer ${
        active ? 'text-[#FDFDFE]' : 'text-[rgba(253,253,254,0.40)]'
      }`}
    >
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-[1.5px] rounded-[1px] bg-[#FDFDFE]" />
      )}
    </button>
  )
}

// ─── Day column (dot + letter) ──────────────────────────────────

function DayColumn({
  dot,
  letter,
  isToday,
}: {
  dot: DotClass
  letter: string
  isToday: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 flex items-center justify-center relative">
        <Dot dot={dot} />
      </div>
      <span
        className={`text-[11px] tracking-[0.04em] ${
          isToday ? 'text-[#FDFDFE] font-medium' : 'text-[rgba(253,253,254,0.40)]'
        }`}
      >
        {letter}
      </span>
    </div>
  )
}

// ─── The dot primitive ──────────────────────────────────────────

function Dot({ dot }: { dot: DotClass }) {
  switch (dot) {
    case 'done':
      return <span className="block w-[14px] h-[14px] rounded-full bg-[#C0FC01]" />
    case 'missed':
      return (
        <span className="block w-[14px] h-[14px] rounded-full bg-transparent border-[1.5px] border-[#E8A93C]" />
      )
    case 'today':
      return (
        <span className="relative block w-[14px] h-[14px] rounded-full bg-transparent border-[1.5px] border-[#C0FC01]">
          <span
            className="absolute inset-[3.5px] rounded-full bg-[#C0FC01]"
            style={{ animation: 'coach-dot-pulse 2.2s infinite ease-in-out' }}
          />
        </span>
      )
    case 'rest':
      return <span className="block w-1 h-1 rounded-full bg-[rgba(253,253,254,0.24)]" />
    case 'open':
    default:
      return (
        <span className="block w-[14px] h-[14px] rounded-full bg-transparent border-[1.5px] border-[rgba(253,253,254,0.22)]" />
      )
  }
}

// ─── Skeleton + empty ───────────────────────────────────────────

function CardSkeletons() {
  return (
    <div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-[#474B48] rounded-[22px] h-[188px] mb-[14px] animate-pulse opacity-60"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-[#474B48] rounded-[22px] px-6 py-10 text-center">
      <p className="text-[14px] text-[rgba(253,253,254,0.62)]">
        Nog geen cliënten. Nodig je eerste klant uit vanuit Studio.
      </p>
    </div>
  )
}

// Legacy export so any other importer still works
export type { ClientWeekRow, WeekDay, DietDay }
