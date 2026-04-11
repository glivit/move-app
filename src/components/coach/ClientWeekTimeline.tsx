'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Flame,
  MessageCircle,
  Dumbbell,
  UtensilsCrossed,
  ChevronRight,
  Send,
  X,
  Trophy,
  Clock,
  ChevronLeft,
  MoreHorizontal,
  Mic,
  Square,
  Trash2,
} from 'lucide-react'
import type { ClientWeekTimeline, TimelineDay, DaySession } from '@/lib/coach-client-week-data'
import { SwipeableRow } from './SwipeableRow'
import { isSnoozed, snooze, unsnooze, snoozeKey } from '@/lib/coach-snooze'

interface Props {
  data: ClientWeekTimeline
  weekOffset: number
}

export function ClientWeekTimelineView({ data, weekOffset }: Props) {
  const [activeTab, setActiveTab] = useState<'week' | 'chat'>('week')
  const [composeType, setComposeType] = useState<null | { kind: 'general'; sessionId?: undefined } | { kind: 'session'; sessionId: string; session: DaySession; day: TimelineDay }>(null)
  const [messages, setMessages] = useState(data.recentMessages)

  // Triage state: session IDs that have been locally marked seen / snoozed.
  const [seenSessions, setSeenSessions] = useState<Set<string>>(new Set())
  const [triageTick, setTriageTick] = useState(0)
  const [toast, setToast] = useState<null | {
    kind: 'seen' | 'snoozed'
    sessionId: string
    sessionName: string
  }>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // week label
  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'Deze week'
    if (weekOffset === -1) return 'Vorige week'
    return `${Math.abs(weekOffset)} weken terug`
  }, [weekOffset])

  const handleMarkSessionSeen = async (session: DaySession) => {
    setSeenSessions((prev) => new Set(prev).add(session.id))
    setToast({
      kind: 'seen',
      sessionId: session.id,
      sessionName: session.templateDayName || 'Training',
    })
    try {
      await fetch('/api/coach-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
    } catch (err) {
      console.error('Mark-seen failed:', err)
    }
  }

  const handleSnoozeSession = (session: DaySession) => {
    snooze(snoozeKey.session(session.id))
    setTriageTick((t) => t + 1)
    setToast({
      kind: 'snoozed',
      sessionId: session.id,
      sessionName: session.templateDayName || 'Training',
    })
  }

  const handleUndoTriage = () => {
    if (!toast) return
    if (toast.kind === 'seen') {
      setSeenSessions((prev) => {
        const next = new Set(prev)
        next.delete(toast.sessionId)
        return next
      })
    } else {
      unsnooze(snoozeKey.session(toast.sessionId))
      setTriageTick((t) => t + 1)
    }
    setToast(null)
  }

  return (
    <div className="pb-24 lg:pb-10 -mt-2">
      {/* Sticky header bar */}
      <div className="sticky top-[60px] lg:top-0 z-20 -mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 bg-[#EEEBE3]/95 backdrop-blur-sm py-3 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/coach"
            className="w-9 h-9 rounded-full bg-white border border-[#E8E4DC] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft size={16} strokeWidth={2} className="text-[#1A1917]" />
          </Link>

          <div className="w-10 h-10 rounded-full bg-[#F0EDE7] flex items-center justify-center text-[12px] font-semibold text-[#6B6862] flex-shrink-0 overflow-hidden">
            {data.avatarUrl ? (
              <Image
                src={data.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
                loading="lazy"
              />
            ) : (
              data.initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[#1A1917] truncate leading-tight">
              {data.fullName}
            </p>
            <p className="text-[11px] text-[#A09D96] truncate">{weekLabel}</p>
          </div>

          <Link
            href={`/coach/clients/${data.clientId}`}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E4DC] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            title="Volledig profiel"
          >
            <MoreHorizontal size={16} strokeWidth={2} className="text-[#6B6862]" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-[#EDE9E0] rounded-xl p-1">
        <button
          onClick={() => setActiveTab('week')}
          className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
            activeTab === 'week' ? 'bg-white text-[#1A1917] shadow-sm' : 'text-[#6B6862]'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chat' ? 'bg-white text-[#1A1917] shadow-sm' : 'text-[#6B6862]'
          }`}
        >
          Chat
          {messages.filter((m) => !m.senderIsCoach).length > 0 && (
            <span className="w-[6px] h-[6px] bg-[#D46A3A] rounded-full" />
          )}
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/coach/clients/${data.clientId}/week?offset=${weekOffset - 1}`}
          className="flex items-center gap-1 text-[12px] font-medium text-[#6B6862] hover:text-[#1A1917] active:scale-95 transition-transform"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          Vorige
        </Link>
        <span className="text-[12px] font-semibold text-[#1A1917] tabular-nums">
          {new Date(data.weekStartIso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} —{' '}
          {new Date(data.weekEndIso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
        </span>
        {weekOffset < 0 ? (
          <Link
            href={`/coach/clients/${data.clientId}/week?offset=${weekOffset + 1}`}
            className="flex items-center gap-1 text-[12px] font-medium text-[#6B6862] hover:text-[#1A1917] active:scale-95 transition-transform"
          >
            Volgende
            <ChevronRight size={14} strokeWidth={2} />
          </Link>
        ) : (
          <span className="w-[70px]" />
        )}
      </div>

      {activeTab === 'week' && (
        <>
          {/* Summary strip */}
          <SummaryStrip data={data} />

          {/* Timeline */}
          <div className="space-y-2 mt-5">
            {data.days.map((day) => {
              const session = day.sessions[0]
              const locallySeen = session ? seenSessions.has(session.id) : false
              const locallySnoozed = session
                ? isSnoozed(snoozeKey.session(session.id))
                : false

              // Only sessions that are worth triaging (a completed workout with
              // feedback or PRs or pain) get swipe gestures. Upcoming / missed /
              // rest days render as plain rows.
              const triageable =
                !!session &&
                (session.feedbackText ||
                  session.prCount > 0 ||
                  session.hasPain ||
                  !session.coachSeen)
              // Reference triageTick so re-renders pick up snooze changes
              void triageTick

              const row = (
                <TimelineDayRow
                  day={day}
                  clientId={data.clientId}
                  onMessageMissed={() => setComposeType({ kind: 'general' })}
                  onMessageSession={(s) =>
                    setComposeType({ kind: 'session', sessionId: s.id, session: s, day })
                  }
                />
              )

              if (locallySeen || locallySnoozed) return null

              if (triageable && session) {
                return (
                  <SwipeableRow
                    key={day.dayNumber}
                    onSwipeRight={() => handleMarkSessionSeen(session)}
                    onSwipeLeft={() => handleSnoozeSession(session)}
                    rightLabel="Gezien"
                    leftLabel="Later"
                  >
                    {row}
                  </SwipeableRow>
                )
              }

              return <div key={day.dayNumber}>{row}</div>
            })}
          </div>

          {/* Floating general-message button */}
          <button
            onClick={() => setComposeType({ kind: 'general' })}
            className="fixed right-5 bottom-24 lg:bottom-10 w-14 h-14 rounded-full bg-[#1A1917] text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform z-30"
            aria-label="Stuur bericht"
          >
            <MessageCircle size={20} strokeWidth={2} />
          </button>
        </>
      )}

      {/* Triage toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-40 animate-toast-in">
          <div className="flex items-center gap-3 bg-[#1A1917] text-white rounded-full pl-4 pr-2 py-2 shadow-xl">
            <span className="text-[13px]">
              {toast.kind === 'seen' ? (
                <>
                  <span className="font-semibold">{toast.sessionName}</span> gezien
                </>
              ) : (
                <>
                  <span className="font-semibold">{toast.sessionName}</span> tot morgen verborgen
                </>
              )}
            </span>
            <button
              onClick={handleUndoTriage}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
            >
              Ongedaan
            </button>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <ChatPanel
          messages={messages}
          firstName={data.firstName}
          onRefresh={async () => {
            // optional: refresh from server
          }}
          onCompose={() => setComposeType({ kind: 'general' })}
        />
      )}

      {composeType && (
        <QuickComposeSheet
          type={composeType.kind}
          client={data}
          session={composeType.kind === 'session' ? composeType.session : undefined}
          day={composeType.kind === 'session' ? composeType.day : undefined}
          onClose={() => setComposeType(null)}
          onSent={(sent) => {
            setMessages((prev) => [
              ...prev,
              {
                id: `tmp-${Date.now()}`,
                senderIsCoach: true,
                content: sent.content,
                messageType: sent.messageType,
                fileUrl: sent.fileUrl,
                createdAt: new Date().toISOString(),
              },
            ])
            setComposeType(null)
          }}
        />
      )}

      <style jsx>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-toast-in { animation: toast-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1); }
      `}</style>
    </div>
  )
}

// ─── Summary Strip ──────────────────────────────────────

function SummaryStrip({ data }: { data: ClientWeekTimeline }) {
  const { plannedCount, doneCount, missedCount, totalVolumeKg, prCountWeek, needingFeedback } =
    data.summary

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DC] p-4 grid grid-cols-4 gap-2 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#A09D96] font-semibold mb-1">Trainingen</p>
        <p className="text-[17px] font-bold text-[#1A1917] tabular-nums">
          {doneCount}
          <span className="text-[11px] text-[#A09D96] font-medium">/{plannedCount}</span>
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#A09D96] font-semibold mb-1">Gemist</p>
        <p
          className={`text-[17px] font-bold tabular-nums ${
            missedCount > 0 ? 'text-[#FF3B30]' : 'text-[#1A1917]'
          }`}
        >
          {missedCount}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#A09D96] font-semibold mb-1">Volume</p>
        <p className="text-[17px] font-bold text-[#1A1917] tabular-nums">
          {totalVolumeKg >= 1000
            ? `${(totalVolumeKg / 1000).toFixed(1)}t`
            : totalVolumeKg > 0
            ? `${totalVolumeKg}`
            : '—'}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#A09D96] font-semibold mb-1">PR&apos;s</p>
        <p className="text-[17px] font-bold text-[#FF9500] tabular-nums flex items-center justify-center gap-1">
          {prCountWeek}
          {prCountWeek > 0 && <Trophy size={12} strokeWidth={2} />}
        </p>
      </div>
      {needingFeedback > 0 && (
        <div className="col-span-4 -mx-4 -mb-4 mt-3 px-4 py-2.5 bg-[#FFF8F0] border-t border-[#FFE8CC] rounded-b-2xl flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#C47D15]" strokeWidth={2} />
          <span className="text-[12px] font-semibold text-[#C47D15]">
            {needingFeedback} training{needingFeedback > 1 ? 'en' : ''} wacht{needingFeedback > 1 ? 'en' : ''} op feedback
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Timeline Day Row ───────────────────────────────────

function TimelineDayRow({
  day,
  clientId,
  onMessageMissed,
  onMessageSession,
}: {
  day: TimelineDay
  clientId: string
  onMessageMissed: () => void
  onMessageSession: (session: DaySession) => void
}) {
  const isRestPure = day.state === 'rest' && day.sessions.length === 0 && !day.nutrition
  const session = day.sessions[0]

  // Left rail color
  const railColor =
    day.state === 'done_planned' || day.state === 'done_moved' || day.state === 'done_bonus'
      ? '#1A1917'
      : day.state === 'missed'
      ? '#FF3B30'
      : day.state === 'today_open'
      ? '#FFB800'
      : '#E8E4DC'

  // Icon in rail
  const railIcon =
    day.state === 'done_planned' || day.state === 'done_moved' ? (
      <CheckCircle2 size={14} strokeWidth={2.5} className="text-white" />
    ) : day.state === 'done_bonus' ? (
      <Flame size={14} strokeWidth={2.5} className="text-white" />
    ) : day.state === 'missed' ? (
      <X size={14} strokeWidth={2.5} className="text-white" />
    ) : day.state === 'today_open' ? (
      <Clock size={14} strokeWidth={2.5} className="text-white" />
    ) : null

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all ${
        day.isToday
          ? 'bg-white border-[#D46A3A]/30 shadow-[0_0_0_3px_rgba(212,106,58,0.08)]'
          : day.state === 'missed'
          ? 'bg-[#FFFAFA] border-[#FFD5D1]'
          : isRestPure
          ? 'bg-[#F9F7F2] border-[#F0EDE7]'
          : 'bg-white border-[#E8E4DC]'
      }`}
    >
      {/* Day header */}
      <div className="flex items-stretch">
        {/* Left rail */}
        <div
          className="w-[52px] flex-shrink-0 flex flex-col items-center justify-center py-3 border-r border-[#F0EDE7]"
          style={{ backgroundColor: isRestPure ? '#F9F7F2' : 'transparent' }}
        >
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${
              day.isToday ? 'text-[#D46A3A]' : 'text-[#A09D96]'
            }`}
          >
            {day.dayLabelShort}
          </span>
          <span
            className={`text-[18px] font-bold leading-none tabular-nums ${
              day.isToday ? 'text-[#D46A3A]' : 'text-[#1A1917]'
            }`}
          >
            {new Date(day.dateIso).getDate()}
          </span>
          {railIcon && (
            <div
              className="mt-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: railColor }}
            >
              {railIcon}
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 px-4 py-3">
          {/* Workout row */}
          {session ? (
            <SessionCard
              session={session}
              clientId={clientId}
              movedFrom={day.movedFromDayName}
              state={day.state}
              onFeedback={() => onMessageSession(session)}
            />
          ) : day.state === 'missed' ? (
            <MissedCard
              plannedName={day.plannedDayName || 'Training'}
              onMessage={onMessageMissed}
            />
          ) : day.state === 'today_open' ? (
            <TodayOpenCard plannedName={day.plannedDayName || 'Training'} />
          ) : day.state === 'upcoming' ? (
            <UpcomingCard plannedName={day.plannedDayName || 'Training'} />
          ) : day.state === 'rest' && day.plannedDayName ? (
            <p className="text-[12px] text-[#A09D96] italic">
              {day.plannedDayName} — verplaatst naar andere dag
            </p>
          ) : (
            <p className="text-[12px] text-[#C5C2BC] italic">Rustdag</p>
          )}

          {/* Nutrition mini row */}
          {day.nutrition && (day.nutrition.caloriesLogged > 0 || day.nutrition.caloriesTarget > 0) && (
            <div className="mt-2.5 pt-2.5 border-t border-[#F0EDE7] flex items-center gap-2">
              <UtensilsCrossed
                size={12}
                className={day.nutrition.caloriesLogged > 0 ? 'text-[#D46A3A]' : 'text-[#D5D0C8]'}
                strokeWidth={1.5}
              />
              {day.nutrition.caloriesTarget > 0 ? (
                <>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 h-1 bg-[#F0EDE7] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${day.nutritionPct}%`,
                          backgroundColor:
                            day.nutritionPct >= 80
                              ? '#34C759'
                              : day.nutritionPct > 0
                              ? '#D46A3A'
                              : '#E8E4DC',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-[#6B6862] flex-shrink-0">
                      {day.nutrition.caloriesLogged}/{day.nutrition.caloriesTarget} kcal
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-[11px] text-[#A09D96]">
                  {day.nutrition.caloriesLogged > 0
                    ? `${day.nutrition.caloriesLogged} kcal gelogd`
                    : 'Niet gelogd'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Session Card ───────────────────────────────────────

function SessionCard({
  session,
  clientId,
  movedFrom,
  state,
  onFeedback,
}: {
  session: DaySession
  clientId: string
  movedFrom: string | null
  state: string
  onFeedback: () => void
}) {
  const needsFeedback = session.feedbackText && !session.coachSeen
  const sessionName = session.templateDayName || 'Training'

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[#1A1917]">{sessionName}</p>
            {state === 'done_moved' && movedFrom && (
              <span className="text-[10px] font-semibold text-[#FFB800] bg-[#FFF8E8] px-1.5 py-0.5 rounded">
                van {movedFrom}
              </span>
            )}
            {state === 'done_bonus' && (
              <span className="text-[10px] font-semibold text-[#34C759] bg-[#E6F7EA] px-1.5 py-0.5 rounded">
                BONUS
              </span>
            )}
            {session.prCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#FF9500] bg-[#FFF3E0] px-1.5 py-0.5 rounded">
                <Trophy size={9} strokeWidth={2.5} />
                {session.prCount} PR
              </span>
            )}
            {session.hasPain && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#FF3B30] bg-[#FFE8E5] px-1.5 py-0.5 rounded">
                <AlertTriangle size={9} strokeWidth={2.5} />
                Pijn
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#A09D96] tabular-nums">
            {session.durationMin != null && <span>{session.durationMin}&thinsp;min</span>}
            {session.totalSets > 0 && (
              <>
                <span className="text-[#D5D0C8]">•</span>
                <span>
                  {session.completedSets}/{session.totalSets} sets
                </span>
              </>
            )}
            {session.totalVolumeKg > 0 && (
              <>
                <span className="text-[#D5D0C8]">•</span>
                <span>{session.totalVolumeKg}&thinsp;kg</span>
              </>
            )}
            {session.difficultyRating && (
              <>
                <span className="text-[#D5D0C8]">•</span>
                <span>{'★'.repeat(session.difficultyRating)}</span>
              </>
            )}
          </div>
          {session.feedbackText && (
            <div
              className={`mt-2 px-2.5 py-1.5 rounded-lg text-[11px] leading-snug line-clamp-2 ${
                needsFeedback
                  ? 'bg-[#FFF8F0] text-[#1A1917] border border-[#FFE8CC]'
                  : 'bg-[#F5F2EC] text-[#6B6862]'
              }`}
            >
              &ldquo;{session.feedbackText}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-2.5">
        <Link
          href={`/coach/clients/${clientId}/workout/${session.id}`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F2EC] text-[11px] font-semibold text-[#6B6862] active:scale-95 transition-transform"
        >
          <Dumbbell size={11} strokeWidth={2} />
          Bekijk
          <ChevronRight size={11} strokeWidth={2} />
        </Link>
        <button
          onClick={onFeedback}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold active:scale-95 transition-transform ${
            needsFeedback
              ? 'bg-[#1A1917] text-white'
              : 'bg-[#F5F2EC] text-[#6B6862]'
          }`}
        >
          <MessageCircle size={11} strokeWidth={2} />
          {needsFeedback ? 'Reageer' : 'Feedback'}
        </button>
      </div>
    </div>
  )
}

// ─── Other Day Cards ────────────────────────────────────

function MissedCard({ plannedName, onMessage }: { plannedName: string; onMessage: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-[14px] font-semibold text-[#FF3B30]">{plannedName}</p>
        <span className="text-[10px] font-semibold text-[#FF3B30] bg-[#FFE8E5] px-1.5 py-0.5 rounded uppercase tracking-wider">
          Gemist
        </span>
      </div>
      <p className="text-[11px] text-[#A09D96] mt-1">Training niet voltooid op de geplande dag</p>
      <button
        onClick={onMessage}
        className="mt-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFE8E5] text-[11px] font-semibold text-[#FF3B30] active:scale-95 transition-transform"
      >
        <MessageCircle size={11} strokeWidth={2} />
        Stuur bericht
      </button>
    </div>
  )
}

function TodayOpenCard({ plannedName }: { plannedName: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-[14px] font-semibold text-[#1A1917]">{plannedName}</p>
        <span className="text-[10px] font-semibold text-[#C47D15] bg-[#FFF3E0] px-1.5 py-0.5 rounded uppercase tracking-wider">
          Vandaag
        </span>
      </div>
      <p className="text-[11px] text-[#A09D96] mt-1">Nog niet gestart vandaag</p>
    </div>
  )
}

function UpcomingCard({ plannedName }: { plannedName: string }) {
  return (
    <div>
      <p className="text-[14px] font-medium text-[#6B6862]">{plannedName}</p>
      <p className="text-[11px] text-[#C5C2BC] mt-1">Gepland</p>
    </div>
  )
}

// ─── Chat Panel ─────────────────────────────────────────

function ChatPanel({
  messages,
  firstName,
  onCompose,
}: {
  messages: ClientWeekTimeline['recentMessages']
  firstName: string
  onRefresh: () => void
  onCompose: () => void
}) {
  if (messages.length === 0) {
    return (
      <div className="bg-white border border-[#E8E4DC] rounded-2xl p-10 text-center">
        <div className="w-11 h-11 rounded-full bg-[#F5F2EC] flex items-center justify-center mx-auto mb-3">
          <MessageCircle size={18} className="text-[#A09D96]" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium text-[#1A1917]">Nog geen berichten</p>
        <p className="text-[12px] text-[#A09D96] mt-1">Start een gesprek met {firstName}</p>
        <button
          onClick={onCompose}
          className="mt-4 px-4 py-2 rounded-lg bg-[#1A1917] text-white text-[12px] font-semibold active:scale-95 transition-transform"
        >
          Stuur eerste bericht
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {messages.map((m) => {
        const isVoice = m.messageType === 'voice' && m.fileUrl
        const isImage = m.messageType === 'image' && m.fileUrl
        return (
          <div
            key={m.id}
            className={`max-w-[85%] ${m.senderIsCoach ? 'ml-auto' : 'mr-auto'}`}
          >
            <div
              className={`px-3.5 py-2.5 rounded-2xl ${
                m.senderIsCoach
                  ? 'bg-[#1A1917] text-white rounded-br-md'
                  : 'bg-white border border-[#E8E4DC] text-[#1A1917] rounded-bl-md'
              }`}
            >
              {isVoice ? (
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Mic
                    size={14}
                    strokeWidth={2}
                    className={m.senderIsCoach ? 'text-white/70' : 'text-[#D46A3A]'}
                  />
                  <audio
                    src={m.fileUrl || undefined}
                    controls
                    className="h-8 flex-1"
                    style={{ maxWidth: 220 }}
                  />
                </div>
              ) : isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.fileUrl || ''}
                  alt=""
                  className="rounded-lg max-w-[220px] h-auto"
                  loading="lazy"
                />
              ) : (
                <p className="text-[13px] leading-snug whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
            <p
              className={`text-[10px] text-[#A09D96] mt-1 px-2 ${
                m.senderIsCoach ? 'text-right' : 'text-left'
              }`}
            >
              {new Date(m.createdAt).toLocaleString('nl-BE', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )
      })}
      <button
        onClick={onCompose}
        className="fixed right-5 bottom-24 lg:bottom-10 w-14 h-14 rounded-full bg-[#1A1917] text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <Send size={18} strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Compose Sheet ──────────────────────────────────────

function QuickComposeSheet({
  type,
  client,
  session,
  day,
  onClose,
  onSent,
}: {
  type: 'general' | 'session'
  client: ClientWeekTimeline
  session?: DaySession
  day?: TimelineDay
  onClose: () => void
  onSent: (sent: { content: string; messageType: string; fileUrl: string | null }) => void
}) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const firstName = client.firstName

  // ─── Voice recording state ──────────────────
  const [recState, setRecState] = useState<'idle' | 'recording' | 'preview' | 'uploading'>('idle')
  const [recSeconds, setRecSeconds] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const suggestions: string[] = []
  if (type === 'session' && session) {
    const name = session.templateDayName || 'je training'
    if (session.prCount > 0) {
      suggestions.push(`${firstName}, killer sessie — ${session.prCount} PR${session.prCount > 1 ? "'s" : ''} op ${name}! 🔥`)
    }
    if (session.hasPain) {
      suggestions.push(
        `${firstName}, ik zag dat je pijn hebt gemeld tijdens ${name}. Hoe voelt het nu? Waar zit het?`
      )
    }
    if (session.feedbackText) {
      suggestions.push(`Dankje voor de feedback op ${name}. ${session.difficultyRating && session.difficultyRating >= 4 ? 'We passen de intensiteit volgende keer aan.' : 'Laat me weten als er iets is.'}`)
    }
    suggestions.push(`Sterk gedaan op ${name}, ${firstName} 💪`)
    suggestions.push(`${firstName}, volgende keer gaan we zwaarder op ${name}. Je bent er klaar voor.`)
  } else {
    // General
    if (day && day.state === 'missed') {
      const planned = day.plannedDayName || 'je training'
      suggestions.push(
        `${firstName}, ik zag dat ${planned} gisteren niet gelukt is. Alles oké? Kunnen we het inhalen?`
      )
    }
    if (client.summary.missedCount > 0) {
      suggestions.push(
        `Hey ${firstName}, ik zie dat er ${client.summary.missedCount} training${
          client.summary.missedCount > 1 ? 'en' : ''
        } zijn blijven liggen deze week. Alles oké? Laat me weten wat er speelt.`
      )
    }
    if (client.summary.doneCount === client.summary.plannedCount && client.summary.plannedCount > 0) {
      suggestions.push(`${firstName}, wat een top week! Alle trainingen in ✓. Hoe voel je je?`)
    }
    suggestions.push(`Hey ${firstName}, hoe gaat het deze week? Alles oké?`)
  }

  // ─── Voice recording handlers ──────────────
  async function startRecording() {
    setRecError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setPreviewBlob(blob)
        setPreviewUrl(url)
        setRecState('preview')
      }

      mediaRecorder.start()
      setRecState('recording')
      setRecSeconds(0)
      tickRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000)
    } catch (err) {
      console.error('Microfoon niet beschikbaar:', err)
      setRecError('Microfoon niet beschikbaar. Geef toegang in je browser.')
    }
  }

  function stopRecording() {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    const mr = mediaRecorderRef.current
    if (mr && mr.state === 'recording') {
      mr.stop()
    }
  }

  function discardRecording() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewBlob(null)
    setPreviewUrl(null)
    setRecSeconds(0)
    setRecState('idle')
    audioChunksRef.current = []
  }

  async function sendVoice() {
    if (!previewBlob || recState === 'uploading') return
    setRecState('uploading')
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setRecState('preview')
        return
      }

      // Upload audio to message-attachments via /api/upload
      const ext = previewBlob.type.includes('webm') ? 'webm' : 'mp4'
      const audioFile = new File([previewBlob], `voice-${Date.now()}.${ext}`, {
        type: previewBlob.type,
      })
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('bucket', 'message-attachments')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Upload mislukt')
      }

      // Build a contextual caption so the client also sees which workout
      // this voice note belongs to (especially useful for session feedback).
      const caption =
        type === 'session' && session
          ? `🎤 Spraakbericht over ${session.templateDayName || 'je training'}`
          : '🎤 Spraakbericht'

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: client.clientId,
        content: caption,
        message_type: 'voice',
        file_url: uploadData.url,
      })
      if (error) throw error

      if (type === 'session' && session) {
        fetch('/api/coach-seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        }).catch(() => {})
      }

      onSent({ content: caption, messageType: 'voice', fileUrl: uploadData.url })
    } catch (err) {
      console.error('Voice send failed:', err)
      setRecError('Versturen mislukt. Probeer opnieuw.')
      setRecState('preview')
    }
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
        receiver_id: client.clientId,
        content: message.trim(),
        message_type: 'text',
      })

      // Mark session as coach_seen if this was session-specific feedback
      if (type === 'session' && session) {
        fetch('/api/coach-seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        }).catch(() => {})
      }

      if (!error) {
        onSent({ content: message.trim(), messageType: 'text', fileUrl: null })
      } else {
        setSending(false)
      }
    } catch {
      setSending(false)
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl p-5 pb-8 lg:pb-5 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A09D96]">
              {type === 'session' ? 'Reactie op training' : 'Bericht aan'}
            </p>
            <p className="text-[17px] font-semibold text-[#1A1917] truncate">{client.fullName}</p>
            {type === 'session' && session && (
              <p className="text-[12px] text-[#A09D96] truncate">
                {session.templateDayName || 'Training'} · {new Date(session.startedAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] flex items-center justify-center active:scale-95 flex-shrink-0"
          >
            <X size={16} className="text-[#6B6862]" />
          </button>
        </div>

        {/* Text-mode UI — hidden while recording or previewing a voice note */}
        {recState === 'idle' && (
          <>
            <div className="space-y-2 mb-4">
              {suggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(s)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#F9F7F2] border border-[#F0EDE7] text-[13px] text-[#1A1917] leading-snug active:scale-[0.99] transition-transform"
                >
                  {s}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Typ een bericht..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#E8E4DC] text-[14px] text-[#1A1917] placeholder-[#A09D96] focus:outline-none focus:ring-2 focus:ring-[#D46A3A]/25 focus:border-transparent resize-none mb-3"
            />
          </>
        )}

        {/* Recording indicator */}
        {recState === 'recording' && (
          <div className="mb-4 rounded-2xl bg-[#FFF4F0] border border-[#FFD5CC] px-4 py-5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] animate-pulse" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#FF3B30]">
                Opnemen
              </span>
            </div>
            <p className="text-[28px] font-bold tabular-nums text-[#1A1917] mb-4">
              {formatTime(recSeconds)}
            </p>
            <button
              onClick={stopRecording}
              className="w-14 h-14 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              aria-label="Stop opname"
            >
              <Square size={18} strokeWidth={2.5} fill="white" />
            </button>
            <p className="text-[11px] text-[#A09D96] mt-3">Tik om te stoppen</p>
          </div>
        )}

        {/* Preview before sending */}
        {recState === 'preview' && previewUrl && (
          <div className="mb-4 rounded-2xl bg-[#F9F7F2] border border-[#F0EDE7] px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Mic size={14} className="text-[#D46A3A]" strokeWidth={2} />
              <span className="text-[12px] font-semibold text-[#1A1917]">
                Spraakbericht · {formatTime(recSeconds)}
              </span>
              <button
                onClick={discardRecording}
                className="ml-auto w-7 h-7 rounded-full bg-white border border-[#E8E4DC] flex items-center justify-center active:scale-95"
                aria-label="Verwijder opname"
              >
                <Trash2 size={12} className="text-[#6B6862]" />
              </button>
            </div>
            <audio src={previewUrl} controls className="w-full h-10" />
          </div>
        )}

        {/* Uploading state */}
        {recState === 'uploading' && (
          <div className="mb-4 rounded-2xl bg-[#F9F7F2] border border-[#F0EDE7] px-4 py-5 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#1A1917] border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] font-medium text-[#1A1917]">Spraakbericht versturen...</span>
          </div>
        )}

        {recError && (
          <p className="text-[12px] text-[#FF3B30] mb-3">{recError}</p>
        )}

        {/* Action row: Send text OR Record voice OR Send voice */}
        {recState === 'idle' ? (
          <div className="flex items-stretch gap-2">
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="flex-1 py-3.5 rounded-xl bg-[#1A1917] text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
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
            <button
              onClick={startRecording}
              disabled={sending}
              className="w-[52px] rounded-xl bg-[#D46A3A] text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
              aria-label="Spraakbericht opnemen"
              title="Spraakbericht opnemen"
            >
              <Mic size={18} strokeWidth={2} />
            </button>
          </div>
        ) : recState === 'preview' ? (
          <div className="flex items-stretch gap-2">
            <button
              onClick={discardRecording}
              className="flex-1 py-3.5 rounded-xl bg-white border border-[#E8E4DC] text-[#6B6862] text-[14px] font-semibold active:scale-[0.99] transition-transform"
            >
              Opnieuw opnemen
            </button>
            <button
              onClick={sendVoice}
              className="flex-1 py-3.5 rounded-xl bg-[#1A1917] text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            >
              <Send size={15} strokeWidth={2} />
              Verstuur spraakbericht
            </button>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in { animation: fade-in 200ms ease-out; }
        .animate-slide-up { animation: slide-up 280ms cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-toast-in { animation: toast-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1); }
      `}</style>
    </div>
  )
}
