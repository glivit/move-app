'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  ChevronRight,
  Search,
  CheckCircle,
  AlertCircle,
  Droplets,
  Copy,
  Loader2,
  Plus,
  Pencil,
  Zap,
  X,
} from 'lucide-react'

/**
 * Coach · Voeding (v3 Orion).
 * - Canvas inherited from CoachLayout
 * - 4 stat-tiles in dark #474B48 cards
 * - Template cards + modals in v3 tones (no white pills, no weird wrapping)
 */

interface DailySummary {
  client_id: string
  date: string
  meals_planned: number
  meals_completed: number
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  daily_note: string | null
  mood: string | null
  water_liters: number | null
  coach_seen: boolean
  coach_seen_at: string | null
}

interface ClientNutrition {
  id: string
  full_name: string
  avatar_url: string | null
  package: string | null
  nutrition_plan: {
    id: string
    title: string
    calories_target: number
    protein_g: number
    carbs_g: number
    fat_g: number
    is_active: boolean
    created_at: string
  } | null
  todaySummary: DailySummary | null
  weekCompliance: number | null
}

const MOOD_EMOJI: Record<string, string> = {
  great: '😄',
  good: '🙂',
  ok: '😐',
  bad: '😞',
  terrible: '😢',
}

interface PrebuiltTemplate {
  id: string
  title: string
  description: string
  calories_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
  tags: string[]
  mealsCount: number
}

interface NutritionTemplate {
  id: string
  title: string
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  meals: unknown
  guidelines: string | null
  created_at: string
}

// ─── Macro accent colors (match DietEditView) ────────────────────
const MACRO = {
  protein: '#C0FC01',
  carbs: '#E8A93C',
  fat: '#A4C7F2',
}

type FilterKey = 'all' | 'with_plan' | 'without_plan' | 'needs_review'

export default function NutritionOverviewPage() {
  const [clients, setClients] = useState<ClientNutrition[]>([])
  const [templates, setTemplates] = useState<NutritionTemplate[]>([])
  const [prebuiltTemplates, setPrebuiltTemplates] = useState<PrebuiltTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)
  const [showPrebuiltAssign, setShowPrebuiltAssign] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  async function assignPrebuiltToClient(templateId: string, clientId: string) {
    setAssigning(true)
    setAssignError(null)
    try {
      const res = await fetch('/api/template-diets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, clientId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Fout bij toewijzen (${res.status})`)
      }
      const result = await res.json()
      setShowPrebuiltAssign(null)
      setAssignSuccess(result.message || 'Template toegewezen!')
      setTimeout(() => setAssignSuccess(null), 3000)
      loadClients()
    } catch (err) {
      console.error('Failed to assign prebuilt template:', err)
      setAssignError(err instanceof Error ? err.message : 'Fout bij toewijzen van template')
    } finally {
      setAssigning(false)
    }
  }

  async function assignTemplateToClient(templateId: string, clientId: string) {
    setAssigning(true)
    setAssignError(null)
    try {
      const supabase = createClient()
      const template = templates.find((t) => t.id === templateId)
      if (!template) {
        throw new Error('Template niet gevonden')
      }

      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('client_id', clientId)
        .eq('is_active', true)

      const { error: insertErr } = await supabase.from('nutrition_plans').insert({
        client_id: clientId,
        title: template.title.replace(' — Template', ''),
        calories_target: template.calories_target,
        protein_g: template.protein_g,
        carbs_g: template.carbs_g,
        fat_g: template.fat_g,
        meals: template.meals,
        guidelines: template.guidelines,
        is_active: true,
        valid_from: new Date().toISOString().split('T')[0],
      })

      if (insertErr) throw new Error(insertErr.message)

      setShowAssignModal(null)
      setAssignSuccess('Template toegewezen!')
      setTimeout(() => setAssignSuccess(null), 3000)
      loadClients()
    } catch (err) {
      console.error('Failed to assign template:', err)
      setAssignError(err instanceof Error ? err.message : 'Fout bij toewijzen')
    } finally {
      setAssigning(false)
    }
  }

  async function loadClients() {
    try {
      setLoading(true)
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: templateData } = await supabase
          .from('nutrition_plans')
          .select('id, title, calories_target, protein_g, carbs_g, fat_g, meals, guidelines, created_at')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
        setTemplates((templateData || []) as NutritionTemplate[])
      }

      try {
        const res = await fetch('/api/template-diets')
        if (res.ok) {
          const data = await res.json()
          setPrebuiltTemplates(data)
        }
      } catch {
        // silent
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, package')
        .eq('role', 'client')
        .order('full_name')

      if (!profilesData) {
        setClients([])
        return
      }

      const { data: plansData } = await supabase
        .from('nutrition_plans')
        .select('id, client_id, title, calories_target, protein_g, carbs_g, fat_g, is_active, created_at')
        .eq('is_active', true)

      const plansMap = new Map<string, ClientNutrition['nutrition_plan']>()
      if (plansData) {
        ;(plansData as Array<{ client_id: string } & NonNullable<ClientNutrition['nutrition_plan']>>).forEach((plan) => {
          plansMap.set(plan.client_id, plan)
        })
      }

      const today = new Date().toISOString().split('T')[0]
      const { data: summariesData } = await supabase
        .from('nutrition_daily_summary')
        .select('*')
        .eq('date', today)

      const summariesMap = new Map<string, DailySummary>()
      if (summariesData) {
        ;(summariesData as DailySummary[]).forEach((s) => {
          summariesMap.set(s.client_id, s)
        })
      }

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]

      const { data: weekData } = await supabase
        .from('nutrition_daily_summary')
        .select('client_id, meals_planned, meals_completed')
        .gte('date', weekAgoStr)
        .lte('date', today)

      const weekMap = new Map<string, { planned: number; completed: number }>()
      if (weekData) {
        ;(weekData as Array<{ client_id: string; meals_planned: number; meals_completed: number }>).forEach((d) => {
          const existing = weekMap.get(d.client_id) || { planned: 0, completed: 0 }
          existing.planned += d.meals_planned || 0
          existing.completed += d.meals_completed || 0
          weekMap.set(d.client_id, existing)
        })
      }

      const clientsWithNutrition: ClientNutrition[] = (profilesData as Array<{
        id: string
        full_name: string
        avatar_url: string | null
        package: string | null
      }>).map((profile) => {
        const week = weekMap.get(profile.id)
        return {
          id: profile.id,
          full_name: profile.full_name || 'Onbekend',
          avatar_url: profile.avatar_url,
          package: profile.package,
          nutrition_plan: plansMap.get(profile.id) || null,
          todaySummary: summariesMap.get(profile.id) || null,
          weekCompliance:
            week && week.planned > 0
              ? Math.round((week.completed / week.planned) * 100)
              : null,
        }
      })

      setClients(clientsWithNutrition)
    } catch (err) {
      console.error('Error loading clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.full_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'with_plan' && client.nutrition_plan) ||
      (filter === 'without_plan' && !client.nutrition_plan) ||
      (filter === 'needs_review' &&
        client.todaySummary &&
        !client.todaySummary.coach_seen)
    return matchesSearch && matchesFilter
  })

  const withPlanCount = clients.filter((c) => c.nutrition_plan).length
  const needsReviewCount = clients.filter(
    (c) => c.todaySummary && !c.todaySummary.coach_seen
  ).length
  const avgCompliance = (() => {
    const withData = clients.filter((c) => c.weekCompliance !== null)
    if (withData.length === 0) return null
    return Math.round(
      withData.reduce((s, c) => s + (c.weekCompliance || 0), 0) / withData.length
    )
  })()

  if (loading) {
    return (
      <div className="pb-32 animate-pulse">
        <div className="h-8 w-40 bg-[rgba(253,253,254,0.08)] rounded-lg mb-2" />
        <div className="h-3 w-56 bg-[rgba(253,253,254,0.06)] rounded mb-6" />
        <div className="grid grid-cols-2 gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[rgba(71,75,72,0.55)] rounded-[18px] h-24"
            />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[rgba(71,75,72,0.55)] rounded-[18px] h-24"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between pb-[22px] px-0.5 gap-3">
        <div className="min-w-0">
          <h1
            className="text-[30px] font-light tracking-[-0.025em] leading-[1.1] text-[#FDFDFE]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Voeding
          </h1>
          <div className="mt-1.5 text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
            {clients.length} {clients.length === 1 ? 'cliënt' : 'cliënten'}
            {withPlanCount > 0 && ` · ${withPlanCount} met plan`}
          </div>
        </div>
        <Link
          href="/coach/nutrition/new"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-opacity active:opacity-70"
          style={{
            background: '#474B48',
            color: '#FDFDFE',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          <Plus strokeWidth={1.75} className="w-4 h-4" />
          Nieuw plan
        </Link>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <StatTile label="Cliënten" value={clients.length} />
        <StatTile
          label="Met plan"
          value={withPlanCount}
          accent={withPlanCount > 0 ? MACRO.protein : undefined}
        />
        <StatTile
          label="Te bekijken"
          value={needsReviewCount}
          accent={needsReviewCount > 0 ? MACRO.carbs : undefined}
        />
        <StatTile
          label="Gem. compliance"
          value={avgCompliance !== null ? `${avgCompliance}%` : '—'}
          accent={
            avgCompliance !== null && avgCompliance >= 80
              ? MACRO.protein
              : avgCompliance !== null && avgCompliance >= 50
              ? MACRO.carbs
              : undefined
          }
        />
      </div>

      {/* ─── Success / Error banners ─── */}
      {assignSuccess && (
        <div className="mb-4 px-4 py-3 rounded-[14px] bg-[rgba(192,252,1,0.10)] flex items-center gap-2 text-[13px]">
          <CheckCircle strokeWidth={1.75} className="w-4 h-4 text-[#C0FC01] shrink-0" />
          <span className="text-[#C0FC01]">{assignSuccess}</span>
        </div>
      )}
      {assignError && (
        <div className="mb-4 px-4 py-3 rounded-[14px] bg-[rgba(232,108,60,0.10)] flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <AlertCircle strokeWidth={1.75} className="w-4 h-4 text-[#E86C3C] shrink-0" />
            <span className="text-[#E86C3C]">{assignError}</span>
          </div>
          <button
            onClick={() => setAssignError(null)}
            className="text-[rgba(253,253,254,0.40)] hover:text-[#FDFDFE]"
            aria-label="Sluiten"
          >
            <X strokeWidth={1.75} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Voedingsplan templates ─── */}
      <SectionHeader label="Voedingsplan templates" count={templates.length} />
      {templates.length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {templates.map((template) => {
            const meals = Array.isArray(template.meals) ? template.meals : []
            return (
              <TemplateCard
                key={template.id}
                id={template.id}
                title={template.title}
                kcal={template.calories_target}
                p={template.protein_g}
                c={template.carbs_g}
                f={template.fat_g}
                mealNames={meals.map((m) => (m as { name?: string })?.name || '').filter(Boolean)}
                onAssign={() => setShowAssignModal(template.id)}
              />
            )
          })}
        </div>
      ) : (
        <EmptyTemplates />
      )}

      {/* ─── Standaard templates ─── */}
      {prebuiltTemplates.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 mt-4 mb-2.5 px-0.5">
            <Zap strokeWidth={1.75} className="w-3.5 h-3.5 text-[#C0FC01]" />
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.36)]">
              Standaard templates
            </span>
          </div>
          <div className="flex flex-col gap-2 mb-6">
            {prebuiltTemplates.map((tpl) => (
              <PrebuiltTemplateCard
                key={tpl.id}
                tpl={tpl}
                onAssign={() => setShowPrebuiltAssign(tpl.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ─── Search + filters ─── */}
      <SectionHeader label="Cliënten" count={clients.length} />
      <div className="relative mb-3">
        <Search
          strokeWidth={1.75}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(253,253,254,0.44)]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoek cliënt..."
          className="w-full pl-10 pr-4 py-2.5 rounded-full text-[13px] placeholder:text-[rgba(253,253,254,0.40)] focus:outline-none"
          style={{
            background: 'rgba(253,253,254,0.06)',
            color: '#FDFDFE',
          }}
        />
      </div>
      <div
        className="flex gap-1.5 mb-[18px] overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {[
          { key: 'all' as const, label: 'Alle', count: clients.length },
          { key: 'with_plan' as const, label: 'Met plan', count: withPlanCount },
          { key: 'without_plan' as const, label: 'Zonder plan' },
          {
            key: 'needs_review' as const,
            label: 'Te bekijken',
            count: needsReviewCount,
            alert: true,
          },
        ].map((f) => (
          <FilterPill
            key={f.key}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
            label={f.label}
            count={f.count}
            alert={'alert' in f ? f.alert : false}
          />
        ))}
      </div>

      {/* ─── Client list ─── */}
      {filteredClients.length === 0 ? (
        <div className="bg-[rgba(71,75,72,0.55)] rounded-[18px] px-6 py-10 text-center">
          <p className="text-[14px] text-[rgba(253,253,254,0.62)] m-0">
            {searchQuery ? 'Geen cliënten gevonden' : 'Nog geen cliënten'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredClients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>
      )}

      {/* ─── Assign prebuilt modal ─── */}
      {showPrebuiltAssign && (
        <AssignModal
          title="Template toewijzen"
          subtitle={`${
            prebuiltTemplates.find((t) => t.id === showPrebuiltAssign)?.title
          } — kies een cliënt`}
          clients={clients}
          assigning={assigning}
          error={assignError}
          onPick={(clientId) => assignPrebuiltToClient(showPrebuiltAssign, clientId)}
          onClose={() => setShowPrebuiltAssign(null)}
        />
      )}

      {/* ─── Assign custom template modal ─── */}
      {showAssignModal && (
        <AssignModal
          title="Voedingsplan toewijzen"
          subtitle="Kies een cliënt om dit plan aan toe te wijzen"
          clients={clients}
          assigning={assigning}
          error={assignError}
          onPick={(clientId) => assignTemplateToClient(showAssignModal, clientId)}
          onClose={() => setShowAssignModal(null)}
        />
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div
      className="rounded-[18px] px-[14px] py-[12px]"
      style={{ background: '#474B48' }}
    >
      <div
        className="text-[10.5px] uppercase tracking-[0.14em]"
        style={{ color: accent || 'rgba(253,253,254,0.44)' }}
      >
        {label}
      </div>
      <div
        className="text-[24px] font-light leading-[1.1] mt-1 tracking-[-0.02em]"
        style={{
          color: '#FDFDFE',
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mt-1 mb-[10px] mx-0.5 text-[10.5px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.36)]">
      <span>{label}</span>
      <span className="tracking-[0.04em]">{count}</span>
    </div>
  )
}

function TemplateCard({
  id,
  title,
  kcal,
  p,
  c,
  f,
  mealNames,
  onAssign,
}: {
  id: string
  title: string
  kcal: number | null
  p: number | null
  c: number | null
  f: number | null
  mealNames: string[]
  onAssign: () => void
}) {
  const cleanTitle = title.replace(/\s*—\s*Template\s*$/i, '')
  return (
    <div className="bg-[#474B48] rounded-[18px] px-[16px] py-[14px]">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium text-[#FDFDFE] tracking-[-0.005em] truncate m-0">
            {cleanTitle}
          </h3>
          {kcal !== null && (
            <div className="mt-1.5 flex items-center gap-2 text-[12px] tracking-[-0.005em]">
              <span className="text-[#FDFDFE] font-medium">{kcal} kcal</span>
              <span className="text-[rgba(253,253,254,0.30)]">·</span>
              <MacroPill value={p} unit="P" color={MACRO.protein} />
              <MacroPill value={c} unit="K" color={MACRO.carbs} />
              <MacroPill value={f} unit="V" color={MACRO.fat} />
            </div>
          )}
        </div>
      </div>

      {mealNames.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {mealNames.slice(0, 5).map((name, i) => (
            <span
              key={i}
              className="text-[10.5px] text-[rgba(253,253,254,0.55)] tracking-[0.02em]"
            >
              {name}
              {i < Math.min(mealNames.length, 5) - 1 && (
                <span className="ml-1 text-[rgba(253,253,254,0.28)]">·</span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <Link
          href={`/coach/nutrition/${id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium bg-[rgba(253,253,254,0.06)] text-[rgba(253,253,254,0.82)] transition-opacity active:opacity-70"
        >
          <Pencil strokeWidth={1.75} className="w-3.5 h-3.5" />
          Bewerken
        </Link>
        <button
          type="button"
          onClick={onAssign}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01] transition-opacity active:opacity-70"
        >
          <Copy strokeWidth={1.75} className="w-3.5 h-3.5" />
          Toewijzen
        </button>
      </div>
    </div>
  )
}

function MacroPill({
  value,
  unit,
  color,
}: {
  value: number | null
  unit: string
  color: string
}) {
  if (value === null) return null
  return (
    <span
      className="tabular-nums"
      style={{ color }}
    >
      {value}
      <span className="ml-[1px] text-[10px] opacity-70">{unit}</span>
    </span>
  )
}

function PrebuiltTemplateCard({
  tpl,
  onAssign,
}: {
  tpl: PrebuiltTemplate
  onAssign: () => void
}) {
  return (
    <div className="bg-[rgba(71,75,72,0.55)] rounded-[18px] px-[16px] py-[14px]">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium text-[#FDFDFE] tracking-[-0.005em] m-0">
            {tpl.title}
          </h3>
          <p className="mt-1 text-[12.5px] text-[rgba(253,253,254,0.62)] leading-[1.42] m-0">
            {tpl.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[12px] mb-2 tracking-[-0.005em]">
        <span className="text-[#FDFDFE] font-medium">{tpl.calories_target} kcal</span>
        <span className="text-[rgba(253,253,254,0.30)]">·</span>
        <MacroPill value={tpl.protein_g} unit="P" color={MACRO.protein} />
        <MacroPill value={tpl.carbs_g} unit="K" color={MACRO.carbs} />
        <MacroPill value={tpl.fat_g} unit="V" color={MACRO.fat} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {tpl.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10.5px] text-[rgba(253,253,254,0.55)] tracking-[0.02em]"
            >
              #{tag}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onAssign}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01] whitespace-nowrap shrink-0"
        >
          <Copy strokeWidth={1.75} className="w-3.5 h-3.5" />
          Toewijzen
        </button>
      </div>
    </div>
  )
}

function EmptyTemplates() {
  return (
    <div className="bg-[rgba(71,75,72,0.55)] rounded-[18px] px-6 py-8 text-center mb-4">
      <p className="text-[13px] text-[rgba(253,253,254,0.62)] m-0 mb-3">
        Nog geen templates. Maak er één aan om snel toe te wijzen.
      </p>
      <Link
        href="/coach/nutrition/new"
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01]"
      >
        <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
        Eerste template maken
      </Link>
    </div>
  )
}

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

function ClientRow({ client }: { client: ClientNutrition }) {
  const summary = client.todaySummary
  const plan = client.nutrition_plan
  const compliance = client.weekCompliance
  const initials = client.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link
      href={`/coach/clients/${client.id}/nutrition`}
      className="block bg-[#474B48] rounded-[18px] px-[14px] py-[12px] active:bg-[#4d524e] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
          style={{ background: 'rgba(253,253,254,0.14)', color: '#FDFDFE' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[14.5px] font-medium text-[#FDFDFE] truncate m-0 tracking-[-0.005em]">
              {client.full_name}
            </p>
            {summary && !summary.coach_seen && (
              <span
                className="w-[6px] h-[6px] rounded-full bg-[#E8A93C] shrink-0"
                title="Nog niet bekeken"
              />
            )}
          </div>
          {plan ? (
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="text-[#C0FC01] font-medium truncate">{plan.title}</span>
              <span className="text-[rgba(253,253,254,0.30)]">·</span>
              <span className="text-[rgba(253,253,254,0.62)]">
                {plan.calories_target} kcal
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-[#E8A93C]">Geen plan</span>
          )}
        </div>
        {compliance !== null && (
          <div
            className="shrink-0 text-[12px] font-medium tabular-nums tracking-[-0.01em]"
            style={{
              color:
                compliance >= 80
                  ? MACRO.protein
                  : compliance >= 50
                  ? MACRO.carbs
                  : '#E86C3C',
            }}
          >
            {compliance}%
          </div>
        )}
        <ChevronRight
          strokeWidth={1.75}
          className="w-4 h-4 text-[rgba(253,253,254,0.40)] shrink-0"
        />
      </div>
      {summary && summary.meals_planned > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-[rgba(253,253,254,0.06)] flex items-center gap-3 text-[11.5px]">
          <span className="text-[rgba(253,253,254,0.62)] tracking-[-0.005em]">
            Vandaag ·{' '}
            <span className="text-[#FDFDFE] font-medium">
              {summary.meals_completed}/{summary.meals_planned}
            </span>
          </span>
          {summary.total_calories > 0 && (
            <span className="text-[rgba(253,253,254,0.62)]">
              <span className="text-[#E8A93C] font-medium">
                {summary.total_calories}
              </span>{' '}
              kcal
            </span>
          )}
          {summary.water_liters ? (
            <span className="flex items-center gap-1 text-[rgba(253,253,254,0.62)]">
              <Droplets strokeWidth={1.75} className="w-3 h-3 text-[#A4C7F2]" />
              {summary.water_liters}L
            </span>
          ) : null}
          {summary.mood && (
            <span
              className="text-[13px] leading-none"
              title={`Mood: ${summary.mood}`}
            >
              {MOOD_EMOJI[summary.mood] || '😐'}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

function AssignModal({
  title,
  subtitle,
  clients,
  assigning,
  error,
  onPick,
  onClose,
}: {
  title: string
  subtitle: string
  clients: ClientNutrition[]
  assigning: boolean
  error: string | null
  onPick: (clientId: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(10,14,11,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] max-h-[80dvh] flex flex-col rounded-[22px] overflow-hidden"
        style={{ background: '#2F3230' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-medium text-[#FDFDFE] m-0 tracking-[-0.01em]">
              {title}
            </h3>
            <p className="text-[12.5px] text-[rgba(253,253,254,0.62)] m-0 mt-0.5">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[rgba(253,253,254,0.62)] hover:bg-[rgba(253,253,254,0.06)] shrink-0"
            aria-label="Sluiten"
          >
            <X strokeWidth={1.75} className="w-4 h-4" />
          </button>
        </div>
        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-[10px] bg-[rgba(232,108,60,0.10)] text-[#E86C3C] text-[12.5px]">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {clients.length === 0 ? (
            <p className="text-center text-[13px] text-[rgba(253,253,254,0.62)] py-8">
              Nog geen cliënten
            </p>
          ) : (
            clients.map((client) => {
              const initials = client.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
              return (
                <button
                  key={client.id}
                  onClick={() => onPick(client.id)}
                  disabled={assigning}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-[rgba(253,253,254,0.05)] transition-colors text-left disabled:opacity-50"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
                    style={{
                      background: 'rgba(253,253,254,0.14)',
                      color: '#FDFDFE',
                    }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#FDFDFE] font-medium truncate m-0 tracking-[-0.005em]">
                      {client.full_name}
                    </p>
                    <p className="text-[11.5px] text-[rgba(253,253,254,0.55)] truncate m-0 mt-0.5">
                      {client.nutrition_plan
                        ? `Huidig: ${client.nutrition_plan.title}`
                        : 'Geen plan'}
                    </p>
                  </div>
                  {assigning ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[rgba(253,253,254,0.62)]" />
                  ) : (
                    <Copy
                      strokeWidth={1.75}
                      className="w-4 h-4 text-[rgba(253,253,254,0.40)]"
                    />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
