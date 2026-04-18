'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExerciseSearchModal } from '@/components/coach/ExerciseSearchModal'
import type {
  WorkoutEditData,
  WorkoutEditExercise,
  WorkoutEditSiblingDay,
} from '@/lib/coach-workout-edit-data'

interface Props {
  data: WorkoutEditData
}

interface EditableExercise extends WorkoutEditExercise {
  _localId: string
  _isNew?: boolean
}

type ExerciseField =
  | 'sets'
  | 'repsMin'
  | 'restSeconds'
  | 'rpeTarget'
  | 'weightKg'

const STEP: Record<ExerciseField, number> = {
  sets: 1,
  repsMin: 1,
  restSeconds: 15,
  rpeTarget: 1,
  weightKg: 2.5,
}

const MIN: Record<ExerciseField, number> = {
  sets: 1,
  repsMin: 1,
  restSeconds: 0,
  rpeTarget: 1,
  weightKg: 0,
}

const MAX: Record<ExerciseField, number> = {
  sets: 12,
  repsMin: 50,
  restSeconds: 600,
  rpeTarget: 10,
  weightKg: 500,
}

function exerciseMeta(ex: EditableExercise): string {
  const parts: string[] = []
  const repsLabel =
    ex.repsMax && ex.repsMax > ex.repsMin ? `${ex.repsMin}-${ex.repsMax}` : `${ex.repsMin}`
  parts.push(`${ex.sets} × ${repsLabel}`)
  if (ex.weightKg != null && ex.weightKg > 0) parts.push(`${formatKg(ex.weightKg)} kg`)
  else if (ex.weightLabel) parts.push(ex.weightLabel)
  if (ex.rpeTarget != null) parts.push(`RPE ${ex.rpeTarget}`)
  if (ex.restSeconds && ex.restSeconds > 0) parts.push(`${ex.restSeconds}s`)
  return parts.join(' · ')
}

function formatKg(n: number): string {
  if (Number.isInteger(n)) return `${n}`
  return n.toFixed(1).replace('.', ',')
}

function makeLocalId(): string {
  return `l_${Math.random().toString(36).slice(2, 10)}`
}

export function WorkoutEditView({ data }: Props) {
  const router = useRouter()

  const [exercises, setExercises] = useState<EditableExercise[]>(() =>
    data.exercises.map((e) => ({ ...e, _localId: e.prescriptionId || makeLocalId() })),
  )
  const [dayName, setDayName] = useState<string>(data.day.name)
  const [openId, setOpenId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [dupOpen, setDupOpen] = useState(false)
  const [titleEditing, setTitleEditing] = useState(false)

  const markDirty = useCallback(() => setDirty(true), [])

  const totalSets = useMemo(() => exercises.reduce((s, e) => s + e.sets, 0), [exercises])

  const handleStep = (localId: string, field: ExerciseField, dir: 1 | -1) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e._localId !== localId) return e
        const current =
          field === 'weightKg'
            ? e.weightKg ?? 0
            : field === 'rpeTarget'
              ? e.rpeTarget ?? 7
              : (e[field] as number)
        const next = Math.min(
          MAX[field],
          Math.max(MIN[field], Math.round((current + dir * STEP[field]) * 10) / 10),
        )
        if (field === 'weightKg') {
          return {
            ...e,
            weightKg: next,
            weightLabel: next > 0 ? `${formatKg(next)} kg` : null,
          }
        }
        if (field === 'rpeTarget') {
          return { ...e, rpeTarget: next }
        }
        if (field === 'sets') return { ...e, sets: next }
        if (field === 'repsMin') return { ...e, repsMin: next }
        if (field === 'restSeconds') return { ...e, restSeconds: next }
        return e
      }),
    )
    markDirty()
  }

  const handleNotes = (localId: string, notes: string) => {
    setExercises((prev) =>
      prev.map((e) => (e._localId === localId ? { ...e, notes } : e)),
    )
    markDirty()
  }

  const handleRemove = (localId: string) => {
    setExercises((prev) => prev.filter((e) => e._localId !== localId))
    if (openId === localId) setOpenId(null)
    markDirty()
  }

  const handleMove = (localId: string, dir: -1 | 1) => {
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e._localId === localId)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
      return copy
    })
    markDirty()
  }

  const handleAddExercise = (ex: {
    id: string
    name: string
    name_nl?: string
    body_part: string
    equipment: string
  }) => {
    const isCardio = (ex.body_part || '').toLowerCase().includes('cardio')
    const localId = makeLocalId()
    const newEx: EditableExercise = {
      _localId: localId,
      _isNew: true,
      prescriptionId: '',
      exerciseId: ex.id,
      name: ex.name_nl || ex.name,
      targetMuscle: null,
      bodyPart: ex.body_part || null,
      sets: 3,
      repsMin: isCardio ? 1 : 10,
      repsMax: null,
      restSeconds: isCardio ? 0 : 90,
      rpeTarget: null,
      tempo: null,
      weightKg: null,
      weightLabel: null,
      notes: null,
      sortOrder: exercises.length,
      supersetGroupId: null,
    }
    setExercises((prev) => [...prev, newEx])
    setAddOpen(false)
    setOpenId(localId)
    markDirty()
  }

  const doSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/coach-update-template-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayId: data.day.id,
          dayName: dayName.trim() || data.day.name,
          exercises: exercises.map((e) => ({
            exercise_id: e.exerciseId,
            sets: e.sets,
            reps_min: e.repsMin,
            reps_max: e.repsMax,
            rest_seconds: e.restSeconds,
            rpe_target: e.rpeTarget,
            tempo: e.tempo,
            weight_suggestion:
              e.weightKg != null && e.weightKg > 0
                ? `${formatKg(e.weightKg)} kg`
                : e.weightLabel,
            notes: e.notes,
          })),
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Save failed')
      setDirty(false)
      setToast('Opgeslagen')
      setTimeout(() => setToast(null), 1400)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Opslaan mislukt'
      setToast(msg)
      setTimeout(() => setToast(null), 2400)
    } finally {
      setSaving(false)
    }
  }

  const doCancel = () => {
    if (dirty && !confirm('Wijzigingen weggooien?')) return
    router.back()
  }

  const doDuplicate = async (targetDayId: string) => {
    if (dirty) {
      setToast('Eerst je wijzigingen bewaren')
      setTimeout(() => setToast(null), 1600)
      return
    }
    try {
      const res = await fetch('/api/coach-duplicate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceDayId: data.day.id, targetDayId }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Duplicatie mislukt')
      setDupOpen(false)
      setToast(`Gekopieerd naar doeldag · ${payload.copied} oefeningen`)
      setTimeout(() => setToast(null), 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Duplicatie mislukt'
      setToast(msg)
      setTimeout(() => setToast(null), 2400)
    }
  }

  return (
    <div className="min-h-screen bg-[#8E9890] text-[#FDFDFE] pb-[40px]">
      <div className="mx-auto max-w-[420px] px-[22px]">
        {/* Top bar: cancel + save */}
        <div className="flex items-center justify-between px-[2px] pt-[14px] pb-[18px]">
          <button
            type="button"
            onClick={doCancel}
            className="bg-transparent text-[14px] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE]"
          >
            Annuleer
          </button>
          <button
            type="button"
            onClick={doSave}
            disabled={saving || !dirty}
            className={`flex items-center gap-1 rounded-full px-[18px] py-[8px] text-[13.5px] font-semibold tracking-[0.01em] transition-opacity ${
              dirty
                ? 'bg-[#C0FC01] text-[#0A0E0B] hover:opacity-90'
                : 'bg-[#C0FC01]/40 text-[#0A0E0B]/70 cursor-default'
            } ${saving ? 'opacity-60' : ''}`}
          >
            {saving ? 'Bewaren…' : 'Bewaar'}
          </button>
        </div>

        {/* Title block */}
        <div className="px-[2px] pb-[6px]">
          {titleEditing ? (
            <input
              autoFocus
              value={dayName}
              onChange={(e) => {
                setDayName(e.target.value)
                markDirty()
              }}
              onBlur={() => setTitleEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.currentTarget.blur()
                }
              }}
              className="w-full bg-transparent text-[30px] font-light leading-[1.1] tracking-[-0.025em] text-[#FDFDFE] outline-none"
              maxLength={60}
            />
          ) : (
            <button
              type="button"
              onClick={() => setTitleEditing(true)}
              className="block w-full text-left text-[30px] font-light leading-[1.1] tracking-[-0.025em] text-[#FDFDFE] hover:opacity-90"
            >
              {dayName || 'Dag'}
            </button>
          )}
          <div className="mt-[8px] text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.40)]">
            <Link
              href={`/coach/programs/${data.template.id}`}
              className="hover:text-[#FDFDFE]"
            >
              {data.template.name}
            </Link>
            <span> · {data.day.subtitle.replace(`${data.day.name} · `, '')}</span>
          </div>
        </div>

        {/* Section · Oefeningen */}
        <div className="mt-[24px] mb-[10px] flex items-baseline justify-between px-[2px]">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)]">
            Oefeningen
          </span>
          <span className="text-[11px] tracking-[0.04em] text-[rgba(253,253,254,0.40)]">
            {exercises.length} · {totalSets} sets totaal
          </span>
        </div>

        {exercises.length === 0 ? (
          <div className="mb-[8px] rounded-[18px] bg-[rgba(253,253,254,0.04)] px-[18px] py-[24px] text-center text-[13px] text-[rgba(253,253,254,0.62)]">
            Nog geen oefeningen · voeg er eentje toe hieronder
          </div>
        ) : (
          exercises.map((ex, idx) => {
            const open = openId === ex._localId
            return (
              <div key={ex._localId} className="mb-[8px] overflow-hidden rounded-[18px] bg-[#474B48]">
                <div
                  className="grid cursor-pointer grid-cols-[18px_1fr_auto] items-center gap-[14px] px-[18px] py-[16px]"
                  onClick={() => setOpenId(open ? null : ex._localId)}
                >
                  <span
                    className="text-[14px] leading-none tracking-[-0.02em] text-[rgba(253,253,254,0.40)] cursor-grab"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ≡
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-medium tracking-[-0.005em] text-[#FDFDFE]">
                      {ex.name}
                    </div>
                    <div className="mt-[3px] text-[12px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
                      {open && ex.bodyPart ? `Focus · ${ex.bodyPart.toLowerCase()}` : exerciseMeta(ex)}
                    </div>
                  </div>
                  {open ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenId(null)
                      }}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[rgba(253,253,254,0.08)] text-[14px] leading-none text-[rgba(253,253,254,0.62)] hover:bg-[rgba(253,253,254,0.14)]"
                    >
                      ×
                    </button>
                  ) : (
                    <span className="text-[16px] leading-none text-[rgba(253,253,254,0.40)]">›</span>
                  )}
                </div>

                {open && (
                  <div className="border-t border-[rgba(253,253,254,0.08)] px-[18px] pt-[4px] pb-[18px]">
                    <StepperRow
                      label="Sets"
                      value={`${ex.sets}`}
                      onStep={(dir) => handleStep(ex._localId, 'sets', dir)}
                    />
                    <StepperRow
                      label="Reps"
                      value={`${ex.repsMin}`}
                      onStep={(dir) => handleStep(ex._localId, 'repsMin', dir)}
                    />
                    <StepperRow
                      label="Gewicht"
                      value={ex.weightKg != null && ex.weightKg > 0 ? `${formatKg(ex.weightKg)}` : '—'}
                      unit={ex.weightKg != null && ex.weightKg > 0 ? 'kg' : undefined}
                      onStep={(dir) => handleStep(ex._localId, 'weightKg', dir)}
                    />
                    <StepperRow
                      label="RPE"
                      value={ex.rpeTarget != null ? `${ex.rpeTarget}` : '—'}
                      onStep={(dir) => handleStep(ex._localId, 'rpeTarget', dir)}
                    />
                    <StepperRow
                      label="Rust"
                      value={`${ex.restSeconds}`}
                      unit="s"
                      onStep={(dir) => handleStep(ex._localId, 'restSeconds', dir)}
                      isLast
                    />

                    <textarea
                      value={ex.notes || ''}
                      onChange={(e) => handleNotes(ex._localId, e.target.value)}
                      placeholder="Coaching-cue voor deze oefening…"
                      className="mt-[14px] block min-h-[52px] w-full resize-none rounded-[12px] bg-[rgba(253,253,254,0.04)] px-[14px] py-[10px] text-[13px] text-[#FDFDFE] placeholder:text-[rgba(253,253,254,0.40)] focus:outline-none"
                      rows={2}
                    />

                    <div className="mt-[14px] flex gap-[8px]">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(null)
                          setAddOpen(true)
                          handleRemove(ex._localId)
                        }}
                        className="flex-1 rounded-[10px] bg-[rgba(253,253,254,0.06)] py-[10px] text-[13px] font-medium text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.10)]"
                      >
                        Vervang oefening
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(ex._localId)}
                        className="flex-1 rounded-[10px] bg-[rgba(253,253,254,0.06)] py-[10px] text-[13px] font-medium text-[#E8A93C] hover:bg-[rgba(253,253,254,0.10)]"
                      >
                        Verwijder
                      </button>
                    </div>

                    {/* Reorder controls (below actions, subtle) */}
                    <div className="mt-[10px] flex justify-end gap-[6px]">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(ex._localId, -1)}
                        className="rounded-full bg-[rgba(253,253,254,0.04)] px-[10px] py-[4px] text-[11px] text-[rgba(253,253,254,0.62)] disabled:opacity-30"
                      >
                        ↑ omhoog
                      </button>
                      <button
                        type="button"
                        disabled={idx === exercises.length - 1}
                        onClick={() => handleMove(ex._localId, 1)}
                        className="rounded-full bg-[rgba(253,253,254,0.04)] px-[10px] py-[4px] text-[11px] text-[rgba(253,253,254,0.62)] disabled:opacity-30"
                      >
                        ↓ omlaag
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Add exercise button */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="mt-[4px] flex w-full items-center justify-center gap-[6px] rounded-[18px] border border-dashed border-[rgba(253,253,254,0.14)] bg-transparent px-[14px] py-[14px] text-[13.5px] font-medium text-[rgba(253,253,254,0.62)] hover:bg-[rgba(253,253,254,0.04)] hover:text-[#FDFDFE]"
        >
          <svg
            viewBox="0 0 14 14"
            className="h-[14px] w-[14px]"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M7 2v10M2 7h10" />
          </svg>
          Oefening toevoegen
        </button>

        {/* Quick actions */}
        <div className="mt-[24px] mb-[10px] flex items-baseline justify-between px-[2px]">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)]">
            Snelle acties
          </span>
        </div>
        <div className="mt-[8px] rounded-[18px] bg-[#474B48] px-[18px] py-[4px]">
          <QuickRow
            label="Kopieer vorige week"
            onClick={() => {
              setToast('Meerdere weken binnenkort · houd dit programma voor nu 1 week')
              setTimeout(() => setToast(null), 2400)
            }}
          />
          <QuickRow
            label="Dupliceer naar andere dag"
            onClick={() => {
              if (data.siblings.length === 0) {
                setToast('Geen andere dag in dit programma')
                setTimeout(() => setToast(null), 1800)
                return
              }
              setDupOpen(true)
            }}
          />
          <QuickRow
            label="Swap naar template"
            href={`/coach/programs/${data.template.id}`}
            isLast
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 bottom-[40px] z-50 -translate-x-1/2 rounded-full bg-[#0A0E0B] px-[18px] py-[10px] text-[12.5px] font-medium text-[#FDFDFE] shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
          {toast}
        </div>
      )}

      {/* Exercise picker modal */}
      <ExerciseSearchModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSelect={handleAddExercise}
      />

      {/* Duplicate day modal */}
      {dupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
          onClick={() => setDupOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-t-[22px] bg-[#2F3330] px-[22px] pt-[22px] pb-[40px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-[4px] text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)]">
              Dupliceer naar
            </div>
            <div className="mb-[14px] text-[16px] font-medium tracking-[-0.005em] text-[#FDFDFE]">
              Kies doeldag
            </div>
            <div className="overflow-hidden rounded-[14px] bg-[#474B48]">
              {data.siblings.map((s: WorkoutEditSiblingDay, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => doDuplicate(s.id)}
                  className={`flex w-full items-center justify-between px-[18px] py-[14px] text-left text-[14px] text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.04)] ${
                    i < data.siblings.length - 1
                      ? 'border-b border-[rgba(253,253,254,0.08)]'
                      : ''
                  }`}
                >
                  <span>
                    <span className="block">{s.name}</span>
                    <span className="mt-[2px] block text-[12px] text-[rgba(253,253,254,0.62)]">
                      {s.focus || `Dag ${s.dayNumber}`}
                    </span>
                  </span>
                  <span className="text-[15px] text-[rgba(253,253,254,0.40)]">›</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDupOpen(false)}
              className="mt-[14px] w-full rounded-[12px] bg-[rgba(253,253,254,0.06)] py-[12px] text-[13.5px] font-medium text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.10)]"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function StepperRow({
  label,
  value,
  unit,
  onStep,
  isLast,
}: {
  label: string
  value: string
  unit?: string
  onStep: (dir: 1 | -1) => void
  isLast?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-[12px] ${
        isLast ? '' : 'border-b border-[rgba(253,253,254,0.08)]'
      }`}
    >
      <span className="text-[13px] text-[rgba(253,253,254,0.62)]">{label}</span>
      <div className="flex items-center gap-[2px] rounded-full bg-[rgba(253,253,254,0.06)] p-[4px]">
        <button
          type="button"
          onClick={() => onStep(-1)}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-transparent text-[15px] leading-none text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.10)]"
        >
          −
        </button>
        <span className="min-w-[56px] text-center text-[14px] font-medium tracking-[-0.005em] text-[#FDFDFE]">
          {value}
          {unit && (
            <small className="ml-[2px] text-[10.5px] font-normal lowercase tracking-[0.06em] text-[rgba(253,253,254,0.40)]">
              {unit}
            </small>
          )}
        </span>
        <button
          type="button"
          onClick={() => onStep(1)}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-transparent text-[15px] leading-none text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.10)]"
        >
          +
        </button>
      </div>
    </div>
  )
}

function QuickRow({
  label,
  onClick,
  href,
  isLast,
}: {
  label: string
  onClick?: () => void
  href?: string
  isLast?: boolean
}) {
  const base = `flex cursor-pointer items-center justify-between py-[14px] ${
    isLast ? '' : 'border-b border-[rgba(253,253,254,0.08)]'
  }`
  if (href) {
    return (
      <Link href={href} className={base}>
        <span className="text-[14px] tracking-[-0.005em] text-[#FDFDFE]">{label}</span>
        <span className="text-[16px] text-[rgba(253,253,254,0.40)]">›</span>
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={`${base} w-full bg-transparent text-left`}>
      <span className="text-[14px] tracking-[-0.005em] text-[#FDFDFE]">{label}</span>
      <span className="text-[16px] text-[rgba(253,253,254,0.40)]">›</span>
    </button>
  )
}
