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
  activeSession?: { setsDone: number; totalSets: number } | null
}

// ─── Constants ─────────────────────────────────────────────────────────
const WEEKDAY_SHORT_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
const MONTH_SHORT_NL = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

/**
 * Compute the next N upcoming days starting from tomorrow.
 * Returns array with date + optional scheduled template day.
 */
function buildUpcoming(
  schedule: Record<string, string>,
  days: TemplateDay[],
  count: number,
): Array<{ date: Date; day: TemplateDay | null }> {
  const dayMap = new Map(days.map(d => [d.id, d]))
  const result: Array<{ date: Date; day: TemplateDay | null }> = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = 1; offset <= count; offset++) {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    const jsDay = d.getDay()
    const iso = String(jsDay === 0 ? 7 : jsDay)
    const templateDayId = schedule[iso]
    const tmpl = templateDayId ? dayMap.get(templateDayId) || null : null
    result.push({ date: d, day: tmpl })
  }
  return result
}

function chipLabelFor(date: Date, day: TemplateDay | null): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (!day) return 'Rust'
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

  const { program, days = [], schedule = {}, todayDay, todayCompleted, activeSession } = data

  // Compute next-month header for context row
  const monthLabel = useMemo(() => {
    const t = new Date()
    return `${MONTH_SHORT_NL[t.getMonth()]} ${t.getFullYear()}`.toUpperCase()
  }, [])

  const upcoming = useMemo(
    () => (days.length ? buildUpcoming(schedule, days, 5) : []),
    [schedule, days],
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
          {todayDay ? 'Vandaag' : 'Rustdag'}
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

      {/* ─── Context head · Komende ─── */}
      <div className="context-head">
        <div className="context-l">Komende</div>
        <div className="context-r">
          {program.name} · Week {program.current_week}/{totalWeeks}
        </div>
      </div>

      {/* ─── Week-card · frosted glass ─── */}
      <div className="week-card">
        {upcoming.map(({ date, day }, idx) => {
          const isRest = !day
          const isPeek = idx === upcoming.length - 1
          const rowClass =
            'week-row' +
            (isRest ? ' rest' : '') +
            (isPeek && isRest ? ' peek' : '')
          const weekdayLbl = WEEKDAY_SHORT_NL[date.getDay()]
          const dayNum = date.getDate()
          const chip = chipLabelFor(date, day)
          const onClick = day ? () => handleStart(day) : undefined
          return (
            <button
              key={idx}
              className={rowClass}
              onClick={onClick}
              style={{ cursor: day ? 'pointer' : 'default' }}
              type="button"
            >
              <div className="wr-date">
                <span className="d">{weekdayLbl}</span>
                <span className="n">{dayNum}</span>
              </div>
              <div className="wr-body">
                <div className="wr-name">
                  {day ? day.name : 'Rust · actief herstel'}
                </div>
                <div className="wr-meta">
                  {day ? (
                    <>
                      {day.exercise_count ?? '—'} oefeningen · ±{day.estimated_duration_min} min
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
