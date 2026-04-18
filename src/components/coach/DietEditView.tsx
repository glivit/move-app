'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FoodSearch, type FoodItem } from '@/components/coach/FoodSearch'
import type {
  DietEditData,
  DietEditMeal,
  DietEditMealItem,
} from '@/lib/coach-diet-edit-data'

// ─── Tokens (kept in-file for this screen, tokenized later in phase #23) ─────
const CANVAS = '#8E9890'
const CARD = '#474B48'
const INK = '#FDFDFE'
const INK_DARK = '#0A0E0B'
const INK_MUTE = 'rgba(253,253,254,0.62)'
const INK_DIM = 'rgba(253,253,254,0.40)'
const HAIR = 'rgba(253,253,254,0.08)'
const HAIR_STRONG = 'rgba(253,253,254,0.14)'
const LIME = '#C0FC01'
const AMBER = '#E8A93C'
const PROTEIN = '#C0FC01'
const CARB = '#E8A93C'
const FAT = '#A4C7F2'

// ─── Preset logic ───────────────────────────────────────────────

type PresetKey = 'cut' | 'onderhoud' | 'licht_surplus' | 'surplus' | 'recomp'

interface PresetSpec {
  key: PresetKey
  label: string
  /** kcal delta vs maintenance */
  kcalDelta: number
  /** protein g/kg bodyweight */
  proteinPerKg: number
  /** fat as fraction of total kcal */
  fatFraction: number
}

const PRESETS: PresetSpec[] = [
  { key: 'cut', label: 'Cut', kcalDelta: -400, proteinPerKg: 2.2, fatFraction: 0.30 },
  { key: 'onderhoud', label: 'Onderhoud', kcalDelta: 0, proteinPerKg: 1.8, fatFraction: 0.30 },
  { key: 'licht_surplus', label: 'Licht surplus', kcalDelta: 200, proteinPerKg: 1.9, fatFraction: 0.27 },
  { key: 'surplus', label: 'Surplus', kcalDelta: 400, proteinPerKg: 1.8, fatFraction: 0.25 },
  { key: 'recomp', label: 'Recomp', kcalDelta: 0, proteinPerKg: 2.4, fatFraction: 0.28 },
]

function applyPreset(
  preset: PresetSpec,
  maintenanceKcal: number,
  weightKg: number,
): { kcal: number; protein: number; carbs: number; fat: number } {
  const kcal = Math.max(800, maintenanceKcal + preset.kcalDelta)
  const proteinG = Math.round(weightKg * preset.proteinPerKg)
  const fatG = Math.round((kcal * preset.fatFraction) / 9)
  const proteinCal = proteinG * 4
  const fatCal = fatG * 9
  const carbsCal = Math.max(0, kcal - proteinCal - fatCal)
  const carbsG = Math.round(carbsCal / 4)
  return { kcal, protein: proteinG, carbs: carbsG, fat: fatG }
}

function detectPreset(
  kcal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  maintenanceKcal: number,
  weightKg: number,
): PresetKey | null {
  for (const preset of PRESETS) {
    const target = applyPreset(preset, maintenanceKcal, weightKg)
    if (
      Math.abs(target.kcal - kcal) <= 60 &&
      Math.abs(target.protein - proteinG) <= 10 &&
      Math.abs(target.carbs - carbsG) <= 15 &&
      Math.abs(target.fat - fatG) <= 8
    ) {
      return preset.key
    }
  }
  return null
}

// ─── Meal-pattern helpers ───────────────────────────────────────

interface DefaultMealSpec {
  name: string
  time: string
}

const MEAL_DEFAULTS: Record<number, DefaultMealSpec[]> = {
  3: [
    { name: 'Ontbijt', time: '08:00' },
    { name: 'Lunch', time: '13:00' },
    { name: 'Diner', time: '19:00' },
  ],
  4: [
    { name: 'Ontbijt', time: '08:00' },
    { name: 'Lunch', time: '12:30' },
    { name: 'Snack', time: '16:00' },
    { name: 'Diner', time: '19:30' },
  ],
  5: [
    { name: 'Ontbijt', time: '07:30' },
    { name: 'Tussendoor', time: '10:30' },
    { name: 'Lunch', time: '13:00' },
    { name: 'Snack', time: '16:30' },
    { name: 'Diner', time: '19:30' },
  ],
  6: [
    { name: 'Ontbijt', time: '07:00' },
    { name: 'Snack', time: '10:00' },
    { name: 'Lunch', time: '12:30' },
    { name: 'Pre-workout', time: '15:30' },
    { name: 'Post-workout', time: '18:30' },
    { name: 'Diner', time: '21:00' },
  ],
}

function applyMealPattern(current: EditableMeal[], count: number): EditableMeal[] {
  const defaults = MEAL_DEFAULTS[count] || []
  if (defaults.length === 0) return current

  if (current.length === count) return current

  if (current.length > count) {
    // Trim from end — keep the user's edits intact
    return current.slice(0, count)
  }

  // Add missing meals from the defaults
  const toAdd = defaults.slice(current.length).map(
    (spec, i): EditableMeal => ({
      _localId: crypto.randomUUID(),
      name: spec.name,
      time: spec.time,
      items: [],
      _sortIdx: current.length + i,
    }),
  )
  return [...current, ...toAdd]
}

// ─── Totals + macro calc ────────────────────────────────────────

function mealTotals(meal: EditableMeal) {
  return meal.items.reduce(
    (acc, it) => {
      acc.calories += it.calories || 0
      acc.protein += it.protein || 0
      acc.carbs += it.carbs || 0
      acc.fat += it.fat || 0
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

// ─── Editable types ─────────────────────────────────────────────

interface EditableMeal extends DietEditMeal {
  _localId: string
  _sortIdx: number
}

// ─── Main view ──────────────────────────────────────────────────

export function DietEditView({ data }: { data: DietEditData }) {
  const router = useRouter()

  const weightKg = data.client.weightKg || 75
  const maintenanceKcal = data.maintenanceKcal

  // Targets
  const [kcal, setKcal] = useState(data.plan.caloriesTarget)
  const [proteinG, setProteinG] = useState(data.plan.proteinG)
  const [carbsG, setCarbsG] = useState(data.plan.carbsG)
  const [fatG, setFatG] = useState(data.plan.fatG)
  const [guidelines, setGuidelines] = useState(data.plan.guidelines)

  // Meals
  const [meals, setMeals] = useState<EditableMeal[]>(() =>
    data.plan.meals.map((m, i) => ({
      ...m,
      _localId: crypto.randomUUID(),
      _sortIdx: i,
    })),
  )
  const [openMealId, setOpenMealId] = useState<string | null>(null)
  const [foodSearchFor, setFoodSearchFor] = useState<string | null>(null)

  // UI state
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const markDirty = () => setDirty(true)

  // Derived
  const proteinCal = proteinG * 4
  const carbsCal = carbsG * 4
  const fatCal = fatG * 9
  const totalMacroCal = proteinCal + carbsCal + fatCal

  const proteinPct = totalMacroCal > 0 ? Math.round((proteinCal / totalMacroCal) * 100) : 0
  const carbsPct = totalMacroCal > 0 ? Math.round((carbsCal / totalMacroCal) * 100) : 0
  const fatPct = totalMacroCal > 0 ? Math.round((fatCal / totalMacroCal) * 100) : 0

  const activePreset = useMemo(
    () => detectPreset(kcal, proteinG, carbsG, fatG, maintenanceKcal, weightKg),
    [kcal, proteinG, carbsG, fatG, maintenanceKcal, weightKg],
  )

  const mealsTotalKcal = useMemo(
    () => meals.reduce((s, m) => s + mealTotals(m).calories, 0),
    [meals],
  )

  // ─── Preset application ─────
  const applyPresetKey = (key: PresetKey) => {
    const spec = PRESETS.find((p) => p.key === key)
    if (!spec) return
    const target = applyPreset(spec, maintenanceKcal, weightKg)
    setKcal(target.kcal)
    setProteinG(target.protein)
    setCarbsG(target.carbs)
    setFatG(target.fat)
    markDirty()
  }

  // ─── Kcal stepper ─────
  const adjustKcal = (delta: number) => {
    const next = Math.max(800, Math.min(6000, kcal + delta))
    setKcal(next)
    markDirty()
  }

  // ─── Macro slider handlers (auto-rebalance) ─────
  const MAX_PROTEIN = 400
  const MAX_CARBS = 500
  const MAX_FAT = 200

  const setProteinWithRebalance = (newP: number) => {
    const p = Math.max(0, Math.min(MAX_PROTEIN, newP))
    const remainingCal = Math.max(0, kcal - p * 4)
    const curCarbsCal = carbsG * 4
    const curFatCal = fatG * 9
    const curOtherCal = curCarbsCal + curFatCal || 1
    const carbsShare = curCarbsCal / curOtherCal
    const newCarbsCal = remainingCal * carbsShare
    const newFatCal = remainingCal - newCarbsCal
    setProteinG(p)
    setCarbsG(Math.max(0, Math.round(newCarbsCal / 4)))
    setFatG(Math.max(0, Math.round(newFatCal / 9)))
    markDirty()
  }
  const setCarbsWithRebalance = (newC: number) => {
    const c = Math.max(0, Math.min(MAX_CARBS, newC))
    const remainingCal = Math.max(0, kcal - c * 4)
    const curProteinCal = proteinG * 4
    const curFatCal = fatG * 9
    const curOtherCal = curProteinCal + curFatCal || 1
    const proteinShare = curProteinCal / curOtherCal
    const newProteinCal = remainingCal * proteinShare
    const newFatCal = remainingCal - newProteinCal
    setCarbsG(c)
    setProteinG(Math.max(0, Math.round(newProteinCal / 4)))
    setFatG(Math.max(0, Math.round(newFatCal / 9)))
    markDirty()
  }
  const setFatWithRebalance = (newF: number) => {
    const f = Math.max(0, Math.min(MAX_FAT, newF))
    const remainingCal = Math.max(0, kcal - f * 9)
    const curProteinCal = proteinG * 4
    const curCarbsCal = carbsG * 4
    const curOtherCal = curProteinCal + curCarbsCal || 1
    const proteinShare = curProteinCal / curOtherCal
    const newProteinCal = remainingCal * proteinShare
    const newCarbsCal = remainingCal - newProteinCal
    setFatG(f)
    setProteinG(Math.max(0, Math.round(newProteinCal / 4)))
    setCarbsG(Math.max(0, Math.round(newCarbsCal / 4)))
    markDirty()
  }

  // ─── Meal operations ─────
  const addMeal = () => {
    const m: EditableMeal = {
      _localId: crypto.randomUUID(),
      name: `Maaltijd ${meals.length + 1}`,
      time: '12:00',
      items: [],
      _sortIdx: meals.length,
    }
    setMeals((prev) => [...prev, m])
    setOpenMealId(m._localId)
    markDirty()
  }

  const updateMeal = (localId: string, patch: Partial<EditableMeal>) => {
    setMeals((prev) => prev.map((m) => (m._localId === localId ? { ...m, ...patch } : m)))
    markDirty()
  }

  const removeMeal = (localId: string) => {
    setMeals((prev) => prev.filter((m) => m._localId !== localId))
    if (openMealId === localId) setOpenMealId(null)
    if (foodSearchFor === localId) setFoodSearchFor(null)
    markDirty()
  }

  const addItemToMeal = (localId: string, item: DietEditMealItem) => {
    setMeals((prev) =>
      prev.map((m) => (m._localId === localId ? { ...m, items: [...m.items, item] } : m)),
    )
    markDirty()
  }

  const removeItemFromMeal = (localId: string, itemIndex: number) => {
    setMeals((prev) =>
      prev.map((m) =>
        m._localId === localId
          ? { ...m, items: m.items.filter((_, i) => i !== itemIndex) }
          : m,
      ),
    )
    markDirty()
  }

  const handleFoodSelected = (mealLocalId: string, food: FoodItem, grams: number) => {
    const item: DietEditMealItem = {
      name: food.name,
      description: food.brand ? `${food.brand} — ${grams}g` : `${grams}g`,
      calories: Math.round((food.per100g.calories * grams) / 100),
      protein: Math.round((food.per100g.protein * grams) / 100),
      carbs: Math.round((food.per100g.carbs * grams) / 100),
      fat: Math.round((food.per100g.fat * grams) / 100),
      grams,
      per100g: {
        calories: food.per100g.calories,
        protein: food.per100g.protein,
        carbs: food.per100g.carbs,
        fat: food.per100g.fat,
      },
      image: food.image_small || null,
    }
    addItemToMeal(mealLocalId, item)
    setFoodSearchFor(null)
  }

  const applyPattern = (count: number) => {
    const next = applyMealPattern(meals, count)
    setMeals(next)
    markDirty()
  }

  // ─── Save / cancel ─────
  const doSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/coach-update-nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: data.plan.id,
          caloriesTarget: kcal,
          proteinG,
          carbsG,
          fatG,
          guidelines,
          meals: meals.map((m) => ({
            name: m.name,
            time: m.time,
            items: m.items,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setToast(json.error || 'Opslaan mislukt')
        setSaving(false)
        return
      }
      setDirty(false)
      setToast('Bewaard')
      router.refresh()
      setTimeout(() => setToast(null), 1400)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Opslaan mislukt'
      setToast(msg)
    } finally {
      setSaving(false)
    }
  }

  const doCancel = () => {
    if (dirty) {
      const ok = confirm('Wijzigingen worden niet bewaard. Doorgaan?')
      if (!ok) return
    }
    router.back()
  }

  // toast auto-clear
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!toast) return
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [toast])

  // ─── Summary-pill copy ─────
  const summary = useMemo(() => {
    const proteinPerKg = weightKg > 0 ? proteinG / weightKg : 0
    const fatPctNum = fatPct
    if (proteinPerKg < 1.6) {
      return {
        warn: true,
        text: `Eiwit slechts ${proteinPerKg.toFixed(1)} g/kg — overweeg te verhogen voor spierbehoud.`,
      }
    }
    if (fatPctNum < 15) {
      return {
        warn: true,
        text: `Vet onder 15 % — kan hormonale aanmaak en verzadiging belemmeren.`,
      }
    }
    const kcalDelta = kcal - maintenanceKcal
    let headline = 'Onderhoud'
    if (kcalDelta <= -250) headline = 'Deficit'
    else if (kcalDelta >= 250) headline = 'Surplus'
    else if (kcalDelta > 0) headline = 'Licht surplus'
    else if (kcalDelta < 0) headline = 'Licht deficit'
    return {
      warn: false,
      text: `${proteinG}g eiwit om spiermassa te beschermen, carbs gecentreerd rond training, vet ${fatPctNum}% voor verzadiging.`,
      headline,
    }
  }, [proteinG, kcal, fatPct, maintenanceKcal, weightKg])

  const mealsPatternCount = meals.length

  return (
    <div style={{ background: CANVAS, minHeight: '100dvh', color: INK }}>
      <div className="mx-auto w-full max-w-[420px] px-[22px] pb-32 pt-4">
        {/* Top bar */}
        <div className="flex items-center justify-between py-[14px]">
          <button
            onClick={doCancel}
            className="border-0 bg-transparent p-0 font-inherit text-[14px] cursor-pointer"
            style={{ color: INK_MUTE }}
          >
            Annuleer
          </button>
          <button
            onClick={doSave}
            disabled={saving || !dirty}
            className="border-0 cursor-pointer rounded-full px-[18px] py-2 font-inherit text-[13.5px] font-semibold tracking-wide disabled:cursor-default"
            style={{
              background: LIME,
              color: INK_DARK,
              opacity: !dirty || saving ? 0.4 : 1,
            }}
          >
            {saving ? 'Bewaren…' : 'Bewaar'}
          </button>
        </div>

        {/* Title */}
        <div className="pb-1.5">
          <div
            className="leading-[1.1]"
            style={{
              fontSize: 30,
              fontWeight: 300,
              letterSpacing: '-0.025em',
              color: INK,
            }}
          >
            Macro-target
          </div>
          <div
            className="mt-2"
            style={{
              fontSize: 12,
              color: INK_DIM,
              letterSpacing: '0.04em',
            }}
          >
            {data.subtitle}
          </div>
        </div>

        {/* Preset pills */}
        <div
          className="mt-[22px] flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {PRESETS.map((p) => {
            const active = activePreset === p.key
            return (
              <button
                key={p.key}
                onClick={() => applyPresetKey(p.key)}
                className="shrink-0 cursor-pointer rounded-full px-[14px] py-2 font-inherit text-[12px] font-medium"
                style={{
                  background: active ? INK : 'rgba(253,253,254,0.06)',
                  color: active ? INK_DARK : INK_MUTE,
                  border: '1px solid transparent',
                  letterSpacing: '0.01em',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Kcal hero */}
        <SectionLabel>Dagelijks doel</SectionLabel>
        <div
          className="mb-2.5 flex items-center justify-between gap-[18px] rounded-[22px] p-[22px]"
          style={{ background: CARD }}
        >
          <div>
            <div
              className="leading-none"
              style={{
                fontSize: 48,
                fontWeight: 300,
                letterSpacing: '-0.03em',
                color: INK,
              }}
            >
              {kcal}
            </div>
            <div
              className="mt-2"
              style={{
                fontSize: 11,
                color: INK_DIM,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              kcal / dag
            </div>
            <div className="mt-1" style={{ fontSize: 12, color: INK_MUTE }}>
              <KcalDelta delta={kcal - maintenanceKcal} />
              {' '}vs onderhoud ({maintenanceKcal})
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => adjustKcal(50)}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-0 font-inherit cursor-pointer"
              style={{
                background: 'rgba(253,253,254,0.06)',
                color: INK,
                fontSize: 20,
              }}
              aria-label="+50 kcal"
            >
              +
            </button>
            <button
              onClick={() => adjustKcal(-50)}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-0 font-inherit cursor-pointer"
              style={{
                background: 'rgba(253,253,254,0.06)',
                color: INK,
                fontSize: 20,
              }}
              aria-label="−50 kcal"
            >
              −
            </button>
          </div>
        </div>

        {/* Macros */}
        <SectionLabel>Macro-verdeling</SectionLabel>
        <div
          className="mb-2.5 rounded-[22px] px-[22px] pb-[22px] pt-[18px]"
          style={{ background: CARD }}
        >
          <MacroBlock
            name="Eiwit"
            color={PROTEIN}
            grams={proteinG}
            max={MAX_PROTEIN}
            kcalPerGram={4}
            pct={proteinPct}
            onChange={setProteinWithRebalance}
            footerLeft={weightKg > 0 ? `${(proteinG / weightKg).toFixed(1)} g / kg lichaamsgewicht` : undefined}
            footerRight="min 1,6 g/kg"
          />
          <MacroBlock
            name="Koolhydraten"
            color={CARB}
            grams={carbsG}
            max={MAX_CARBS}
            kcalPerGram={4}
            pct={carbsPct}
            onChange={setCarbsWithRebalance}
            footerLeft="rond training hoger"
            footerRight="min 100 g"
            bordered
          />
          <MacroBlock
            name="Vet"
            color={FAT}
            grams={fatG}
            max={MAX_FAT}
            kcalPerGram={9}
            pct={fatPct}
            onChange={setFatWithRebalance}
            footerLeft={weightKg > 0 ? `${(fatG / weightKg).toFixed(1)} g / kg lichaamsgewicht` : undefined}
            footerRight="min 50 g"
            bordered
          />
        </div>

        {/* Summary pill */}
        <div
          className="mt-3.5 rounded-[14px] px-4 py-3 leading-[1.5]"
          style={{
            background: summary.warn ? 'rgba(232,169,60,0.10)' : 'rgba(192,252,1,0.08)',
            border: summary.warn
              ? '1px solid rgba(232,169,60,0.32)'
              : '1px solid rgba(192,252,1,0.22)',
            color: INK,
            fontSize: 13,
            letterSpacing: '-0.005em',
          }}
        >
          {summary.headline && !summary.warn && (
            <strong style={{ color: LIME, fontWeight: 500 }}>{summary.headline}</strong>
          )}
          {summary.headline && !summary.warn && ' · '}
          {summary.text}
        </div>

        {/* Meal pattern */}
        <SectionLabel>Maaltijdpatroon</SectionLabel>
        <div className="mt-1 flex gap-2">
          {[3, 4, 5, 6].map((n) => {
            const active = mealsPatternCount === n
            return (
              <button
                key={n}
                onClick={() => applyPattern(n)}
                className="relative flex-1 cursor-pointer border-0 font-inherit"
                style={{
                  background: active ? INK : 'rgba(253,253,254,0.06)',
                  color: active ? INK_DARK : INK_MUTE,
                  borderRadius: 14,
                  padding: '14px 0',
                  fontSize: 16,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                }}
              >
                {n}
                <span
                  className="block"
                  style={{
                    fontSize: 10,
                    color: active ? 'rgba(10,14,11,0.6)' : INK_DIM,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 2,
                    fontWeight: 500,
                  }}
                >
                  maaltijden
                </span>
              </button>
            )
          })}
        </div>

        {/* Meals list */}
        <div className="mb-2.5 mt-[26px] flex items-baseline justify-between">
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: INK_DIM,
            }}
          >
            Maaltijden
          </span>
          <div className="flex items-center gap-2.5">
            {kcal > 0 && mealsTotalKcal > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color:
                    Math.abs(mealsTotalKcal - kcal) > 200 ? AMBER : INK_DIM,
                  letterSpacing: '0.04em',
                }}
              >
                {mealsTotalKcal} / {kcal} kcal
              </span>
            )}
            <button
              onClick={addMeal}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-0 font-inherit cursor-pointer"
              style={{
                background: 'rgba(253,253,254,0.06)',
                color: INK,
                fontSize: 16,
              }}
              aria-label="Maaltijd toevoegen"
            >
              +
            </button>
          </div>
        </div>

        {meals.length === 0 && (
          <div
            className="mb-2 rounded-[18px] px-[18px] py-5 text-center"
            style={{
              background: CARD,
              color: INK_MUTE,
              fontSize: 13,
              letterSpacing: '-0.005em',
            }}
          >
            Nog geen maaltijden — kies een patroon hierboven of tik <span style={{ color: INK }}>+</span>
          </div>
        )}

        {meals.map((meal) => (
          <MealCard
            key={meal._localId}
            meal={meal}
            open={openMealId === meal._localId}
            onToggle={() =>
              setOpenMealId((cur) => (cur === meal._localId ? null : meal._localId))
            }
            onUpdate={(patch) => updateMeal(meal._localId, patch)}
            onRemove={() => removeMeal(meal._localId)}
            onRemoveItem={(i) => removeItemFromMeal(meal._localId, i)}
            foodSearchOpen={foodSearchFor === meal._localId}
            onToggleFoodSearch={() =>
              setFoodSearchFor((cur) => (cur === meal._localId ? null : meal._localId))
            }
            onFoodSelect={(food, grams) => handleFoodSelected(meal._localId, food, grams)}
          />
        ))}

        {/* Note */}
        <SectionLabel>Notitie voor {data.client.fullName.split(' ')[0]}</SectionLabel>
        <textarea
          value={guidelines}
          onChange={(e) => {
            setGuidelines(e.target.value)
            markDirty()
          }}
          placeholder="Focus op eiwit bij ontbijt, carbs hoog op trainingsdagen…"
          className="block w-full resize-none rounded-[22px] border-0 px-5 py-4 outline-none"
          style={{
            background: CARD,
            color: INK,
            fontSize: 14,
            letterSpacing: '-0.005em',
            lineHeight: 1.5,
            minHeight: 110,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div
            className="rounded-full px-5 py-3 text-[13px] font-medium shadow-lg"
            style={{
              background: INK_DARK,
              color: INK,
              border: `1px solid ${HAIR_STRONG}`,
            }}
          >
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mb-2.5 mt-[26px] block"
      style={{
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: INK_DIM,
      }}
    >
      {children}
    </span>
  )
}

function KcalDelta({ delta }: { delta: number }) {
  if (delta === 0) return <strong style={{ color: LIME, fontWeight: 500 }}>±0</strong>
  const sign = delta > 0 ? '+' : '−'
  return (
    <strong style={{ color: LIME, fontWeight: 500 }}>
      {sign}
      {Math.abs(delta)}
    </strong>
  )
}

function MacroBlock({
  name,
  color,
  grams,
  max,
  kcalPerGram,
  pct,
  onChange,
  footerLeft,
  footerRight,
  bordered = false,
}: {
  name: string
  color: string
  grams: number
  max: number
  kcalPerGram: number
  pct: number
  onChange: (next: number) => void
  footerLeft?: string
  footerRight?: string
  bordered?: boolean
}) {
  const widthPct = Math.min(100, Math.max(0, (grams / max) * 100))
  const kcal = grams * kcalPerGram

  return (
    <div
      className="relative"
      style={{
        borderTop: bordered ? `1px solid ${HAIR}` : 'none',
        paddingTop: bordered ? 20 : 0,
        marginTop: bordered ? 20 : 0,
      }}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: INK,
            letterSpacing: '0.02em',
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: INK,
            letterSpacing: '-0.02em',
          }}
        >
          {grams}g{' '}
          <small
            style={{
              fontSize: 12,
              color: INK_MUTE,
              marginLeft: 6,
              letterSpacing: 0,
            }}
          >
            {pct}% · {kcal} kcal
          </small>
        </span>
      </div>

      {/* Slider (native range, styled via class) */}
      <div className="relative mt-3 h-5">
        <div
          className="absolute left-0 right-0 rounded-[1px]"
          style={{ top: 9, height: 2, background: HAIR_STRONG }}
        />
        <div
          className="absolute left-0 rounded-[1px]"
          style={{ top: 9, height: 2, width: `${widthPct}%`, background: color }}
        />
        <div
          className="absolute h-4 w-4 -translate-x-1/2 rounded-full"
          style={{
            top: 2,
            left: `${widthPct}%`,
            background: color,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={5}
          value={grams}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          className="absolute inset-0 w-full cursor-pointer appearance-none opacity-0"
          style={{ height: '100%' }}
          aria-label={`${name} in gram`}
        />
      </div>

      {(footerLeft || footerRight) && (
        <div
          className="mt-2 flex justify-between"
          style={{ fontSize: 11, color: INK_DIM, letterSpacing: '0.04em' }}
        >
          <span>{footerLeft}</span>
          <span>{footerRight}</span>
        </div>
      )}
    </div>
  )
}

function MealCard({
  meal,
  open,
  onToggle,
  onUpdate,
  onRemove,
  onRemoveItem,
  foodSearchOpen,
  onToggleFoodSearch,
  onFoodSelect,
}: {
  meal: EditableMeal
  open: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<EditableMeal>) => void
  onRemove: () => void
  onRemoveItem: (index: number) => void
  foodSearchOpen: boolean
  onToggleFoodSearch: () => void
  onFoodSelect: (food: FoodItem, grams: number) => void
}) {
  const totals = mealTotals(meal)

  return (
    <div
      className="mb-2 overflow-hidden rounded-[18px]"
      style={{ background: CARD }}
    >
      <div
        onClick={onToggle}
        className="grid cursor-pointer items-center gap-3.5 px-[18px] py-4"
        style={{ gridTemplateColumns: '44px 1fr auto' }}
      >
        <span
          style={{
            fontSize: 13,
            color: INK_MUTE,
            letterSpacing: '0.01em',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          }}
        >
          {meal.time}
        </span>
        <div className="min-w-0">
          <div
            className="truncate"
            style={{
              fontSize: 14.5,
              color: INK,
              letterSpacing: '-0.005em',
              fontWeight: 500,
            }}
          >
            {meal.name || 'Maaltijd'}
          </div>
          <div
            className="mt-0.5"
            style={{ fontSize: 12, color: INK_MUTE, letterSpacing: '0.01em' }}
          >
            {totals.calories} kcal · {meal.items.length} {meal.items.length === 1 ? 'item' : 'items'}
          </div>
        </div>
        {open ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-0 font-inherit cursor-pointer"
            style={{
              background: 'rgba(253,253,254,0.08)',
              color: INK_MUTE,
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="Inklappen"
          >
            ×
          </button>
        ) : (
          <span
            style={{
              color: INK_DIM,
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ›
          </span>
        )}
      </div>

      {open && (
        <div
          className="px-[18px] pb-[18px] pt-1"
          style={{ borderTop: `1px solid ${HAIR}` }}
        >
          <div
            className="flex items-center justify-between py-3"
            style={{ borderBottom: `1px solid ${HAIR}` }}
          >
            <span style={{ fontSize: 13, color: INK_MUTE }}>Naam</span>
            <input
              value={meal.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="rounded-full border-0 px-[14px] py-1.5 text-right outline-none"
              style={{
                background: 'rgba(253,253,254,0.06)',
                color: INK,
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '-0.005em',
                minWidth: 140,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div
            className="flex items-center justify-between py-3"
            style={{ borderBottom: `1px solid ${HAIR}` }}
          >
            <span style={{ fontSize: 13, color: INK_MUTE }}>Tijd</span>
            <input
              type="time"
              value={meal.time}
              onChange={(e) => onUpdate({ time: e.target.value })}
              className="rounded-full border-0 px-[14px] py-1.5 text-center outline-none"
              style={{
                background: 'rgba(253,253,254,0.06)',
                color: INK,
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '0.01em',
                minWidth: 90,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Foods */}
          <div className="mt-3.5 pt-3.5" style={{ borderTop: `1px solid ${HAIR}` }}>
            <div className="mb-2.5 flex items-baseline justify-between">
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: INK_DIM,
                }}
              >
                Voedingsmiddelen
              </span>
              <span
                style={{ fontSize: 11, color: INK_DIM, letterSpacing: '0.04em' }}
              >
                {meal.items.length} {meal.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {meal.items.map((item, idx) => (
              <div
                key={idx}
                className="mb-1.5 flex items-center justify-between gap-2 rounded-[10px] px-[14px] py-2.5"
                style={{ background: 'rgba(253,253,254,0.04)' }}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate"
                    style={{
                      fontSize: 13.5,
                      color: INK,
                      letterSpacing: '-0.005em',
                      fontWeight: 500,
                      lineHeight: 1.25,
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    className="mt-0.5"
                    style={{ fontSize: 11.5, color: INK_MUTE, letterSpacing: '0.01em' }}
                  >
                    {item.grams ? `${item.grams}g · ` : ''}
                    {item.calories} kcal
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem(idx)}
                  className="flex-shrink-0 border-0 bg-transparent px-1.5 py-0.5 font-inherit cursor-pointer"
                  style={{ color: INK_DIM, fontSize: 14, lineHeight: 1 }}
                  aria-label="Verwijder"
                >
                  ×
                </button>
              </div>
            ))}

            {foodSearchOpen && (
              <div className="mt-2">
                <FoodSearch
                  onSelect={onFoodSelect}
                  onClose={onToggleFoodSearch}
                />
              </div>
            )}

            {!foodSearchOpen && (
              <button
                onClick={onToggleFoodSearch}
                className="mt-1 w-full cursor-pointer border-dashed font-inherit"
                style={{
                  background: 'transparent',
                  border: `1px dashed ${HAIR_STRONG}`,
                  color: INK_MUTE,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                + Voedingsmiddel toevoegen
              </button>
            )}
          </div>

          {/* Totaal */}
          <div className="mt-3.5 pt-3.5" style={{ borderTop: `1px solid ${HAIR}` }}>
            <div className="flex items-baseline justify-between">
              <span
                style={{
                  fontSize: 11,
                  color: INK_DIM,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                Totaal
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: INK,
                  fontWeight: 400,
                  letterSpacing: '-0.015em',
                }}
              >
                {totals.calories}
                <small
                  style={{
                    fontSize: 11,
                    color: INK_MUTE,
                    marginLeft: 4,
                    letterSpacing: '0.06em',
                    fontWeight: 400,
                  }}
                >
                  kcal
                </small>
              </span>
            </div>
            <div
              className="mt-1"
              style={{ fontSize: 12, color: INK_MUTE, letterSpacing: '0.01em' }}
            >
              P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm('Deze maaltijd verwijderen?')) onRemove()
            }}
            className="mt-3.5 w-full cursor-pointer border-0 font-inherit"
            style={{
              background: 'rgba(232,169,60,0.08)',
              color: AMBER,
              borderRadius: 10,
              padding: 10,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Verwijder maaltijd
          </button>
        </div>
      )}
    </div>
  )
}
