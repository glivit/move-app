'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ChevronLeft, FileText, UtensilsCrossed, ChevronDown, Check, Moon,
} from 'lucide-react'

interface Meal {
  name: string
  type: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description?: string
}

interface Day {
  name: string
  meals: Meal[]
}

interface MealPlanContent {
  daily_calories: number
  daily_macros: {
    protein: number
    carbs: number
    fat: number
  }
  days: Day[]
}

interface MealPlan {
  id: string
  title: string
  content: MealPlanContent | null
  pdf_url: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
}

const DUTCH_DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function MealRow({ meal }: { meal: Meal }) {
  const [open, setOpen] = useState(false)

  const ingredients = meal.description
    ? meal.description
        .split(/[,\n]/)
        .map((i) => i.trim())
        .filter(Boolean)
    : []

  return (
    <div style={{ padding: '14px 0' }}>
      <button
        onClick={() => ingredients.length > 0 && setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
          background: 'transparent', border: 'none', padding: 0,
          cursor: ingredients.length > 0 ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent',
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, color: '#FDFDFE',
            margin: 0, letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {meal.name}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.62)', fontVariantNumeric: 'tabular-nums' }}>
              P {Math.round(meal.protein)}g
            </span>
            <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.32)' }}>·</span>
            <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.62)', fontVariantNumeric: 'tabular-nums' }}>
              K {Math.round(meal.carbs)}g
            </span>
            <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.32)' }}>·</span>
            <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.62)', fontVariantNumeric: 'tabular-nums' }}>
              V {Math.round(meal.fat)}g
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: '#FDFDFE',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.round(meal.calories)}
            <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.52)', marginLeft: 2 }}>kcal</span>
          </span>
          {ingredients.length > 0 && (
            <ChevronDown
              strokeWidth={1.5}
              size={16}
              style={{
                color: 'rgba(253,253,254,0.44)',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms',
              }}
            />
          )}
        </div>
      </button>

      {open && ingredients.length > 0 && (
        <ul style={{
          margin: '10px 0 0', padding: 0, listStyle: 'none',
        }}>
          {ingredients.map((ing, i) => (
            <li
              key={i}
              style={{
                fontSize: 13, lineHeight: 1.5,
                color: 'rgba(253,253,254,0.72)',
                display: 'flex', gap: 8,
                padding: '4px 0',
              }}
            >
              <span style={{ color: 'rgba(253,253,254,0.40)' }}>•</span>
              <span>{ing}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ClientMealPlanPage() {
  const supabase = createClient()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  useEffect(() => {
    loadMealPlan()
  }, [])

  async function loadMealPlan() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Je bent niet ingelogd')
        return
      }

      const { data, error: queryError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .single()

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError
      }

      setMealPlan(data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }

  const BackBtn = (
    <button
      onClick={() => window.history.back()}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 8, marginBottom: 14,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'rgba(253,253,254,0.62)',
        WebkitTapHighlightColor: 'transparent',
        padding: 0,
      }}
    >
      <ChevronLeft strokeWidth={1.5} size={18} />
      <span style={{ fontSize: 14 }}>Home</span>
    </button>
  )

  if (loading) {
    return (
      <div className="pb-28" style={{ animation: 'pulse 1.8s ease-in-out infinite' }}>
        {BackBtn}
        <div className="v6-card-dark" style={{ marginBottom: 14, minHeight: 280 }} />
        <div className="v6-card-dark" style={{ minHeight: 200 }} />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-28">
        {BackBtn}
        <div className="v6-card-dark" style={{ textAlign: 'center', padding: '32px 22px' }}>
          <p style={{ fontSize: 14, color: '#FDFDFE', margin: 0 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="pb-28">
        {BackBtn}
        <div className="v6-card" style={{ textAlign: 'center', padding: '40px 22px' }}>
          <UtensilsCrossed size={36} strokeWidth={1.5} style={{
            color: 'rgba(253,253,254,0.44)', margin: '0 auto 14px',
          }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#FDFDFE', margin: '0 0 6px' }}>
            Je voedingsplan wordt opgesteld
          </p>
          <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.62)', margin: 0 }}>
            Je ontvangt een bericht zodra het klaar is
          </p>
        </div>
      </div>
    )
  }

  // PDF-only fallback
  if (!mealPlan.content && mealPlan.pdf_url) {
    return (
      <div className="pb-28">
        {BackBtn}
        <div className="v6-card-dark" style={{ marginBottom: 14 }}>
          <p style={{
            fontSize: 10, color: 'rgba(253,253,254,0.52)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            margin: '0 0 6px',
          }}>
            Voeding
          </p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#FDFDFE', margin: 0, letterSpacing: '-0.015em' }}>
            {mealPlan.title}
          </p>
        </div>
        <div className="v6-card" style={{ textAlign: 'center', padding: '36px 22px' }}>
          <FileText size={36} strokeWidth={1.5} style={{
            color: '#C0FC01', margin: '0 auto 14px',
          }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#FDFDFE', margin: '0 0 16px' }}>
            Je voedingsplan is beschikbaar als PDF
          </p>
          <a
            href={mealPlan.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '12px 22px',
              background: '#C0FC01',
              color: '#1A1917',
              borderRadius: 14,
              fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            Download voedingsplan
          </a>
        </div>
      </div>
    )
  }

  if (!mealPlan.content || !mealPlan.content.days || mealPlan.content.days.length === 0) {
    return (
      <div className="pb-28">
        {BackBtn}
        <div className="v6-card-dark" style={{ textAlign: 'center', padding: '32px 22px' }}>
          <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.62)', margin: 0 }}>
            Geen maaltijden ingepland
          </p>
        </div>
      </div>
    )
  }

  const days = mealPlan.content.days
  const selectedDay = days[selectedDayIndex]

  const dayTotals = {
    calories: selectedDay.meals.reduce((s, m) => s + m.calories, 0),
    protein: selectedDay.meals.reduce((s, m) => s + m.protein, 0),
    carbs: selectedDay.meals.reduce((s, m) => s + m.carbs, 0),
    fat: selectedDay.meals.reduce((s, m) => s + m.fat, 0),
  }

  const targetCal = mealPlan.content.daily_calories
  const targetProt = mealPlan.content.daily_macros.protein
  const targetCarbs = mealPlan.content.daily_macros.carbs
  const targetFat = mealPlan.content.daily_macros.fat

  const calPct = targetCal > 0 ? Math.min((dayTotals.calories / targetCal) * 100, 100) : 0

  return (
    <div className="pb-28">
      {BackBtn}

      {/* Title card */}
      <div className="v6-card-dark animate-slide-up" style={{ marginBottom: 14 }}>
        <p style={{
          fontSize: 10, color: 'rgba(253,253,254,0.52)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          margin: '0 0 6px',
        }}>
          Voeding
        </p>
        <p style={{ fontSize: 20, fontWeight: 600, color: '#FDFDFE', margin: 0, letterSpacing: '-0.02em' }}>
          {mealPlan.title}
        </p>
      </div>

      {/* Day picker */}
      <div
        className="animate-slide-up"
        style={{
          display: 'flex', gap: 8,
          overflowX: 'auto',
          padding: '2px 0 12px',
          marginBottom: 6,
          scrollbarWidth: 'none',
        }}
      >
        {days.map((day, i) => {
          const active = i === selectedDayIndex
          const hasContent = day.meals && day.meals.length > 0
          return (
            <button
              key={i}
              onClick={() => setSelectedDayIndex(i)}
              style={{
                width: 52, height: 68,
                borderRadius: 16,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                flexShrink: 0,
                background: active
                  ? '#FDFDFE'
                  : hasContent
                    ? 'rgba(71,75,72,0.72)'
                    : 'rgba(71,75,72,0.38)',
                color: active
                  ? '#1A1917'
                  : hasContent
                    ? 'rgba(253,253,254,0.82)'
                    : 'rgba(253,253,254,0.38)',
                border: 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 200ms',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {DUTCH_DAYS[i % 7]}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{i + 1}</span>
              {!hasContent && <Moon size={11} strokeWidth={1.5} />}
            </button>
          )
        })}
      </div>

      {/* Totals card */}
      <div className="v6-card-dark animate-slide-up" style={{ marginBottom: 14 }}>
        {/* Calorie line */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 10, color: 'rgba(253,253,254,0.52)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Calorieën
            </span>
            <span style={{
              fontSize: 12, color: 'rgba(253,253,254,0.62)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(dayTotals.calories)} / {targetCal} kcal
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 999,
            background: 'rgba(253,253,254,0.10)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${calPct}%`,
              background: '#C0FC01',
              borderRadius: 999,
              transition: 'width 500ms',
            }} />
          </div>
        </div>

        {/* Macro pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}>
          {[
            { label: 'Eiwit', actual: dayTotals.protein, target: targetProt },
            { label: 'Koolh', actual: dayTotals.carbs, target: targetCarbs },
            { label: 'Vet', actual: dayTotals.fat, target: targetFat },
          ].map(macro => {
            const pct = macro.target > 0 ? Math.min((macro.actual / macro.target) * 100, 100) : 0
            return (
              <div
                key={macro.label}
                style={{
                  background: 'rgba(253,253,254,0.06)',
                  borderRadius: 14,
                  padding: '12px 10px 10px',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: 15, fontWeight: 600, color: '#FDFDFE',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {Math.round(macro.actual)}
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(253,253,254,0.52)' }}>g</span>
                </div>
                <div style={{
                  fontSize: 10, color: 'rgba(253,253,254,0.44)',
                  marginTop: 2, fontVariantNumeric: 'tabular-nums',
                }}>
                  / {macro.target}g
                </div>
                <div style={{
                  marginTop: 8,
                  height: 3, borderRadius: 999,
                  background: 'rgba(253,253,254,0.10)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: '#C0FC01',
                    transition: 'width 500ms',
                  }} />
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 500,
                  color: 'rgba(253,253,254,0.62)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginTop: 8,
                }}>
                  {macro.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Meals card */}
      {selectedDay.meals.length > 0 ? (
        <div className="v6-card-dark animate-slide-up" style={{ padding: '10px 22px 18px' }}>
          <p style={{
            fontSize: 10, color: 'rgba(253,253,254,0.52)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            margin: '8px 0 4px',
          }}>
            Maaltijden
          </p>
          {selectedDay.meals.map((meal, idx) => (
            <div
              key={idx}
              style={{
                borderTop: idx === 0 ? 'none' : '1px solid rgba(253,253,254,0.08)',
              }}
            >
              <MealRow meal={meal} />
            </div>
          ))}
        </div>
      ) : (
        <div className="v6-card-dark animate-slide-up" style={{ textAlign: 'center', padding: '32px 22px' }}>
          <Moon size={28} strokeWidth={1.5} style={{
            color: 'rgba(253,253,254,0.38)', margin: '0 auto 10px',
          }} />
          <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.62)', margin: 0 }}>
            Geen maaltijden voor deze dag
          </p>
        </div>
      )}
    </div>
  )
}
