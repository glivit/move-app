'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Apple, ChevronRight, Search, Eye, CheckCircle, AlertCircle, Droplets, Copy, BookOpen, Users, Loader2, Plus } from 'lucide-react'

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
  weekCompliance: number | null // percentage 0-100
}

const MOOD_EMOJI: Record<string, string> = {
  great: '😄',
  good: '🙂',
  ok: '😐',
  bad: '😞',
  terrible: '😢',
}

interface NutritionTemplate {
  id: string
  title: string
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  meals: any
  guidelines: string | null
  created_at: string
}

export default function NutritionOverviewPage() {
  const [clients, setClients] = useState<ClientNutrition[]>([])
  const [templates, setTemplates] = useState<NutritionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'with_plan' | 'without_plan' | 'needs_review'>('all')
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  async function assignTemplateToClient(templateId: string, clientId: string) {
    setAssigning(true)
    try {
      const supabase = createClient()
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      // Deactivate existing plans for this client
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('client_id', clientId)
        .eq('is_active', true)

      // Copy template to client
      await supabase.from('nutrition_plans').insert({
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

      setShowAssignModal(null)
      loadClients() // Refresh
    } catch (err) {
      console.error('Failed to assign template:', err)
    } finally {
      setAssigning(false)
    }
  }

  async function loadClients() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get coach id
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCoachId(user.id)

      // Get templates (plans linked to coach profile)
      if (user) {
        const { data: templateData } = await supabase
          .from('nutrition_plans')
          .select('id, title, calories_target, protein_g, carbs_g, fat_g, meals, guidelines, created_at')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })

        setTemplates(templateData || [])
      }

      // Get all clients
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, package')
        .eq('role', 'client')
        .order('full_name')

      if (!profilesData) {
        setClients([])
        return
      }

      // Get active nutrition plans
      const { data: plansData } = await supabase
        .from('nutrition_plans')
        .select('id, client_id, title, calories_target, protein_g, carbs_g, fat_g, is_active, created_at')
        .eq('is_active', true)

      const plansMap = new Map<string, any>()
      if (plansData) {
        plansData.forEach((plan: any) => {
          plansMap.set(plan.client_id, plan)
        })
      }

      // Get today's summaries
      const today = new Date().toISOString().split('T')[0]
      const { data: summariesData } = await supabase
        .from('nutrition_daily_summary')
        .select('*')
        .eq('date', today)

      const summariesMap = new Map<string, DailySummary>()
      if (summariesData) {
        summariesData.forEach((s: any) => {
          summariesMap.set(s.client_id, s)
        })
      }

      // Get last 7 days summaries for compliance calc
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
        weekData.forEach((d: any) => {
          const existing = weekMap.get(d.client_id) || { planned: 0, completed: 0 }
          existing.planned += d.meals_planned || 0
          existing.completed += d.meals_completed || 0
          weekMap.set(d.client_id, existing)
        })
      }

      const clientsWithNutrition: ClientNutrition[] = profilesData.map((profile: any) => {
        const week = weekMap.get(profile.id)
        return {
          id: profile.id,
          full_name: profile.full_name || 'Onbekend',
          avatar_url: profile.avatar_url,
          package: profile.package,
          nutrition_plan: plansMap.get(profile.id) || null,
          todaySummary: summariesMap.get(profile.id) || null,
          weekCompliance: week && week.planned > 0
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
    const matchesSearch = client.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'with_plan' && client.nutrition_plan) ||
      (filter === 'without_plan' && !client.nutrition_plan) ||
      (filter === 'needs_review' && client.todaySummary && !client.todaySummary.coach_seen)
    return matchesSearch && matchesFilter
  })

  const withPlanCount = clients.filter((c) => c.nutrition_plan).length
  const needsReviewCount = clients.filter((c) => c.todaySummary && !c.todaySummary.coach_seen).length
  const avgCompliance = (() => {
    const withData = clients.filter((c) => c.weekCompliance !== null)
    if (withData.length === 0) return null
    return Math.round(withData.reduce((s, c) => s + (c.weekCompliance || 0), 0) / withData.length)
  })()

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#8B6914] border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">
              Voeding
            </h1>
            <p className="text-[13px] text-[#8E8E93]">
              Voedingsplannen en dagelijkse compliance van je cliënten
            </p>
          </div>
          <Link
            href="/coach/nutrition/new"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-[14px] transition-all hover:opacity-90 text-white bg-[#1A1A18]"
          >
            <Plus size={18} strokeWidth={1.5} />
            Nieuw plan
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
            <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide">Cliënten</p>
            <p className="text-2xl font-bold text-[#1A1A18] mt-2">{clients.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
            <p className="text-[12px] text-[#34C759] uppercase font-medium tracking-wide">Met plan</p>
            <p className="text-2xl font-bold text-[#1A1A18] mt-2">{withPlanCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
            <p className="text-[12px] text-[#FF9500] uppercase font-medium tracking-wide">Te bekijken</p>
            <p className="text-2xl font-bold text-[#1A1A18] mt-2">{needsReviewCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
            <p className="text-[12px] text-[#007AFF] uppercase font-medium tracking-wide">Gem. compliance</p>
            <p className="text-2xl font-bold text-[#1A1A18] mt-2">
              {avgCompliance !== null ? `${avgCompliance}%` : '—'}
            </p>
          </div>
        </div>

        {/* Nutrition Templates */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen strokeWidth={1.5} className="w-4 h-4 text-[#8B6914]" />
                <h2 className="text-[15px] font-semibold text-[#1A1A18]">Voedingsplan templates</h2>
              </div>
              <Link
                href="/coach/nutrition/new"
                className="text-[12px] font-semibold text-[#8B6914] hover:underline"
              >
                + Nieuwe template
              </Link>
            </div>
        {templates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((template) => {
                const meals = Array.isArray(template.meals) ? template.meals : []
                return (
                  <div
                    key={template.id}
                    className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-[15px] font-semibold text-[#1A1A18]">{template.title}</h3>
                        <p className="text-[13px] text-[#8E8E93] mt-1">
                          {template.calories_target} kcal · {template.protein_g}g eiwit · {template.carbs_g}g koolh · {template.fat_g}g vet
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAssignModal(template.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B6914] text-white text-[12px] font-semibold rounded-full hover:bg-[#7A5C12] transition-colors flex-shrink-0"
                      >
                        <Copy strokeWidth={1.5} className="w-3.5 h-3.5" />
                        Toewijzen
                      </button>
                    </div>
                    {meals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {meals.map((meal: any, i: number) => (
                          <span key={i} className="text-[11px] bg-[#F5F0E8] text-[#8B6914] px-2 py-0.5 rounded-full">
                            {meal.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
        ) : (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-[#C7C7CC] text-center">
              <BookOpen strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#C7C7CC]" />
              <p className="text-[14px] font-medium text-[#8E8E93] mb-2">Nog geen templates</p>
              <p className="text-[12px] text-[#C7C7CC] mb-4">Maak een voedingsplan template aan om snel toe te wijzen aan cliënten</p>
              <Link
                href="/coach/nutrition/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#8B6914] text-white hover:bg-[#7A5C12] transition-colors"
              >
                <Plus size={16} /> Eerste template maken
              </Link>
            </div>
        )}
          </div>

        {/* Assign Template Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-[#F0F0ED]">
                <h3 className="text-[17px] font-semibold text-[#1A1A18]">Voedingsplan toewijzen</h3>
                <p className="text-[13px] text-[#8E8E93] mt-1">Kies een cliënt om dit plan aan toe te wijzen</p>
              </div>
              <div className="p-3 max-h-[60vh] overflow-y-auto">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => assignTemplateToClient(showAssignModal, client.id)}
                    disabled={assigning}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FAFAFA] transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                      style={{ backgroundColor: '#F5F5F3', color: '#8B6914' }}
                    >
                      {client.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-[#1A1A18] font-medium truncate">{client.full_name}</p>
                      <p className="text-[12px] text-[#8E8E93]">
                        {client.nutrition_plan ? `Huidig: ${client.nutrition_plan.title}` : 'Geen plan'}
                      </p>
                    </div>
                    {assigning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#8B6914]" />
                    ) : (
                      <Copy strokeWidth={1.5} className="w-4 h-4 text-[#C7C7CC]" />
                    )}
                  </button>
                ))}
                {clients.length === 0 && (
                  <p className="text-center text-[14px] text-[#8E8E93] py-8">Nog geen cliënten</p>
                )}
              </div>
              <div className="p-3 border-t border-[#F0F0ED]">
                <button
                  onClick={() => setShowAssignModal(null)}
                  className="w-full py-2.5 text-[14px] font-medium text-[#8E8E93] hover:text-[#1A1A18] transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C7C7CC]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek cliënt..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border text-[14px] bg-white"
              style={{ borderColor: '#F0F0ED', color: '#1A1A18' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Alle' },
              { key: 'with_plan', label: 'Met plan' },
              { key: 'without_plan', label: 'Zonder plan' },
              { key: 'needs_review', label: 'Te bekijken' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors border whitespace-nowrap"
                style={{
                  backgroundColor: filter === f.key ? '#8B6914' : 'white',
                  color: filter === f.key ? 'white' : '#8E8E93',
                  borderColor: filter === f.key ? '#8B6914' : '#F0F0ED',
                }}
              >
                {f.label}
                {f.key === 'needs_review' && needsReviewCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: filter === f.key ? 'rgba(255,255,255,0.3)' : '#FF9500',
                      color: filter === f.key ? 'white' : 'white',
                    }}
                  >
                    {needsReviewCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Client List */}
        <div className="space-y-3">
          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <Apple strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#C7C7CC]" />
              <p className="text-[14px] text-[#8E8E93]">
                {searchQuery ? 'Geen cliënten gevonden' : 'Nog geen cliënten'}
              </p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const summary = client.todaySummary
              const plan = client.nutrition_plan
              const compliance = client.weekCompliance

              return (
                <Link
                  key={client.id}
                  href={`/coach/clients/${client.id}/nutrition`}
                  className="block bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all group"
                >
                  <div className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-semibold shrink-0"
                        style={{ backgroundColor: '#F5F5F3', color: '#8B6914' }}
                      >
                        {client.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>

                      {/* Client Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[15px] font-semibold text-[#1A1A18] truncate">
                            {client.full_name}
                          </p>
                          {client.package && (
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: '#F5F5F3', color: '#8E8E93' }}
                            >
                              {client.package}
                            </span>
                          )}
                          {summary && !summary.coach_seen && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500] shrink-0" title="Nog niet bekeken" />
                          )}
                        </div>

                        {plan ? (
                          <div className="flex items-center gap-3 text-[13px]">
                            <span className="text-[#34C759] font-medium">
                              {plan.title}
                            </span>
                            <span className="text-[#C7C7CC]">•</span>
                            <span className="text-[#8E8E93]">
                              {plan.calories_target} kcal
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[13px]">
                            <span className="text-[#FF9500] font-medium">Geen plan</span>
                            <span className="text-[#C7C7CC]">—</span>
                            <span className="text-[#8E8E93]">Klik om een voedingsplan aan te maken</span>
                          </div>
                        )}
                      </div>

                      {/* Compliance Badge */}
                      {compliance !== null && (
                        <div className="shrink-0 text-center hidden sm:block">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold border-2"
                            style={{
                              color: compliance >= 80 ? '#34C759' : compliance >= 50 ? '#FF9500' : '#FF3B30',
                              borderColor: compliance >= 80 ? '#34C759' : compliance >= 50 ? '#FF9500' : '#FF3B30',
                              backgroundColor: compliance >= 80 ? '#34C759' + '10' : compliance >= 50 ? '#FF9500' + '10' : '#FF3B30' + '10',
                            }}
                          >
                            {compliance}%
                          </div>
                          <p className="text-[10px] text-[#C7C7CC] mt-1">7 dagen</p>
                        </div>
                      )}

                      {/* Arrow */}
                      <ChevronRight
                        strokeWidth={1.5}
                        className="w-5 h-5 text-[#C7C7CC] group-hover:text-[#8B6914] transition-colors shrink-0"
                      />
                    </div>

                    {/* Today's compliance strip */}
                    {summary && summary.meals_planned > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#F0F0ED] flex items-center gap-4 text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle strokeWidth={1.5} className="w-3.5 h-3.5 text-[#34C759]" />
                          <span className="text-[#8E8E93]">
                            Vandaag: <span className="font-semibold text-[#1A1A18]">{summary.meals_completed}/{summary.meals_planned}</span> maaltijden
                          </span>
                        </div>
                        {summary.total_calories > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#FF9500] font-semibold">{summary.total_calories}</span>
                            <span className="text-[#C7C7CC]">kcal</span>
                          </div>
                        )}
                        {summary.water_liters && (
                          <div className="flex items-center gap-1">
                            <Droplets strokeWidth={1.5} className="w-3.5 h-3.5 text-[#007AFF]" />
                            <span className="text-[#8E8E93]">{summary.water_liters}L</span>
                          </div>
                        )}
                        {summary.mood && (
                          <span className="text-[14px]" title={`Mood: ${summary.mood}`}>{MOOD_EMOJI[summary.mood] || '😐'}</span>
                        )}
                        {summary.daily_note && (
                          <span className="text-[#8E8E93] truncate max-w-[200px]" title={summary.daily_note}>
                            &ldquo;{summary.daily_note}&rdquo;
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
