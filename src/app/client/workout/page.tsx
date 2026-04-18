'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cachedFetch } from '@/lib/fetcher'

// ─── Types ─────────────────────────────────────────────────────────────
interface ClientProgram {
  id: string
  name: string
  current_week: number
  client_id: string
  template_id: string
  duration_weeks?: number
}

interface TemplateDay {
  id: string
  template_id: string
  day_number: number
  name: string
  focus: string
  estimated_duration_min: number
  sort_order: number
  exercise_count?: number
}

interface ProgramResponse {
  program?: ClientProgram
  days?: TemplateDay[]
  workoutsThisWeek?: number
  schedule?: Record<string, string>
  todayDay?: TemplateDay | null
  todayCompleted?: boolean
  weekCompletedDayIds?: string[]
  weekStartIso?: string
  activeSession?: { setsDone: number; totalSets: number } | null
}

// Each week-cell carries everything the renderer needs to draw it + handle taps.
interface WeekCell {
  date: Date
  day: TemplateDay | null
  completed: boolean
  isToday: boolean
  isPast: boolean
  isFuture: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────
const WEEKDAY_SHORT_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
const WEEKDAY_LONG_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const MONTH_SHORT_NL = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

/**
 * Bouw de volledige huidige week (Maandag → Zondag).
 *
 * Waarom volle week i.p.v. "tomorrow+5": Glenn liet clients workouts op andere
 * dagen starten dan gepland. Als je Upper-A op maandag miste en woensdag doet,
 * telt die sessie dankzij de `template_day_id`-match ook voor maandag — maar
 * dan moet je maandag WEL zien in de overview, anders is de retro-afvinking
 * onzichtbaar. Past-days blijven tapbaar zodat je expliciet alsnog kan
 * starten als je iets inhaalt zonder ergens anders langs te hoeven.
 */
function buildWeek(
  schedule: Record<string, string>,
  days: TemplateDay[],
  completedIds: Set<string>,
): WeekCell[] {
  const dayMap = new Map(days.map(d => [d.id, d]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Maandag-start (ISO 8601) — dezelfde conventie als de API weekStart.
  const jsDay = today.getDay() // 0=Sun, 1=Mon...6=Sat
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1
  const monday = new Date(today)
  monday.setDate(monday.getDate() - daysSinceMonday)

  const result: WeekCell[] = []
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + offset)
    const cellJsDay = d.getDay()
    const iso = String(cellJsDay === 0 ? 7 : cellJsDay)
    const templateDayId = schedule[iso]
    const tmpl = templateDayId ? dayMap.get(templateDayId) || null : null
    const completed = !!(tmpl && completedIds.has(tmpl.id))
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
    result.push({
      date: d,
      day: tmpl,
      completed,
      isToday: diff === 0,
      isPast: diff < 0,
      isFuture: diff > 0,
    })
  }
  return result
}

function chipLabelFor(cell: WeekCell): string {
  if (!cell.day) return 'Rust'
  if (cell.completed) return 'Voltooid'
  if (cell.isToday) return 'Vandaag'
  if (cell.isPast) return 'Gemist'
  // Future
  const diff = Math.round(
    (cell.date.getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 86400000,
  )
  if (diff === 1) return 'Morgen'
  return 'Gepland'
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function WorkoutOverviewPage() {
  const router = useRouter()
  const [data, setData] = useState<ProgramResponse>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await cachedFetch('/api/client-program', { maxAge: 30_000 }) as ProgramResponse
        if (res?.program) setData(res)
      } catch (error) {
        console.error('Error loading program:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const {
    program,
    days = [],
    schedule = {},
    todayDay,
    todayCompleted,
    weekCompletedDayIds = [],
    activeSession,
  } = data

  // Compute next-month header for context row
  const monthLabel = useMemo(() => {
    const t = new Date()
    return `${MONTH_SHORT_NL[t.getMonth()]} ${t.getFullYear()}`.toUpperCase()
  }, [])

  const week = useMemo(
    () => (days.length ? buildWeek(schedule, days, new Set(weekCompletedDayIds)) : []),
    [schedule, days, weekCompletedDayIds],
  )

  // Inhaal-kandidaat: eerste past-cell deze week met scheduled day die nog
  // niet voltooid is. Chronologisch = Ma → Zo, dus gewoon find() op volgorde.
  // Surfaced in hero enkel als vandaag rust is (todayDay null); anders wint
  // de today-workout de primaire plek.
  const catchupCell = useMemo(
    () => week.find(c => c.isPast && c.day && !c.completed) || null,
    [week],
  )

  // Loading skeleton
  if (loading) {
    return (
      <div className="pb-28 animate-pulse">
        <div
          className="mb-4 rounded-[24px]"
          style={{ height: 200, background: 'rgba(253,253,254,0.08)' }}
        />
        <div
          className="rounded-[24px]"
          style={{ height: 340, background: 'rgba(253,253,254,0.05)' }}
        />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="pb-28">
        <h1 className="page-title mb-6">Training</h1>
        <div className="py-16 text-center">
          <p style={{ fontSize: 20, fontWeight: 300, color: '#FDFDFE', marginBottom: 8 }}>
            Geen programma
          </p>
          <p style={{ fontSize: 14, color: 'rgba(253,253,254,0.62)' }}>
            Je coach zal binnenkort een trainingsplan opstellen.
          </p>
        </div>
      </div>
    )
  }

  const handleStart = (day: TemplateDay) => {
    router.push(`/client/workout/active?dayId=${day.id}&programId=${program.id}`)
  }

  const totalWeeks = program.duration_weeks || 12
  const dayCountInProgram = days.length || 0
  const todayDayNumber = todayDay?.day_number || 0

  // Start/resume state copy
  let startLabel = 'Starten'
  let startSub = todayDay
    ? `${todayDay.exercise_count ?? '—'} oefeningen · ±${todayDay.estimated_duration_min} min`
    : 'Geen training vandaag'

  if (todayCompleted && todayDay) {
    startLabel = 'Voltooid'
    startSub = 'Goed gedaan'
  } else if (activeSession && activeSession.totalSets > 0) {
    startLabel = 'Hervatten'
    startSub = `Gestart · ${activeSession.setsDone} / ${activeSession.totalSets} sets gedaan`
  }

  return (
    <div className="pb-28">
      {/* ─── Hero · Vandaag (DARK) ─── */}
      <div className="v6-card-dark" style={{ padding: '22px 22px 24px', marginBottom: 6, width: '100%' }}>
        <div className="eyebrow">
          {todayDay && !todayCompleted && <span className="pulse" />}
          {!todayDay && catchupCell && <span className="pulse" />}
          {todayDay
            ? 'Vandaag'
            : catchupCell
              ? `Inhalen · ${WEEKDAY_LONG_NL[catchupCell.date.getDay()]}`
              : 'Rustdag'}
        </div>

        {todayDay ? (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 300,
                letterSpacing: '-0.018em',
                lineHeight: 1.1,
                color: '#FDFDFE',
                margin: '14px 0 4px',
              }}
            >
              {todayDay.name}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'rgba(253,253,254,0.44)',
                letterSpacing: '0.01em',
                marginBottom: 22,
              }}
            >
              {todayDay.exercise_count ?? '—'} oefeningen · ±{todayDay.estimated_duration_min} min
              {dayCountInProgram > 0 && todayDayNumber > 0 && (
                <> · Dag {todayDayNumber} van {dayCountInProgram}</>
              )}
            </div>

            <div className="start-row">
              <div>
                <div className="start-lbl">{startLabel}</div>
                <div className="start-sub">{startSub}</div>
              </div>
              <div className="start-cta">
                <button
                  className="ring"
                  aria-label={startLabel}
                  onClick={() => todayDay && handleStart(todayDay)}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  {todayCompleted ? (
                    <svg viewBox="0 0 24 24">
                      <polyline points="5 12 10 17 20 7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <polygon points="8 5 19 12 8 19 8 5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : catchupCell && catchupCell.day ? (
          // Inhaal-hero: gemiste workout van eerder deze week. Tap play →
          // handleStart(catchupCell.day) → /client/workout/active?dayId=X.
          // Server-side vervult via template_day_id-match de gemiste slot.
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 300,
                letterSpacing: '-0.018em',
                lineHeight: 1.1,
                color: '#FDFDFE',
                margin: '14px 0 4px',
              }}
            >
              {catchupCell.day.name}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'rgba(253,253,254,0.44)',
                letterSpacing: '0.01em',
                marginBottom: 22,
              }}
            >
              {catchupCell.day.exercise_count ?? '—'} oefeningen · ±{catchupCell.day.estimated_duration_min} min
            </div>

            <div className="start-row">
              <div>
                <div className="start-lbl">Inhalen</div>
                <div className="start-sub">Telt voor {WEEKDAY_LONG_NL[catchupCell.date.getDay()]}</div>
              </div>
              <div className="start-cta">
                <button
                  className="ring"
                  aria-label={`${catchupCell.day.name} inhalen`}
                  onClick={() => catchupCell.day && handleStart(catchupCell.day)}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <svg viewBox="0 0 24 24">
                    <polygon points="8 5 19 12 8 19 8 5" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 300,
                letterSpacing: '-0.018em',
                color: '#FDFDFE',
                margin: '14px 0 4px',
              }}
            >
              Rustdag
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'rgba(253,253,254,0.44)',
                letterSpacing: '0.01em',
              }}
            >
              Geen training ingepland voor vandaag
            </div>
          </>
        )}
      </div>

      {/* ─── Context head · Deze week ─── */}
      <div className="context-head">
        <div className="context-l">Deze week</div>
        <div className="context-r">
          {program.name} · Week {program.current_week}/{totalWeeks}
        </div>
      </div>

      {/* ─── Week-card · frosted glass · Ma-Zo incl. past & retroactief ─── */}
      <div className="week-card">
        {week.map((cell, idx) => {
          const isRest = !cell.day
          // "Gemist"-rows krijgen subtiele red-tint via .missed class; past
          // rest-days krijgen .rest (zelfde styling als future rest-days —
          // er valt niks in te halen).
          const rowClass =
            'week-row' +
            (isRest ? ' rest' : '') +
            (cell.isToday ? ' today' : '') +
            (cell.completed ? ' done' : '') +
            (cell.isPast && !cell.completed && cell.day ? ' missed' : '')
          const weekdayLbl = WEEKDAY_SHORT_NL[cell.date.getDay()]
          const dayNum = cell.date.getDate()
          const chip = chipLabelFor(cell)
          // Tap-any-scheduled-day: ook past + missed zijn tapbaar zodat je
          // alsnog kunt starten — de server-side completion logic linkt die
          // sessie via template_day_id aan de gemiste slot.
          const onClick = cell.day ? () => cell.day && handleStart(cell.day) : undefined
          return (
            <button
              key={idx}
              className={rowClass}
              onClick={onClick}
              style={{ cursor: cell.day ? 'pointer' : 'default' }}
              type="button"
              aria-current={cell.isToday ? 'date' : undefined}
            >
              <div className="wr-date">
                <span className="d">{weekdayLbl}</span>
                <span className="n">{dayNum}</span>
              </div>
              <div className="wr-body">
                <div className="wr-name">
                  {cell.day ? cell.day.name : 'Rust · actief herstel'}
                </div>
                <div className="wr-meta">
                  {cell.day ? (
                    <>
                      {cell.day.exercise_count ?? '—'} oefeningen · ±{cell.day.estimated_duration_min} min
                    </>
                  ) : (
                    'Wandeling of mobility'
                  )}
                </div>
              </div>
              <div className="wr-chip">{chip}</div>
            </button>
          )
        })}
        <button className="week-more" type="button">
          Volgende week
          <svg viewBox="0 0 24 24">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
