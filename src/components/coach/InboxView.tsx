'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  CoachInboxData,
  InboxThread,
  InboxDotClass,
  InboxBucket,
  CheckinStat,
} from '@/lib/coach-inbox-data'

interface Props {
  data: CoachInboxData
  coachId: string
}

type FilterKey = 'all' | 'vragen' | 'checkins' | 'alerts' | 'berichten'

const BUCKET_LABEL: Record<InboxBucket, string> = {
  vandaag: 'Vandaag',
  gisteren: 'Gisteren',
  ouder: 'Ouder · beantwoord',
}

export function InboxView({ data, coachId }: Props) {
  void coachId
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return data.threads
    if (filter === 'vragen') return data.threads.filter((t) => t.kind === 'question')
    if (filter === 'checkins') return data.threads.filter((t) => t.kind === 'checkin')
    if (filter === 'alerts') return data.threads.filter((t) => t.kind === 'alert')
    if (filter === 'berichten') return data.threads.filter((t) => t.kind === 'message')
    return data.threads
  }, [data.threads, filter])

  const grouped = useMemo(() => {
    const buckets: Record<InboxBucket, InboxThread[]> = {
      vandaag: [],
      gisteren: [],
      ouder: [],
    }
    for (const t of filtered) {
      // In "Ouder" only show read items to mirror mockup's "beantwoord" tone
      if (t.bucket === 'ouder' && !t.read && t.kind !== 'message') {
        // unread older threads still show under ouder but keep ordering
      }
      buckets[t.bucket].push(t)
    }
    return buckets
  }, [filtered])

  const headlineIsAmber = data.counts.vragen > 0 || data.counts.alerts > 0

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex items-end justify-between pt-[14px] pb-[18px] px-0.5">
        <div>
          <h1
            className="text-[30px] font-light tracking-[-0.025em] leading-[1.1] text-[#FDFDFE]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Inbox
          </h1>
          <div
            className={`mt-1.5 text-[12px] tracking-[0.04em] ${
              headlineIsAmber ? 'text-[#E8A93C]' : 'text-[rgba(253,253,254,0.62)]'
            }`}
          >
            {data.headlineSub}
          </div>
        </div>
        <button
          type="button"
          aria-label="Zoek"
          className="w-10 h-10 rounded-full bg-[rgba(253,253,254,0.08)] text-[#FDFDFE] flex items-center justify-center"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>

      {/* Filter pills */}
      <div
        className="flex gap-1.5 mb-[22px] overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <FilterPill
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="Alles"
          count={data.counts.all}
        />
        <FilterPill
          active={filter === 'vragen'}
          onClick={() => setFilter('vragen')}
          label="Vragen"
          count={data.counts.vragen}
          alert
        />
        <FilterPill
          active={filter === 'checkins'}
          onClick={() => setFilter('checkins')}
          label="Check-ins"
          count={data.counts.checkins}
        />
        <FilterPill
          active={filter === 'alerts'}
          onClick={() => setFilter('alerts')}
          label="Alerts"
          count={data.counts.alerts}
        />
        <FilterPill
          active={filter === 'berichten'}
          onClick={() => setFilter('berichten')}
          label="Berichten"
        />
      </div>

      {/* Sections */}
      {(['vandaag', 'gisteren', 'ouder'] as InboxBucket[]).map((b) => {
        const items = grouped[b]
        if (items.length === 0) return null
        return (
          <div key={b}>
            <SectionLabel label={BUCKET_LABEL[b]} count={items.length} />
            {items.map((t) => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="bg-[#474B48] rounded-[18px] px-6 py-10 text-center">
          <p className="text-[14px] text-[rgba(253,253,254,0.62)] m-0">
            Niets in deze filter. Alles is onder controle.
          </p>
        </div>
      )}

      <div className="text-center text-[12.5px] text-[rgba(253,253,254,0.62)] tracking-[0.01em] pt-5 pb-2">
        Dat is alles voor deze week · {data.counts.archivedThisWeek} gearchiveerd
      </div>

      <style jsx global>{`
        @keyframes inbox-dot-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Filter pill ────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  label,
  count,
  alert: alertVariant,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
  alert?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium tracking-[0.01em] transition-colors ${
        active
          ? 'bg-[#FDFDFE] text-[#0A0E0B]'
          : 'bg-[rgba(253,253,254,0.06)] text-[rgba(253,253,254,0.62)]'
      }`}
    >
      {label}
      {typeof count === 'number' && count > 0 && (
        <span
          className={`rounded-full px-1.5 text-[10.5px] font-medium leading-[16px] ${
            active
              ? 'bg-[rgba(10,14,11,0.14)] text-[#0A0E0B]'
              : alertVariant
              ? 'bg-[rgba(232,169,60,0.28)] text-[#E8A93C]'
              : 'bg-[rgba(253,253,254,0.14)] text-[rgba(253,253,254,0.62)]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mt-2 mb-[10px] mx-0.5 text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)]">
      <span>{label}</span>
      <span className="tracking-[0.04em]">{count}</span>
    </div>
  )
}

// ─── Thread card ────────────────────────────────────────────────

function ThreadCard({ thread }: { thread: InboxThread }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [pinging, setPinging] = useState(false)

  if (dismissed) return null

  const isAlert = !!thread.alertVariant
  const base = thread.read
    ? 'bg-[rgba(71,75,72,0.55)]'
    : isAlert
    ? 'bg-[rgba(232,169,60,0.08)] border border-[rgba(232,169,60,0.18)]'
    : 'bg-[#474B48]'

  const handleOpen = () => {
    router.push(thread.href)
  }

  const handlePing = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!thread.clientId || pinging) return
    setPinging(true)
    try {
      // Optimistic: dismiss this alert from the list
      setDismissed(true)
      router.push(`/coach/messages/${thread.clientId}`)
    } finally {
      setPinging(false)
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed(true)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen()
        }
      }}
      className={`relative rounded-[18px] px-[14px] pr-4 py-[14px] mb-2 grid grid-cols-[22px_1fr_14px] gap-3 items-start cursor-pointer ${base}`}
    >
      <div className="flex justify-center pt-[3px]">
        <ThreadDot dot={thread.dotClass} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2.5 mb-1">
          <span
            className={`text-[14.5px] tracking-[-0.005em] truncate ${
              thread.read
                ? 'text-[rgba(253,253,254,0.62)] font-normal'
                : 'text-[#FDFDFE] font-medium'
            }`}
          >
            {thread.clientName}
          </span>
          <span className="text-[11.5px] text-[rgba(253,253,254,0.40)] tracking-[0.01em] flex-shrink-0">
            {thread.timeLabel}
          </span>
        </div>
        {thread.kicker && (
          <div
            className={`text-[10.5px] uppercase tracking-[0.14em] mb-1 ${
              thread.kickerVariant === 'act'
                ? 'text-[#E8A93C]'
                : thread.kickerVariant === 'live'
                ? 'text-[#C0FC01]'
                : 'text-[rgba(253,253,254,0.40)]'
            }`}
          >
            {thread.kicker}
          </div>
        )}
        <p
          className={`text-[13.5px] leading-[1.45] tracking-[-0.005em] m-0 ${
            thread.read ? 'text-[rgba(253,253,254,0.62)]' : 'text-[#FDFDFE]'
          }`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {thread.body}
        </p>
        {thread.stats && thread.stats.length > 0 && (
          <div className="flex gap-1.5 mt-2.5">
            {thread.stats.map((s, i) => (
              <CheckinTile key={i} stat={s} />
            ))}
          </div>
        )}
        {thread.quickActions && thread.quickActions.length > 0 && (
          <div className="flex gap-1.5 mt-2.5">
            {thread.quickActions.map((a, i) =>
              a.kind === 'primary' ? (
                <button
                  key={i}
                  type="button"
                  onClick={handlePing}
                  disabled={pinging}
                  className="inline-flex rounded-full px-3 py-1.5 text-[11.5px] font-medium tracking-[0.01em] bg-[rgba(192,252,1,0.12)] text-[#C0FC01] disabled:opacity-60"
                >
                  {a.label}
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex rounded-full px-3 py-1.5 text-[11.5px] font-medium tracking-[0.01em] bg-[rgba(253,253,254,0.06)] text-[rgba(253,253,254,0.62)]"
                >
                  {a.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
      <span className="text-[rgba(253,253,254,0.40)] text-[15px] leading-none pt-1 justify-self-end">
        ›
      </span>
    </div>
  )
}

function CheckinTile({ stat }: { stat: CheckinStat }) {
  return (
    <div className="flex-1 bg-[rgba(253,253,254,0.05)] rounded-[10px] px-2 pt-[7px] pb-[6px] text-center">
      <div
        className={`text-[15px] font-normal leading-none tracking-[-0.015em] ${
          stat.warn ? 'text-[#E8A93C]' : 'text-[#FDFDFE]'
        }`}
      >
        {stat.value}
      </div>
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-[rgba(253,253,254,0.40)] mt-[3px]">
        {stat.label}
      </div>
    </div>
  )
}

// ─── Dot primitive ──────────────────────────────────────────────

function ThreadDot({ dot }: { dot: InboxDotClass }) {
  switch (dot) {
    case 'action':
      return <span className="block w-3 h-3 rounded-full border-[2px] border-[#E8A93C] box-border" />
    case 'today':
      return (
        <span className="relative block w-3 h-3 rounded-full border-[2px] border-[#C0FC01] box-border">
          <span
            className="absolute rounded-full border-[1.5px] border-[#C0FC01]"
            style={{
              inset: '-4px',
              opacity: 0.4,
              animation: 'inbox-dot-pulse 1.8s ease-out infinite',
            }}
          />
        </span>
      )
    case 'open':
      return <span className="block w-3 h-3 rounded-full border-[2px] border-[rgba(253,253,254,0.42)] box-border" />
    case 'done':
      return <span className="block w-3 h-3 rounded-full bg-[#C0FC01]" />
    case 'mini':
    default:
      return <span className="block w-[5px] h-[5px] rounded-full bg-[rgba(253,253,254,0.28)] mt-1" />
  }
}

// Re-export aliases so page wrapper imports line up
export type { FilterKey }

// keep Link referenced (used inside ThreadCard navigation via router, no JSX Link needed)
void Link
