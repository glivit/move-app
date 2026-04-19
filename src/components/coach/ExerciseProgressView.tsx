'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ExerciseProgress } from '@/lib/coach-exercise-progress'

interface Props {
  data: ExerciseProgress
  clientId: string
}

// ─── View ──────────────────────────────────────────────────────

export function ExerciseProgressView({ data, clientId }: Props) {
  const metaBits = [data.bodyPart, data.targetMuscle]
    .filter(Boolean)
    .map((s) => String(s).charAt(0).toUpperCase() + String(s).slice(1))
    .join(' · ')

  return (
    <div className="pb-32">
      {/* Top bar: back */}
      <div className="flex items-center justify-between pt-[18px] pb-[18px] px-0.5">
        <Link
          href={`/coach/clients/${clientId}`}
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
          Terug naar {data.clientFirstName}
        </Link>
      </div>

      {/* Identity + title */}
      <div className="flex items-center gap-4 px-0.5 pb-1">
        <div className="w-14 h-14 rounded-full bg-[#5c6361] text-[#FDFDFE] text-[15px] font-semibold tracking-[0.04em] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {data.clientAvatarUrl ? (
            <Image
              src={data.clientAvatarUrl}
              alt=""
              width={56}
              height={56}
              className="w-full h-full object-cover"
              unoptimized
              loading="lazy"
            />
          ) : (
            data.clientInitials
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)] mb-1">
            {data.clientFirstName} · voortgang
          </div>
          <div
            className="text-[24px] font-light tracking-[-0.02em] leading-[1.15] text-[#FDFDFE] truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {data.exerciseName}
          </div>
          {metaBits && (
            <div className="text-[12px] text-[rgba(253,253,254,0.40)] tracking-[0.04em] mt-1">
              {metaBits}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <SectionTitle>Kerncijfers</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCard
          label="Laatst"
          value={
            data.latestKg != null
              ? `${data.latestKg.toFixed(0)} kg`
              : data.latestReps != null
              ? `${data.latestReps} reps`
              : '—'
          }
          sub={
            data.latestReps != null && data.latestKg != null
              ? `× ${data.latestReps}${data.latestDateIso ? ` · ${formatShort(data.latestDateIso)}` : ''}`
              : data.latestDateIso
              ? formatShort(data.latestDateIso)
              : null
          }
          accent={
            data.deltaLabel === 'up'
              ? '#C0FC01'
              : data.deltaLabel === 'down'
              ? '#E8A93C'
              : null
          }
        />
        <StatCard
          label="Best ever"
          value={
            data.bestSetKg != null
              ? `${data.bestSetKg.toFixed(0)} kg`
              : '—'
          }
          sub={
            data.bestSetReps != null && data.bestSetKg != null
              ? `× ${data.bestSetReps}${data.bestSetDateIso ? ` · ${formatShort(data.bestSetDateIso)}` : ''}`
              : null
          }
        />
        <StatCard
          label="Sessies"
          value={String(data.totalSessions)}
          sub={`${data.totalSets} sets totaal`}
        />
        <StatCard
          label="Trend"
          value={
            data.deltaPct != null
              ? `${data.deltaPct > 0 ? '+' : ''}${data.deltaPct}%`
              : '—'
          }
          sub="vs 4 weken terug"
          accent={
            data.deltaLabel === 'up'
              ? '#C0FC01'
              : data.deltaLabel === 'down'
              ? '#E8A93C'
              : null
          }
        />
      </div>

      {/* Chart */}
      {data.series.length >= 2 && (
        <>
          <SectionTitle>Top-set over tijd</SectionTitle>
          <Card>
            <ProgressChart series={data.series} />
          </Card>
        </>
      )}

      {/* PRs */}
      {data.prs.length > 0 && (
        <>
          <SectionTitle>PR-historie · laatste {data.prs.length}</SectionTitle>
          <ActivityList>
            {data.prs.map((pr) => (
              <div
                key={pr.id}
                className="grid grid-cols-[14px_1fr_auto] gap-3 items-center py-[14px] border-b border-[rgba(253,253,254,0.08)] last:border-b-0"
              >
                <span className="block w-2 h-2 rounded-full bg-[#C0FC01] justify-self-center" />
                <div className="min-w-0">
                  <div className="text-[14px] text-[#FDFDFE] tracking-[-0.005em] truncate">
                    {pr.display}
                    <span className="text-[12px] text-[rgba(253,253,254,0.62)] ml-2">
                      {pr.recordType === '1rm'
                        ? '1RM'
                        : pr.recordType === 'reps'
                        ? 'Reps'
                        : pr.recordType === 'volume'
                        ? 'Volume'
                        : 'Weight'}
                    </span>
                  </div>
                </div>
                <span className="text-[12px] text-[rgba(253,253,254,0.40)] whitespace-nowrap">
                  {pr.dateLabel}
                </span>
              </div>
            ))}
          </ActivityList>
        </>
      )}

      {/* Recent sessions */}
      {data.recentSets.length > 0 && (
        <>
          <SectionTitle>Laatste {data.recentSets.length} sessies</SectionTitle>
          <div className="flex flex-col gap-2">
            {data.recentSets.map((row) => (
              <SessionSetBlock key={row.sessionId} row={row} />
            ))}
          </div>
        </>
      )}

      {data.series.length === 0 && (
        <Card>
          <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
            Nog geen sets gelogd voor deze oefening.
          </p>
        </Card>
      )}
    </div>
  )
}

// ─── Primitives ─────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 mb-[10px] mx-0.5 text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)]">
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-[22px] px-[22px] pt-5 pb-[22px] mb-3 bg-[#474B48]">
      {children}
    </div>
  )
}

function ActivityList({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#474B48] rounded-[22px] px-[22px] py-2 mb-3">{children}</div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string | null
  accent?: string | null
}) {
  return (
    <div className="relative rounded-[18px] bg-[#474B48] px-[16px] pt-[14px] pb-[16px]">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[rgba(253,253,254,0.40)] mb-[6px]">
        {label}
      </div>
      <div
        className="text-[22px] font-light tracking-[-0.02em] leading-[1.15]"
        style={{
          color: accent || '#FDFDFE',
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11.5px] text-[rgba(253,253,254,0.55)] mt-[4px] truncate">
          {sub}
        </div>
      )}
    </div>
  )
}

function SessionSetBlock({
  row,
}: {
  row: ExerciseProgress['recentSets'][number]
}) {
  const working = row.sets.filter((s) => !s.isWarmup)
  return (
    <div className="rounded-[20px] bg-[#474B48] px-[18px] pt-[14px] pb-[14px]">
      <div className="flex items-baseline justify-between gap-2 mb-[10px]">
        <div className="text-[13.5px] text-[#FDFDFE] font-medium truncate">
          {row.sessionName || 'Training'}
        </div>
        <div className="text-[11px] text-[rgba(253,253,254,0.40)] tracking-[0.06em] whitespace-nowrap">
          {row.sessionDateLabel}
        </div>
      </div>
      <div className="flex flex-col gap-[6px]">
        {working.length === 0 && (
          <div className="text-[12px] text-[rgba(253,253,254,0.55)]">
            Alleen warming-up gelogd.
          </div>
        )}
        {working.map((s, idx) => (
          <div
            key={`${row.sessionId}-${idx}`}
            className="grid grid-cols-[28px_1fr_auto] gap-2 items-center text-[13px]"
          >
            <span className="text-[rgba(253,253,254,0.40)] text-[11.5px] tracking-[0.04em]">
              #{s.setNumber}
            </span>
            <span
              className={`truncate ${
                !s.completed ? 'text-[rgba(253,253,254,0.40)] italic' : 'text-[#FDFDFE]'
              }`}
            >
              {s.weightKg != null ? `${s.weightKg} kg` : '—'}
              {s.actualReps != null ? ` × ${s.actualReps}` : ''}
              {s.painFlag && (
                <span className="ml-2 text-[#E8A93C] text-[11px]">• pijn</span>
              )}
            </span>
            {s.isPr && (
              <span className="text-[11px] font-medium text-[#C0FC01] tracking-[0.06em] whitespace-nowrap">
                PR
              </span>
            )}
          </div>
        ))}
      </div>
      <Link
        href={`/coach/sessions/${row.sessionId}`}
        className="mt-[10px] flex items-center justify-end gap-1 text-[12px] text-[rgba(253,253,254,0.55)] hover:text-[#FDFDFE] transition-colors"
      >
        sessie openen
        <span className="text-[13px] leading-none">›</span>
      </Link>
    </div>
  )
}

// ─── Chart ─────────────────────────────────────────────────────

function ProgressChart({
  series,
}: {
  series: ExerciseProgress['series']
}) {
  // Use only points with topKg for the kg chart.
  const points = series.filter((p) => p.topKg != null) as Array<
    ExerciseProgress['series'][number] & { topKg: number }
  >
  if (points.length < 2) {
    return (
      <div className="text-[13.5px] text-[rgba(253,253,254,0.62)]">
        Nog niet genoeg data voor een trend.
      </div>
    )
  }

  const values = points.map((p) => p.topKg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  // Widescreen SVG; responsive width via CSS.
  const w = 320
  const h = 140
  const padX = 4
  const padTop = 8
  const padBottom = 18
  const innerW = w - padX * 2
  const innerH = h - padTop - padBottom
  const step = points.length > 1 ? innerW / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = padX + i * step
    const y = padTop + innerH - ((p.topKg - min) / span) * innerH
    return { x, y, p }
  })
  const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const areaPoints = `${padX},${padTop + innerH} ${polyPoints} ${padX + innerW},${padTop + innerH}`

  const latest = coords[coords.length - 1]
  const first = coords[0]

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-[10px]">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.55)]">
          {min.toFixed(0)} – {max.toFixed(0)} kg
        </div>
        <div className="text-[11px] text-[rgba(253,253,254,0.40)] tracking-[0.04em]">
          {points.length} punten
        </div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full h-[140px] overflow-visible"
      >
        <defs>
          <linearGradient id="lift-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C0FC01" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#C0FC01" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#lift-area)" />
        <polyline
          points={polyPoints}
          fill="none"
          stroke="#C0FC01"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) =>
          c.p.hasPr ? (
            <circle
              key={`pr-${i}`}
              cx={c.x}
              cy={c.y}
              r={3.5}
              fill="#C0FC01"
              stroke="#474B48"
              strokeWidth={1.5}
            />
          ) : null,
        )}
        <circle cx={latest.x} cy={latest.y} r={3} fill="#FDFDFE" />
      </svg>
      <div className="flex items-center justify-between text-[10.5px] text-[rgba(253,253,254,0.40)] tracking-[0.04em] mt-[4px]">
        <span>{first.p.dateLabel}</span>
        <span>{latest.p.dateLabel}</span>
      </div>
    </div>
  )
}

function formatShort(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}
