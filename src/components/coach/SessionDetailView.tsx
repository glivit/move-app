'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SessionDetail, SessionExerciseBlock, SessionSet } from '@/lib/coach-session-detail'

interface Props {
  data: SessionDetail
  coachId: string
}

export function SessionDetailView({ data, coachId }: Props) {
  const router = useRouter()
  const [seen, setSeen] = useState<boolean>(data.coachSeen)
  const [marking, setMarking] = useState(false)
  void coachId

  const hasFeedback =
    !!data.feedbackText ||
    data.moodRating !== null ||
    data.difficultyRating !== null

  async function markAsSeen() {
    if (marking || seen) return
    setMarking(true)
    try {
      const res = await fetch('/api/coach-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.id }),
      })
      if (res.ok) {
        setSeen(true)
        // Force parent pages to reflect new state on next visit
        router.refresh()
      }
    } finally {
      setMarking(false)
    }
  }

  // Sub-line under the template-day title:  "vr 17/4 · 18:12 · 52 min"
  const subParts = [
    data.dateLabelLong,
    data.startTimeLabel,
    data.durationMin ? `${data.durationMin} min` : null,
  ].filter(Boolean)

  return (
    <div className="pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-[18px] pb-[18px] px-0.5">
        <Link
          href={`/coach/clients/${data.clientId}`}
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
        <Link
          href={`/coach/messages/${data.clientId}`}
          className="w-[38px] h-[38px] rounded-full bg-[rgba(253,253,254,0.10)] flex items-center justify-center text-[#FDFDFE]"
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
        </Link>
      </div>

      {/* Identity-compact: avatar + client naam + sessie titel */}
      <div className="flex items-center gap-[14px] px-0.5 pb-1">
        <Link
          href={`/coach/clients/${data.clientId}`}
          className="w-[42px] h-[42px] rounded-full bg-[#5c6361] text-[#FDFDFE] text-[13px] font-semibold tracking-[0.04em] flex items-center justify-center flex-shrink-0 overflow-hidden"
        >
          {data.client.avatarUrl ? (
            <Image
              src={data.client.avatarUrl}
              alt=""
              width={42}
              height={42}
              className="w-full h-full object-cover"
              unoptimized
              loading="lazy"
            />
          ) : (
            data.client.initials
          )}
        </Link>
        <div className="min-w-0">
          <div className="text-[12px] text-[rgba(253,253,254,0.62)] tracking-[0.04em] truncate">
            {data.client.fullName}
          </div>
          <div
            className="text-[26px] font-light tracking-[-0.02em] leading-[1.15] text-[#FDFDFE] truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {data.templateDayName || 'Training'}
          </div>
        </div>
      </div>
      <div className="text-[12px] text-[rgba(253,253,254,0.40)] tracking-[0.04em] mt-[10px] mb-2 px-0.5">
        {subParts.join(' · ')}
      </div>

      {/* Samenvatting */}
      <SectionTitle>Samenvatting</SectionTitle>
      <Card>
        <div className="flex items-baseline justify-between gap-[14px]">
          <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-[rgba(253,253,254,0.62)]">
            Totaal volume
          </span>
          {data.prCount > 0 && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C0FC01]">
              {data.prCount} PR{data.prCount > 1 ? "'s" : ''}
            </span>
          )}
        </div>
        <div className="mt-[14px]">
          <div
            className="text-[32px] font-light tracking-[-0.02em] text-[#FDFDFE] leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {data.totalVolumeKg.toLocaleString('nl-BE')} kg
          </div>
          <div className="text-[12px] text-[rgba(253,253,254,0.62)] mt-1.5">
            {data.completedSets}/{data.totalSets} sets voltooid
            {data.hasPain && ' · ⚠ pijnsignaal'}
          </div>
        </div>

        {/* Compare */}
        {data.compare && (data.compare.deltaVolumePct !== null || data.compare.deltaTopWeightKg !== null) && (
          <div className="mt-[18px] border-t border-[rgba(253,253,254,0.08)] pt-[14px] flex flex-col gap-[10px]">
            {data.compare.deltaVolumePct !== null && (
              <CompareRow
                label="Volume"
                value={`${data.compare.deltaVolumePct > 0 ? '+' : ''}${data.compare.deltaVolumePct}%`}
                dir={data.compare.deltaVolumeLabel}
              />
            )}
            {data.compare.deltaTopWeightKg !== null && (
              <CompareRow
                label="Topset"
                value={`${data.compare.deltaTopWeightKg > 0 ? '+' : ''}${data.compare.deltaTopWeightKg
                  .toFixed(1)
                  .replace('.', ',')} kg`}
                dir={data.compare.deltaTopWeightLabel}
              />
            )}
            <div className="text-[11px] text-[rgba(253,253,254,0.40)] tracking-[0.04em] mt-[2px]">
              vs. vorige sessie · {data.compare.priorDateLabel}
            </div>
          </div>
        )}
      </Card>

      {/* Oefeningen */}
      {data.exercises.length > 0 && (
        <>
          <SectionTitle>Oefeningen</SectionTitle>
          {data.exercises.map((ex, idx) => (
            <ExerciseBlock key={ex.exerciseId || `ex-${idx}`} block={ex} />
          ))}
        </>
      )}

      {/* Feedback */}
      {hasFeedback && (
        <>
          <SectionTitle>Feedback</SectionTitle>
          <Card>
            {data.feedbackText && (
              <p
                className="text-[15px] leading-[1.5] text-[#FDFDFE] m-0 italic"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                &ldquo;{data.feedbackText}&rdquo;
              </p>
            )}

            {(data.moodRating !== null || data.difficultyRating !== null) && (
              <div
                className={`flex gap-6 ${
                  data.feedbackText ? 'mt-[18px] pt-[14px] border-t border-[rgba(253,253,254,0.08)]' : ''
                }`}
              >
                {data.moodRating !== null && (
                  <FeedbackStat label="Gevoel" value={`${data.moodRating}/5`} />
                )}
                {data.difficultyRating !== null && (
                  <FeedbackStat label="Zwaarte" value={`${data.difficultyRating}/5`} />
                )}
              </div>
            )}

            <div
              className={`${
                data.feedbackText || data.moodRating !== null || data.difficultyRating !== null
                  ? 'mt-[18px] pt-[14px] border-t border-[rgba(253,253,254,0.08)]'
                  : ''
              } flex items-center justify-between gap-3`}
            >
              {seen ? (
                <span className="flex items-center gap-2 text-[12px] text-[rgba(253,253,254,0.62)] tracking-[0.04em]">
                  <span className="block w-2 h-2 rounded-full bg-[#C0FC01]" />
                  Gezien
                </span>
              ) : (
                <button
                  type="button"
                  onClick={markAsSeen}
                  disabled={marking}
                  className="flex items-center gap-2 text-[12.5px] font-medium text-[#FDFDFE] tracking-[0.04em] bg-[rgba(253,253,254,0.07)] hover:bg-[rgba(253,253,254,0.14)] rounded-full px-4 py-2 transition-colors disabled:opacity-50"
                >
                  <span className="block w-2 h-2 rounded-full border-[1.5px] border-[#C0FC01]" />
                  {marking ? 'Markeren…' : 'Markeer als gezien'}
                </button>
              )}
              <Link
                href={`/coach/messages/${data.clientId}`}
                className="text-[12.5px] font-medium text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] tracking-[0.04em]"
              >
                Reageer ›
              </Link>
            </div>
          </Card>
        </>
      )}

      {!hasFeedback && (
        <>
          <SectionTitle>Feedback</SectionTitle>
          <Card subtle>
            <p className="text-[13.5px] leading-[1.45] text-[rgba(253,253,254,0.62)] m-0">
              Geen feedback achtergelaten bij deze sessie.
            </p>
          </Card>
        </>
      )}
    </div>
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
  subtle,
}: {
  children: React.ReactNode
  subtle?: boolean
}) {
  return (
    <div
      className={`rounded-[22px] px-[22px] pt-5 pb-[22px] mb-3 ${
        subtle ? 'bg-[rgba(71,75,72,0.45)]' : 'bg-[#474B48]'
      }`}
    >
      {children}
    </div>
  )
}

// ─── Compare row ────────────────────────────────────────────────

function CompareRow({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir: 'up' | 'down' | 'flat' | null
}) {
  const color =
    dir === 'up'
      ? 'text-[#C0FC01]'
      : dir === 'down'
      ? 'text-[#E8A93C]'
      : 'text-[rgba(253,253,254,0.62)]'
  const prefix = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[#FDFDFE] font-medium">{label}</span>
      <span className={`text-[12.5px] ${color}`}>
        {prefix} {value}
      </span>
    </div>
  )
}

// ─── Feedback stat ──────────────────────────────────────────────

function FeedbackStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className="text-[19px] font-normal text-[#FDFDFE] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </div>
      <div className="text-[10.5px] text-[rgba(253,253,254,0.40)] tracking-[0.08em] uppercase">
        {label}
      </div>
    </div>
  )
}

// ─── Exercise block ─────────────────────────────────────────────

function ExerciseBlock({ block }: { block: SessionExerciseBlock }) {
  const workingSets = block.sets.filter((s) => !s.isWarmup)
  const warmupSets = block.sets.filter((s) => s.isWarmup)

  const topLine =
    block.topSetKg != null && block.topSetKg > 0
      ? `Top ${Math.round(block.topSetKg)}kg × ${block.topSetReps || 0}`
      : null

  return (
    <div className="bg-[#474B48] rounded-[22px] px-[22px] pt-[18px] pb-3 mb-3">
      <div className="flex items-baseline justify-between gap-[14px] mb-[6px]">
        <span className="text-[15px] font-medium text-[#FDFDFE] tracking-[-0.005em]">
          {block.name}
        </span>
        {block.isPr && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C0FC01]">
            PR
          </span>
        )}
      </div>
      {(topLine || block.volumeKg > 0) && (
        <div className="text-[12px] text-[rgba(253,253,254,0.62)] mb-[12px]">
          {[topLine, block.volumeKg > 0 ? `${block.volumeKg.toLocaleString('nl-BE')} kg volume` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}

      <div className="mt-[6px]">
        {warmupSets.map((s) => (
          <SetRow key={s.id} set={s} />
        ))}
        {workingSets.map((s) => (
          <SetRow key={s.id} set={s} />
        ))}
      </div>
    </div>
  )
}

// ─── Set row ────────────────────────────────────────────────────

function SetRow({ set }: { set: SessionSet }) {
  const weight = set.weightKg != null ? Math.round(set.weightKg) : null
  const targetLine =
    set.prescribedReps && set.actualReps !== set.prescribedReps
      ? `/ ${set.prescribedReps}`
      : ''

  const repsDisplay =
    set.actualReps != null
      ? `${set.actualReps}${targetLine}`
      : set.prescribedReps != null
      ? `—/${set.prescribedReps}`
      : '—'

  const mainValue =
    weight !== null && weight > 0
      ? `${weight} kg × ${repsDisplay}`
      : set.actualReps != null
      ? `${set.actualReps} reps`
      : '—'

  return (
    <div className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-[10px] border-b border-[rgba(253,253,254,0.06)] last:border-b-0">
      <span
        className={`text-[11px] tracking-[0.08em] uppercase ${
          set.isWarmup
            ? 'text-[rgba(253,253,254,0.40)]'
            : 'text-[rgba(253,253,254,0.62)]'
        }`}
      >
        {set.isWarmup ? 'W' : `#${set.setNumber}`}
      </span>
      <span
        className={`text-[14px] tracking-[-0.005em] ${
          set.isWarmup
            ? 'text-[rgba(253,253,254,0.62)]'
            : set.completed
            ? 'text-[#FDFDFE]'
            : 'text-[rgba(253,253,254,0.40)]'
        }`}
      >
        {mainValue}
      </span>
      <span className="flex items-center gap-[6px] justify-self-end">
        {set.painFlag && (
          <span
            className="text-[11px] text-[#E8A93C] font-medium"
            aria-label="Pijnsignaal"
            title="Pijnsignaal"
          >
            ⚠
          </span>
        )}
        {set.isPr && (
          <span className="block w-2 h-2 rounded-full bg-[#C0FC01]" aria-label="PR" />
        )}
        {!set.completed && !set.isWarmup && (
          <span
            className="block w-2 h-2 rounded-full bg-transparent border-[1.5px] border-[rgba(253,253,254,0.22)]"
            aria-label="Niet voltooid"
          />
        )}
      </span>
    </div>
  )
}
