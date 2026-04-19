'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ResendInviteButton } from '@/components/coach/ResendInviteButton'
import { RequestReintakeButton } from '@/components/coach/RequestReintakeButton'
import type {
  ClientWeekTimeline,
  TimelineState,
  ActivityLogEntry,
  SessionLogEntry,
  DayLogEntry,
  LiftProgressEntry,
  PrEntry,
} from '@/lib/coach-client-week-data'

interface Props {
  data: ClientWeekTimeline
  coachId: string
}

type Tab = 'overzicht' | 'programma' | 'voeding' | 'voortgang'
type WeekTab = 'workout' | 'dieet'
type DotClass = 'done' | 'today' | 'missed' | 'open' | 'rest'

const DAY_LETTERS = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']

function workoutDotClass(state: TimelineState): DotClass {
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

function dietDotClass(pct: number, hasTarget: boolean, isToday: boolean, isFuture: boolean): DotClass {
  if (!hasTarget) return 'open'
  if (isToday) return 'today'
  if (isFuture) return 'open'
  if (pct >= 85 && pct <= 115) return 'done'
  if (pct > 0 && pct < 85) return 'missed'
  return 'missed' // nothing logged on a past day
}

export function ClientDetailView({ data, coachId }: Props) {
  const [tab, setTab] = useState<Tab>('overzicht')
  void coachId

  const identityMeta = [
    data.packageTier || null,
    data.startDateLabel ? `lid sinds ${data.startDateLabel}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const hasUnreadMsg = useMemo(
    () => data.recentMessages.some((m) => !m.senderIsCoach),
    [data.recentMessages]
  )

  return (
    <div className="pb-32">
      {/* Top bar: back + resend-invite + chat */}
      <div className="flex items-center justify-between pt-[18px] pb-[18px] px-0.5">
        <Link
          href="/coach"
          className="flex items-center gap-2 text-[14px] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] transition-colors"
        >
          <svg
            viewBox="0 0 14 14"
            className="w-[14px] h-[14px]"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 3 4 7 9 11" />
          </svg>
          Terug
        </Link>
        <div className="flex items-center gap-2">
          {data.intakeCompleted && (
            <RequestReintakeButton
              clientId={data.clientId}
              clientName={data.fullName}
              requestedAt={data.reintakeRequestedAt}
              variant="chip"
            />
          )}
          <ResendInviteButton
            clientId={data.clientId}
            clientName={data.fullName}
            variant="chip"
          />
          <Link
            href={`/coach/messages/${data.clientId}`}
            className="relative w-[38px] h-[38px] rounded-full bg-[rgba(253,253,254,0.10)] flex items-center justify-center text-[#FDFDFE]"
            aria-label="Open chat"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[18px] h-[18px]"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {hasUnreadMsg && (
              <span className="absolute top-[6px] right-[6px] w-2 h-2 rounded-full bg-[#C0FC01] border-2 border-[#8E9890]" />
            )}
          </Link>
        </div>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-4 px-0.5 pb-1">
        <div className="w-16 h-16 rounded-full bg-[#5c6361] text-[#FDFDFE] text-[17px] font-semibold tracking-[0.04em] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {data.avatarUrl ? (
            <Image
              src={data.avatarUrl}
              alt=""
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
              loading="lazy"
            />
          ) : (
            data.initials
          )}
        </div>
        <div className="min-w-0">
          <div
            className="text-[26px] font-light tracking-[-0.02em] leading-[1.15] text-[#FDFDFE] truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {data.fullName}
          </div>
          {identityMeta && (
            <div className="text-[12px] text-[rgba(253,253,254,0.40)] tracking-[0.04em] mt-1.5">
              {identityMeta}
            </div>
          )}
        </div>
      </div>

      {/* View tabs */}
      <nav
        className="flex gap-6 mt-6 mx-0.5 mb-[10px] border-b border-[rgba(253,253,254,0.08)] overflow-x-auto"
        role="tablist"
        style={{ scrollbarWidth: 'none' }}
      >
        <ViewTab active={tab === 'overzicht'} onClick={() => setTab('overzicht')}>Overzicht</ViewTab>
        <ViewTab active={tab === 'programma'} onClick={() => setTab('programma')}>Programma</ViewTab>
        <ViewTab active={tab === 'voeding'} onClick={() => setTab('voeding')}>Voeding</ViewTab>
        <ViewTab active={tab === 'voortgang'} onClick={() => setTab('voortgang')}>Voortgang</ViewTab>
      </nav>

      {/* Panels */}
      {tab === 'overzicht' && <OverzichtPanel data={data} />}
      {tab === 'programma' && <ProgrammaPanel data={data} />}
      {tab === 'voeding' && <VoedingPanel data={data} />}
      {tab === 'voortgang' && <VoortgangPanel data={data} />}

      {/* Global keyframe for today pulse — reused from WeekOverviewClient */}
      <style jsx global>{`
        @keyframes coach-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.72); }
        }
      `}</style>
    </div>
  )
}

// ─── View tab ───────────────────────────────────────────────────

function ViewTab({
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
      onClick={onClick}
      className={`relative bg-transparent border-0 p-0 pb-3 text-[14px] font-medium tracking-[-0.005em] transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
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

// ─── Section title ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 mb-[10px] mx-0.5 text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)]">
      {children}
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────

function Card({
  children,
  editable,
  onEdit,
  editHref,
  editAriaLabel,
  subtle,
}: {
  children: React.ReactNode
  editable?: boolean
  /** Callback voor bewerk-knop. Gebruik OFWEL onEdit OFWEL editHref. */
  onEdit?: () => void
  /** Als gezet, rendert het potloodje als Link (ondersteunt middle-click / right-click → open in tab). */
  editHref?: string
  editAriaLabel?: string
  subtle?: boolean
}) {
  const editIconSvg = (
    <svg
      viewBox="0 0 16 16"
      className="w-[13px] h-[13px]"
      stroke="currentColor"
      strokeWidth="1.7"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 1.5l3.5 3.5-9 9H2v-3.5l9-9z" />
      <path d="M10 2.5l3.5 3.5" />
    </svg>
  )
  const editBtnClass =
    'absolute top-[14px] right-[14px] w-[30px] h-[30px] rounded-full bg-[rgba(253,253,254,0.07)] hover:bg-[rgba(253,253,254,0.14)] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] flex items-center justify-center transition-colors z-10'

  return (
    <div
      className={`relative rounded-[22px] px-[22px] pt-5 pb-[22px] mb-3 ${
        subtle ? 'bg-[rgba(71,75,72,0.45)]' : 'bg-[#474B48]'
      }`}
    >
      {editable && editHref ? (
        <Link
          href={editHref}
          aria-label={editAriaLabel || 'Bewerken'}
          className={editBtnClass}
        >
          {editIconSvg}
        </Link>
      ) : editable ? (
        <button
          type="button"
          aria-label={editAriaLabel || 'Bewerken'}
          onClick={onEdit}
          className={editBtnClass}
        >
          {editIconSvg}
        </button>
      ) : null}
      {children}
    </div>
  )
}

// ─── Dot primitive (matches WeekOverviewClient) ─────────────────

function Dot({ dot }: { dot: DotClass }) {
  switch (dot) {
    case 'done':
      return <span className="block w-4 h-4 rounded-full bg-[#C0FC01]" />
    case 'missed':
      return <span className="block w-4 h-4 rounded-full bg-transparent border-[1.5px] border-[#E8A93C]" />
    case 'today':
      return (
        <span className="relative block w-4 h-4 rounded-full bg-transparent border-[1.5px] border-[#C0FC01]">
          <span
            className="absolute inset-[3.5px] rounded-full bg-[#C0FC01]"
            style={{ animation: 'coach-dot-pulse 2.2s infinite ease-in-out' }}
          />
        </span>
      )
    case 'rest':
      return <span className="block w-[5px] h-[5px] rounded-full bg-[rgba(253,253,254,0.24)]" />
    case 'open':
    default:
      return <span className="block w-4 h-4 rounded-full bg-transparent border-[1.5px] border-[rgba(253,253,254,0.22)]" />
  }
}

// ─── Week dots row (shared) ─────────────────────────────────────

function WeekDots({
  states,
  todayIndex,
}: {
  states: DotClass[]
  todayIndex: number
}) {
  return (
    <div className="grid grid-cols-7 mb-4">
      {states.map((dot, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center relative">
            <Dot dot={dot} />
          </div>
          <span
            className={`text-[11px] tracking-[0.04em] ${
              idx === todayIndex ? 'text-[#FDFDFE] font-medium' : 'text-[rgba(253,253,254,0.40)]'
            }`}
          >
            {DAY_LETTERS[idx]}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Activity row primitive ─────────────────────────────────────

function ActDot({ state }: { state: 'done' | 'pending' | 'info' | 'missed' }) {
  const cls =
    state === 'done'
      ? 'bg-[#C0FC01]'
      : state === 'pending'
      ? 'bg-transparent border-[1.5px] border-[#C0FC01]'
      : state === 'missed'
      ? 'bg-transparent border-[1.5px] border-[#E8A93C]'
      : 'bg-[rgba(253,253,254,0.38)]'
  return <span className={`block w-2 h-2 rounded-full justify-self-center ${cls}`} />
}

function ActivityRow({
  state,
  title,
  sub,
  timeLabel,
  tappable,
  href,
}: {
  state: 'done' | 'pending' | 'info' | 'missed'
  title: string
  sub?: string | null
  timeLabel: string
  tappable?: boolean
  href?: string
}) {
  const gridCols = tappable ? 'grid-cols-[14px_1fr_auto_10px]' : 'grid-cols-[14px_1fr_auto]'
  const body = (
    <>
      <ActDot state={state} />
      <div className="min-w-0">
        <div className="text-[14px] text-[#FDFDFE] tracking-[-0.005em] truncate">{title}</div>
        {sub && (
          <div className="text-[12px] text-[rgba(253,253,254,0.62)] mt-[2px] truncate">{sub}</div>
        )}
      </div>
      <span className="text-[12px] text-[rgba(253,253,254,0.40)] whitespace-nowrap">{timeLabel}</span>
      {tappable && (
        <span className="text-[rgba(253,253,254,0.40)] text-[16px] leading-none justify-self-end">›</span>
      )}
    </>
  )

  if (tappable && href) {
    return (
      <Link
        href={href}
        className={`grid ${gridCols} gap-3 items-center py-[14px] border-b border-[rgba(253,253,254,0.08)] last:border-b-0 hover:bg-[rgba(253,253,254,0.02)] transition-colors`}
      >
        {body}
      </Link>
    )
  }
  return (
    <div className={`grid ${gridCols} gap-3 items-center py-[14px] border-b border-[rgba(253,253,254,0.08)] last:border-b-0`}>
      {body}
    </div>
  )
}

function ActivityList({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#474B48] rounded-[22px] px-[22px] py-2 mb-3">
      {children}
    </div>
  )
}

// ─── OVERZICHT ──────────────────────────────────────────────────

function OverzichtPanel({ data }: { data: ClientWeekTimeline }) {
  const [weekTab, setWeekTab] = useState<WeekTab>('workout')

  const todayIndex = data.days.findIndex((d) => d.isToday)
  const todayIdxSafe = todayIndex >= 0 ? todayIndex : -1

  const hasNutritionPlan = !!data.macroTarget

  const workoutDots: DotClass[] = data.days.map((d) => workoutDotClass(d.state))
  const dietDots: DotClass[] = data.days.map((d) =>
    dietDotClass(d.nutritionPct, hasNutritionPlan, d.isToday, d.isFuture)
  )

  // Summary lines
  const workoutSummary = useMemo(() => {
    const done = data.summary.doneCount
    const planned = data.summary.plannedCount
    if (done === 0 && planned === 0) return 'Nog geen programma actief.'
    if (data.summary.missedCount > 0) {
      return `${done}/${planned} gedaan · ${data.summary.missedCount} gemist`
    }
    if (data.summary.prCountWeek > 0) {
      return `${done}/${planned} gedaan · ${data.summary.prCountWeek} PR${
        data.summary.prCountWeek > 1 ? "'s" : ''
      } deze week`
    }
    return `${done}/${planned} gedaan · op schema`
  }, [data.summary])

  const dietSummary = useMemo(() => {
    if (!hasNutritionPlan) return 'Geen voedingsplan actief.'
    const target = data.macroTarget?.kcal || 0
    const loggedDays = data.days.filter((d) => !d.isFuture && d.nutrition && d.nutrition.caloriesLogged > 0)
    const onTarget = loggedDays.filter(
      (d) => target > 0 && Math.abs(d.nutrition!.caloriesLogged - target) <= target * 0.15
    ).length
    if (loggedDays.length === 0) return 'Nog niets gelogd deze week.'
    const avg = Math.round(
      loggedDays.reduce((s, d) => s + (d.nutrition?.caloriesLogged || 0), 0) / loggedDays.length
    )
    return `${onTarget}/${loggedDays.length} dagen binnen target · gemid. ${avg} kcal`
  }, [data, hasNutritionPlan])

  const dots = weekTab === 'workout' ? workoutDots : dietDots
  const summaryLine = weekTab === 'workout' ? workoutSummary : dietSummary

  // Lifts preview: top 3 for Overzicht
  const liftsPreview: LiftProgressEntry[] = data.liftsProgress.slice(0, 3)
  const headlineLift = data.liftsProgress.find((l) => l.deltaLabel === 'up') || data.liftsProgress[0]

  return (
    <div>
      <SectionTitle>Deze week</SectionTitle>
      <Card>
        <nav
          className="flex gap-7 mb-[18px] border-b border-[rgba(253,253,254,0.08)]"
          role="tablist"
        >
          <WeekTabBtn active={weekTab === 'workout'} onClick={() => setWeekTab('workout')}>Workout</WeekTabBtn>
          <WeekTabBtn active={weekTab === 'dieet'} onClick={() => setWeekTab('dieet')}>Dieet</WeekTabBtn>
        </nav>
        <WeekDots states={dots} todayIndex={todayIdxSafe} />
        <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
          {summaryLine}
        </p>
      </Card>

      {/* Progressie */}
      {headlineLift && liftsPreview.length > 0 && (
        <>
          <SectionTitle>Progressie</SectionTitle>
          <Card>
            <div className="flex items-baseline justify-between gap-[14px]">
              <span
                className={`text-[13px] font-medium uppercase tracking-[0.14em] ${
                  headlineLift.deltaLabel === 'up'
                    ? 'text-[#C0FC01]'
                    : headlineLift.deltaLabel === 'down'
                    ? 'text-[#E8A93C]'
                    : 'text-[rgba(253,253,254,0.62)]'
                }`}
              >
                {headlineLift.deltaLabel === 'up' && '▲ Sterker'}
                {headlineLift.deltaLabel === 'down' && '▼ Zwakker'}
                {(headlineLift.deltaLabel === 'flat' || !headlineLift.deltaLabel) && '— Stabiel'}
              </span>
              <span className="text-[11px] text-[rgba(253,253,254,0.40)] tracking-[0.08em]">4 weken</span>
            </div>
            <div className="flex items-end justify-between gap-[14px] mt-[14px]">
              <div className="min-w-0">
                <div
                  className="text-[22px] font-light tracking-[-0.02em] text-[#FDFDFE] leading-[1.2]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {headlineLift.name}
                </div>
                <div className="text-[12px] text-[rgba(253,253,254,0.62)] mt-1">
                  {headlineLift.display}
                </div>
              </div>
              <MiniTrendChart
                series={synthSparkline(headlineLift.deltaLabel)}
                color={
                  headlineLift.deltaLabel === 'down'
                    ? '#E8A93C'
                    : '#C0FC01'
                }
              />
            </div>
            <div className="mt-[18px] border-t border-[rgba(253,253,254,0.08)] pt-[14px] flex flex-col gap-[10px]">
              {liftsPreview.map((l) => (
                <div key={l.name} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#FDFDFE] font-medium">{l.name}</span>
                  <span
                    className={`text-[12.5px] ${
                      l.deltaLabel === 'up'
                        ? 'text-[#C0FC01]'
                        : l.deltaLabel === 'down'
                        ? 'text-[#E8A93C]'
                        : 'text-[rgba(253,253,254,0.62)]'
                    }`}
                  >
                    {l.display}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Laatste activiteit */}
      {data.activityLog.length > 0 && (
        <>
          <SectionTitle>Laatste activiteit</SectionTitle>
          <ActivityList>
            {data.activityLog.map((a) => (
              <ActivityRow
                key={a.id}
                state={a.state}
                title={a.title}
                sub={a.sub}
                timeLabel={a.timeLabel}
              />
            ))}
          </ActivityList>
        </>
      )}
    </div>
  )
}

function WeekTabBtn({
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
      onClick={onClick}
      className={`relative bg-transparent border-0 p-0 pb-2.5 text-[14px] font-medium cursor-pointer ${
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

// ─── PROGRAMMA ──────────────────────────────────────────────────

function ProgrammaPanel({ data }: { data: ClientWeekTimeline }) {
  const sessionLogs: SessionLogEntry[] = data.sessionLogs
  const schedule = data.days

  return (
    <div>
      <SectionTitle>Huidig programma</SectionTitle>
      {data.programInfo ? (
        <Card
          editable
          editAriaLabel="Bewerk programma"
          editHref={`/coach/clients/${data.clientId}/program`}
        >
          <div className="flex items-baseline justify-between gap-[14px]">
            <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-[rgba(253,253,254,0.62)]">
              {data.programInfo.name}
            </span>
          </div>
          <div className="mt-[14px]">
            <div
              className="text-[22px] font-light tracking-[-0.02em] text-[#FDFDFE] leading-[1.2]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {data.programInfo.frequencyLabel}
            </div>
            <div className="text-[12px] text-[rgba(253,253,254,0.62)] mt-1">
              {data.programInfo.phaseLabel}
            </div>
          </div>
        </Card>
      ) : (
        <Card
          editable
          editAriaLabel="Stel programma in"
          editHref={`/coach/clients/${data.clientId}/program`}
        >
          <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
            Nog geen actief programma.
          </p>
        </Card>
      )}

      <SectionTitle>Deze week</SectionTitle>
      <div className="bg-[#474B48] rounded-[22px] px-[22px] py-1 mb-3">
        {schedule.map((d, i) => {
          const dot = workoutDotClass(d.state)
          const label =
            d.plannedDayName || (d.state === 'rest' ? 'Rust' : 'Training')
          const isRest = d.state === 'rest' && !d.plannedDayId
          return (
            <div
              key={d.dateIso}
              className={`grid grid-cols-[20px_1fr_16px] gap-[14px] items-center py-[14px] border-b border-[rgba(253,253,254,0.08)] last:border-b-0 ${
                d.isToday ? '' : ''
              }`}
            >
              <span
                className={`text-[11px] tracking-[0.08em] text-center ${
                  d.isToday ? 'text-[#FDFDFE] font-medium' : 'text-[rgba(253,253,254,0.40)]'
                }`}
              >
                {DAY_LETTERS[i]}
              </span>
              <span
                className={`text-[14px] tracking-[-0.005em] ${
                  isRest ? 'text-[rgba(253,253,254,0.62)]' : 'text-[#FDFDFE]'
                }`}
              >
                {label}
              </span>
              <span className="justify-self-center">
                <Dot dot={dot} />
              </span>
            </div>
          )
        })}
      </div>

      {data.programInfo?.upcomingLabel && (
        <>
          <SectionTitle>Aankomend</SectionTitle>
          <Card subtle>
            <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
              {data.programInfo.upcomingLabel}
            </p>
          </Card>
        </>
      )}

      {sessionLogs.length > 0 && (
        <>
          <SectionTitle>Sessie-logs</SectionTitle>
          <ActivityList>
            {sessionLogs.map((s: SessionLogEntry) => (
              <ActivityRow
                key={s.id}
                state="done"
                title={s.title}
                sub={s.sub}
                timeLabel={s.timeLabel}
                tappable
                href={`/coach/clients/${data.clientId}/sessions/${s.id}`}
              />
            ))}
          </ActivityList>
        </>
      )}
    </div>
  )
}

// ─── VOEDING ────────────────────────────────────────────────────

function VoedingPanel({ data }: { data: ClientWeekTimeline }) {
  const todayIdx = data.days.findIndex((d) => d.isToday)
  const todayIdxSafe = todayIdx >= 0 ? todayIdx : -1
  const hasPlan = !!data.macroTarget

  const dietDots: DotClass[] = data.days.map((d) =>
    dietDotClass(d.nutritionPct, hasPlan, d.isToday, d.isFuture)
  )

  const dietSummary = useMemo(() => {
    if (!hasPlan) return 'Stel eerst een voedingsplan in.'
    const target = data.macroTarget?.kcal || 0
    const loggedDays = data.days.filter(
      (d) => !d.isFuture && d.nutrition && d.nutrition.caloriesLogged > 0
    )
    if (loggedDays.length === 0) return 'Nog niets gelogd deze week.'
    const onTarget = loggedDays.filter(
      (d) => target > 0 && Math.abs(d.nutrition!.caloriesLogged - target) <= target * 0.15
    ).length
    const avg = Math.round(
      loggedDays.reduce((s, d) => s + (d.nutrition?.caloriesLogged || 0), 0) / loggedDays.length
    )
    return `${onTarget}/${loggedDays.length} dagen binnen target · gemid. ${avg} kcal`
  }, [data, hasPlan])

  return (
    <div>
      <SectionTitle>Macro-target</SectionTitle>
      {data.macroTarget ? (
        <Card
          editable
          editAriaLabel="Bewerk macro's"
          editHref={`/coach/clients/${data.clientId}/nutrition`}
        >
          <div className="flex items-baseline justify-between gap-[14px]">
            <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-[rgba(253,253,254,0.62)]">
              {data.macroTarget.goalLabel || 'Macro-plan'}
            </span>
          </div>
          <MacrosGrid
            items={[
              { num: String(data.macroTarget.kcal || 0), lbl: 'kcal' },
              { num: `${data.macroTarget.proteinG}g`, lbl: 'Eiwit' },
              { num: `${data.macroTarget.carbsG}g`, lbl: 'Carb' },
              { num: `${data.macroTarget.fatG}g`, lbl: 'Vet' },
            ]}
          />
        </Card>
      ) : (
        <Card
          editable
          editAriaLabel="Stel macro-target in"
          editHref={`/coach/clients/${data.clientId}/nutrition`}
        >
          <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
            Nog geen voedingsplan actief.
          </p>
        </Card>
      )}

      <SectionTitle>Deze week</SectionTitle>
      <Card>
        <WeekDots states={dietDots} todayIndex={todayIdxSafe} />
        <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
          {dietSummary}
        </p>
      </Card>

      {data.todayNutrition && data.todayNutrition.meals.length > 0 && (
        <>
          <SectionTitle>
            Vandaag · {data.todayNutrition.loggedKcal} / {data.todayNutrition.targetKcal} kcal
          </SectionTitle>
          <ActivityList>
            {data.todayNutrition.meals.map((m) => (
              <ActivityRow
                key={m.id}
                state="done"
                title={`${m.name} · ${m.kcal} kcal`}
                sub={`P ${m.proteinG}g · C ${m.carbsG}g · F ${m.fatG}g`}
                timeLabel={m.timeLabel}
              />
            ))}
          </ActivityList>
        </>
      )}

      {data.dayLogs.length > 0 && (
        <>
          <SectionTitle>Dag-logs</SectionTitle>
          <ActivityList>
            {data.dayLogs.map((d: DayLogEntry) => (
              <ActivityRow
                key={d.id}
                state={d.state === 'missed' ? 'missed' : 'done'}
                title={d.title}
                sub={d.sub}
                timeLabel={d.timeLabel}
                tappable
                href={`/coach/clients/${data.clientId}/nutrition/${d.dateIso}`}
              />
            ))}
          </ActivityList>
        </>
      )}
    </div>
  )
}

function MacrosGrid({ items }: { items: Array<{ num: string; lbl: string }> }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 mt-4">
      {items.map((it, idx) => (
        <div key={idx} className="flex flex-col items-start gap-1">
          <div className="text-[19px] font-normal text-[#FDFDFE] tracking-[-0.01em]">
            {it.num}
          </div>
          <div className="text-[10.5px] text-[rgba(253,253,254,0.40)] tracking-[0.08em] uppercase">
            {it.lbl}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── VOORTGANG ──────────────────────────────────────────────────

function VoortgangPanel({ data }: { data: ClientWeekTimeline }) {
  const hasAny =
    !!data.bodyWeight ||
    data.liftsProgress.length > 0 ||
    data.topPRs.length > 0 ||
    data.sessionLogs.length > 0 ||
    !!data.measurements ||
    (data.photos && data.photos.urls.length > 0)

  if (!hasAny) {
    return (
      <div>
        <SectionTitle>Voortgang</SectionTitle>
        <Card>
          <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
            Nog geen check-ins geregistreerd.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {data.bodyWeight && (
        <>
          <SectionTitle>Lichaamsgewicht</SectionTitle>
          <Card>
            <div className="flex items-baseline justify-between gap-[14px]">
              <span
                className={`text-[13px] font-medium uppercase tracking-[0.14em] ${
                  data.bodyWeight.direction === 'down'
                    ? 'text-[#C0FC01]'
                    : data.bodyWeight.direction === 'up'
                    ? 'text-[#E8A93C]'
                    : 'text-[rgba(253,253,254,0.62)]'
                }`}
              >
                {data.bodyWeight.direction === 'down' && '▼ Afname'}
                {data.bodyWeight.direction === 'up' && '▲ Toename'}
                {data.bodyWeight.direction === 'flat' && '— Stabiel'}
              </span>
              <span className="text-[11px] text-[rgba(253,253,254,0.40)] tracking-[0.08em]">
                {data.bodyWeight.windowLabel}
              </span>
            </div>
            <div className="flex items-end justify-between gap-[14px] mt-[14px]">
              <div>
                <div
                  className="text-[22px] font-light tracking-[-0.02em] text-[#FDFDFE] leading-[1.2]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {data.bodyWeight.latestKg?.toFixed(1).replace('.', ',')} kg
                </div>
                {data.bodyWeight.deltaKg4w !== null && (
                  <div className="text-[12px] text-[rgba(253,253,254,0.62)] mt-1">
                    {data.bodyWeight.deltaKg4w > 0 ? '+' : ''}
                    {data.bodyWeight.deltaKg4w.toFixed(1).replace('.', ',')} kg · {data.bodyWeight.windowLabel}
                  </div>
                )}
              </div>
              {data.bodyWeight.series.length > 1 && (
                <MiniTrendChart
                  series={data.bodyWeight.series}
                  color={data.bodyWeight.direction === 'up' ? '#E8A93C' : '#C0FC01'}
                />
              )}
            </div>
          </Card>
        </>
      )}

      {data.liftsProgress.length > 0 && (
        <>
          <SectionTitle>Sleutelliften · e1RM</SectionTitle>
          <Card>
            <div className="flex flex-col">
              {data.liftsProgress.map((l) => (
                <LiftRow key={`${l.name}-${l.exerciseId ?? 'na'}`} lift={l} clientId={data.clientId} />
              ))}
            </div>
          </Card>
        </>
      )}

      {data.topPRs.length > 0 && (
        <>
          <SectionTitle>PR&apos;s · laatste 8</SectionTitle>
          <ActivityList>
            {data.topPRs.map((pr) => (
              <PrRow key={pr.id} pr={pr} clientId={data.clientId} />
            ))}
          </ActivityList>
        </>
      )}

      {data.sessionLogs.length > 0 && (
        <>
          <SectionTitle>Sessie-logs</SectionTitle>
          <ActivityList>
            {data.sessionLogs.map((s) => (
              <ActivityRow
                key={s.id}
                state={s.state === 'missed' ? 'missed' : 'done'}
                title={s.title}
                sub={s.sub}
                timeLabel={s.timeLabel}
                tappable
                href={`/coach/sessions/${s.id}`}
              />
            ))}
          </ActivityList>
        </>
      )}

      {data.measurements && (
        <>
          <SectionTitle>Lichaamsmaten</SectionTitle>
          <Card>
            <div className="flex items-baseline justify-between gap-[14px]">
              <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-[rgba(253,253,254,0.62)]">
                Laatst gemeten
              </span>
              <span className="text-[11px] text-[rgba(253,253,254,0.40)] tracking-[0.08em]">
                {data.measurements.daysAgoLabel}
              </span>
            </div>
            <MacrosGrid
              items={[
                { num: data.measurements.chestCm != null ? String(data.measurements.chestCm) : '—', lbl: 'Borst' },
                { num: data.measurements.waistCm != null ? String(data.measurements.waistCm) : '—', lbl: 'Taille' },
                { num: data.measurements.hipsCm != null ? String(data.measurements.hipsCm) : '—', lbl: 'Heup' },
                { num: data.measurements.armCm != null ? String(data.measurements.armCm) : '—', lbl: 'Arm' },
              ]}
            />
          </Card>
        </>
      )}

      {data.photos && data.photos.urls.length > 0 && (
        <>
          <SectionTitle>Foto&apos;s</SectionTitle>
          <Card>
            <div className="grid grid-cols-3 gap-2">
              {data.photos.urls.slice(0, 3).map((url, idx) => (
                <div
                  key={idx}
                  className="relative rounded-[10px] overflow-hidden"
                  style={{ aspectRatio: '3 / 4' }}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    loading="lazy"
                  />
                </div>
              ))}
              {data.photos.urls.length < 3 &&
                Array.from({ length: 3 - data.photos.urls.length }).map((_, idx) => (
                  <div
                    key={`ph-${idx}`}
                    className="rounded-[10px]"
                    style={{
                      aspectRatio: '3 / 4',
                      background: 'linear-gradient(135deg, #5c6361, #3a3e3c)',
                    }}
                  />
                ))}
            </div>
            <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0 mt-[14px]">
              {data.photos.count} set{data.photos.count !== 1 ? 's' : ''} · laatst{' '}
              {data.photos.latestDateLabel}
            </p>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── LiftRow / PrRow (Voortgang) ────────────────────────────────
//
// LiftRow: klikbaar als we een exerciseId hebben — dan gaat-ie naar
// /coach/clients/[id]/exercises/[exId] waar de volledige historie leeft.
// Zonder exerciseId (legacy data) blijft het een plain row.

function LiftRow({ lift, clientId }: { lift: LiftProgressEntry; clientId: string }) {
  const body = (
    <>
      <div className="min-w-0">
        <div className="text-[14px] text-[#FDFDFE] tracking-[-0.005em] truncate font-medium">
          {lift.name}
        </div>
      </div>
      <span
        className={`text-[12.5px] whitespace-nowrap ${
          lift.deltaLabel === 'up'
            ? 'text-[#C0FC01]'
            : lift.deltaLabel === 'down'
            ? 'text-[#E8A93C]'
            : 'text-[rgba(253,253,254,0.62)]'
        }`}
      >
        {lift.display}
      </span>
      {lift.exerciseId && (
        <span className="text-[rgba(253,253,254,0.40)] text-[16px] leading-none justify-self-end">›</span>
      )}
    </>
  )
  const grid = lift.exerciseId
    ? 'grid-cols-[1fr_auto_10px]'
    : 'grid-cols-[1fr_auto]'
  const cls = `grid ${grid} gap-3 items-center py-[12px] border-b border-[rgba(253,253,254,0.08)] last:border-b-0`

  if (lift.exerciseId) {
    return (
      <Link
        href={`/coach/clients/${clientId}/exercises/${lift.exerciseId}`}
        className={`${cls} hover:bg-[rgba(253,253,254,0.02)] transition-colors`}
      >
        {body}
      </Link>
    )
  }
  return <div className={cls}>{body}</div>
}

function PrRow({ pr, clientId }: { pr: PrEntry; clientId: string }) {
  return (
    <Link
      href={`/coach/clients/${clientId}/exercises/${pr.exerciseId}`}
      className="grid grid-cols-[14px_1fr_auto_10px] gap-3 items-center py-[14px] border-b border-[rgba(253,253,254,0.08)] last:border-b-0 hover:bg-[rgba(253,253,254,0.02)] transition-colors"
    >
      <span className="block w-2 h-2 rounded-full bg-[#C0FC01] justify-self-center" />
      <div className="min-w-0">
        <div className="text-[14px] text-[#FDFDFE] tracking-[-0.005em] truncate">
          {pr.exerciseName}
        </div>
        <div className="text-[12px] text-[rgba(253,253,254,0.62)] mt-[2px] truncate">
          {pr.display}
          {pr.recordType === 'weight' ? '' : pr.recordType === '1rm' ? ' · 1RM' : pr.recordType === 'reps' ? '' : ` · ${pr.recordType}`}
        </div>
      </div>
      <span className="text-[12px] text-[rgba(253,253,254,0.40)] whitespace-nowrap">
        {pr.dateLabel}
      </span>
      <span className="text-[rgba(253,253,254,0.40)] text-[16px] leading-none justify-self-end">›</span>
    </Link>
  )
}

// Synthesize a 9-point sparkline for lifts where we only have a direction label.
// Real time-series isn't in LiftProgressEntry, so this visually communicates
// the trend without inventing fake numbers.
function synthSparkline(label: 'up' | 'down' | 'flat' | null): number[] {
  if (label === 'up') {
    return [38, 34, 30, 26, 22, 18, 14, 10, 6]
  }
  if (label === 'down') {
    return [10, 14, 16, 20, 24, 28, 32, 36, 40]
  }
  // flat or unknown — gentle wobble around the middle
  return [22, 24, 23, 25, 22, 24, 23, 25, 22]
}

function MiniTrendChart({ series, color }: { series: number[]; color: string }) {
  if (series.length < 2) return null
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  const w = 110
  const h = 48
  const step = series.length > 1 ? w / (series.length - 1) : 0
  const points = series
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / span) * (h - 8) - 4
      return `${x},${y}`
    })
    .join(' ')
  const lastX = (series.length - 1) * step
  const lastY = h - ((series[series.length - 1] - min) / span) * (h - 8) - 4

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-[110px] h-[48px] overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  )
}

// Export types so page wrapper type-imports work
export type { ActivityLogEntry }
