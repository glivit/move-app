'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { MealPlanForm } from '@/components/coach/MealPlanForm'
import { ArrowLeft, Plus, Archive, Check, Download, Zap } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface TemplateSummary {
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

interface MealPlan {
  id: string
  title: string
  description: string | null
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  pdf_url: string | null
  macros?: {
    protein: number
    carbs: number
    fat: number
    calories: number
  }
}

interface Profile {
  full_name: string
}

interface PageParams {
  id: string
}

export default function MealPlanPage() {
  const params = useParams() as unknown as PageParams
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [assigningTemplate, setAssigningTemplate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', params.id)
        .single()

      const { data: mealPlansData } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('client_id', params.id)
        .order('created_at', { ascending: false })

      setProfile(profileData)
      setMealPlans(mealPlansData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij laden van voedingsplannen')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivatePlan(planId: string) {
    try {
      setDeactivatingId(planId)
      const response = await fetch('/api/meal-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, is_active: false }),
      })

      if (!response.ok) throw new Error('Fout bij deactiveren van plan')

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij deactiveren van plan')
    } finally {
      setDeactivatingId(null)
    }
  }

  async function handleActivatePlan(planId: string) {
    try {
      setActivatingId(planId)
      const response = await fetch('/api/meal-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, is_active: true }),
      })

      if (!response.ok) throw new Error('Fout bij activeren van plan')

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij activeren van plan')
    } finally {
      setActivatingId(null)
    }
  }

  async function handleSavePlan() {
    await loadData()
    setShowForm(false)
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/template-diets')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch {
      // silent
    }
  }

  async function handleAssignTemplate(templateId: string) {
    try {
      setAssigningTemplate(templateId)
      const res = await fetch('/api/template-diets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, clientId: params.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fout bij toewijzen')
      }
      setShowTemplates(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij toewijzen van template')
    } finally {
      setAssigningTemplate(null)
    }
  }

  function openTemplates() {
    setShowTemplates(true)
    if (templates.length === 0) loadTemplates()
  }

  const clientName = profile?.full_name || 'Client'
  const activePlan = mealPlans.find((p) => p.is_active)
  const archivedPlans = mealPlans.filter((p) => !p.is_active)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-client-bg">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent-dark border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-client-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href={`/coach/clients/${params.id}`}
          className="inline-flex items-center gap-2 mb-8 text-[13px] font-medium transition-colors hover:opacity-75 text-text-primary"
        >
          <ArrowLeft strokeWidth={1.5} size={18} />
          Terug naar {clientName}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-semibold mb-2 text-text-primary">
              {clientName} — Voedingsplan
            </h1>
            <p className="text-[13px] text-client-text-secondary">
              Beheer en volg het voedingsplan van je client
            </p>
          </div>
          {!showForm && !showTemplates && (
            <div className="flex items-center gap-2">
              <button
                onClick={openTemplates}
                className="px-5 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap bg-[#F5F2EC] text-[#1A1917] border border-[#E5E1D9] hover:bg-[#EBE8E0]"
              >
                <Zap strokeWidth={1.5} size={18} />
                Template
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-3 rounded-2xl font-semibold text-white transition-all hover:opacity-90 flex items-center gap-2 whitespace-nowrap bg-accent-dark"
              >
                <Plus strokeWidth={1.5} size={20} />
                Nieuw plan
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Card className="rounded-2xl p-4 mb-6 bg-red-50 border-l-4 border-red-600">
            <p className="text-[13px] text-red-600">
              {error}
            </p>
          </Card>
        )}

        {/* Template Selection */}
        {showTemplates && (
          <Card className="rounded-2xl p-8 mb-10 bg-white shadow-clean border border-client-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">
                Kies een template
              </h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-[13px] text-client-text-secondary hover:text-text-primary transition-colors"
              >
                Annuleer
              </button>
            </div>
            <p className="text-[13px] text-client-text-secondary mb-6">
              Alle templates zijn high-protein en direct klaar voor gebruik. Je cliënt ziet meteen het plan op het dashboard.
            </p>
            {templates.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-dark border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleAssignTemplate(tpl.id)}
                    disabled={assigningTemplate !== null}
                    className="text-left p-5 rounded-xl border border-client-border hover:border-[#D46A3A]/40 hover:bg-[#FFF8F5] transition-all disabled:opacity-50 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[15px] text-text-primary group-hover:text-[#D46A3A] transition-colors">
                          {tpl.title}
                        </p>
                        <p className="text-[12px] text-client-text-secondary mt-1">
                          {tpl.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-[12px] text-client-text-secondary">
                          <span className="font-medium text-text-primary">{tpl.calories_target} kcal</span>
                          <span>P {tpl.protein_g}g</span>
                          <span>K {tpl.carbs_g}g</span>
                          <span>V {tpl.fat_g}g</span>
                          <span>{tpl.mealsCount} maaltijden</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tpl.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F2EC] text-[#6B6862]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {assigningTemplate === tpl.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent-dark border-t-transparent" />
                        ) : (
                          <span className="text-[12px] font-semibold text-[#D46A3A] opacity-0 group-hover:opacity-100 transition-opacity">
                            Toewijzen →
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* New Plan Form */}
        {showForm && (
          <Card className="rounded-2xl p-8 mb-10 bg-white shadow-clean border border-client-border">
            <h2 className="text-2xl font-bold mb-6 text-text-primary">
              Nieuw voedingsplan aanmaken
            </h2>
            <MealPlanForm clientId={params.id} onSave={handleSavePlan} />
            <div className="flex gap-3 mt-8 pt-6 border-t border-client-border">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-2xl font-medium transition-all bg-client-surface-muted text-text-primary border border-client-border hover:bg-gray-200"
              >
                Annuleren
              </button>
            </div>
          </Card>
        )}

        {/* Active Plan */}
        {activePlan && (
          <div className="mb-10">
            <h2 className="text-[15px] font-bold mb-4 text-text-primary">
              Actief plan
            </h2>
            <Card className="rounded-2xl p-8 bg-white shadow-clean border border-client-border">
              <div className="flex items-start justify-between gap-6 mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-text-primary">
                      {activePlan.title}
                    </h3>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-light text-accent-dark">
                      Actief
                    </span>
                  </div>

                  {activePlan.description && (
                    <p className="text-[13px] mb-4 text-client-text-secondary">
                      {activePlan.description}
                    </p>
                  )}

                  {/* Macro Info */}
                  {activePlan.macros && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 rounded-2xl bg-client-surface-muted">
                      <div>
                        <p className="text-[13px] mb-1 text-client-text-secondary">
                          Eiwitten
                        </p>
                        <p className="font-bold text-text-primary">
                          {activePlan.macros.protein}g
                        </p>
                      </div>
                      <div>
                        <p className="text-[13px] mb-1 text-client-text-secondary">
                          Koolhydraten
                        </p>
                        <p className="font-bold text-text-primary">
                          {activePlan.macros.carbs}g
                        </p>
                      </div>
                      <div>
                        <p className="text-[13px] mb-1 text-client-text-secondary">
                          Vetten
                        </p>
                        <p className="font-bold text-text-primary">
                          {activePlan.macros.fat}g
                        </p>
                      </div>
                      <div>
                        <p className="text-[13px] mb-1 text-client-text-secondary">
                          Calorieën
                        </p>
                        <p className="font-bold text-text-primary">
                          {activePlan.macros.calories} kcal
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Validity Dates */}
                  <div className="flex items-center gap-4 text-[13px] flex-wrap">
                    {activePlan.valid_from && (
                      <span className="text-client-text-secondary">
                        <strong>Van:</strong> {formatDate(activePlan.valid_from)}
                      </span>
                    )}
                    {activePlan.valid_until && (
                      <span className="text-client-text-secondary">
                        <strong>Tot:</strong> {formatDate(activePlan.valid_until)}
                      </span>
                    )}
                    <span className="text-client-text-secondary">
                      Gemaakt {formatDate(activePlan.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-6 border-t border-client-border">
                {activePlan.pdf_url && (
                  <a
                    href={activePlan.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-2xl font-medium transition-all inline-flex items-center gap-2 bg-client-surface-muted text-text-primary border border-client-border hover:bg-gray-200"
                  >
                    <Download strokeWidth={1.5} size={18} />
                    Download PDF
                  </a>
                )}
                <button
                  onClick={() => handleDeactivatePlan(activePlan.id)}
                  disabled={deactivatingId !== null}
                  className="px-4 py-2 rounded-2xl font-medium transition-all bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60"
                >
                  {deactivatingId === activePlan.id ? 'Deactiveren...' : 'Deactiveren'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Archived Plans */}
        {archivedPlans.length > 0 && (
          <div>
            <h2 className="text-[15px] font-bold mb-4 text-text-primary">
              Gearchiveerde plannen ({archivedPlans.length})
            </h2>
            <div className="space-y-4">
              {archivedPlans.map((plan) => (
                <Card key={plan.id} className="rounded-2xl p-6 bg-white shadow-clean border border-client-border">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-[15px] font-bold mb-2 text-text-primary">
                        {plan.title}
                      </h3>
                      {plan.description && (
                        <p className="text-[13px] mb-3 text-client-text-secondary">
                          {plan.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-[13px] flex-wrap">
                        {plan.valid_from && (
                          <span className="text-client-text-secondary">
                            <strong>Van:</strong> {formatDate(plan.valid_from)}
                          </span>
                        )}
                        {plan.valid_until && (
                          <span className="text-client-text-secondary">
                            <strong>Tot:</strong> {formatDate(plan.valid_until)}
                          </span>
                        )}
                        <span className="text-client-text-secondary">
                          Gemaakt {formatDate(plan.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {plan.pdf_url && (
                        <a
                          href={plan.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-2xl font-medium transition-all inline-flex items-center gap-1 text-[13px] bg-client-surface-muted text-text-primary border border-client-border hover:bg-gray-200"
                        >
                          <Download strokeWidth={1.5} size={16} />
                          PDF
                        </a>
                      )}
                      <button
                        onClick={() => handleActivatePlan(plan.id)}
                        disabled={activatingId !== null}
                        className="px-3 py-2 rounded-2xl font-medium transition-all inline-flex items-center gap-1 text-[13px] bg-accent-dark text-white hover:opacity-90 disabled:opacity-60"
                      >
                        <Check strokeWidth={1.5} size={16} />
                        {activatingId === plan.id ? 'Activeren...' : 'Activeren'}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {mealPlans.length === 0 && (
          <Card className="rounded-2xl p-12 text-center bg-white shadow-clean border border-client-border">
            <Archive
              size={48}
              strokeWidth={1.5}
              className="mx-auto mb-4 text-accent-dark"
            />
            <h2 className="text-2xl font-bold mb-2 text-text-primary">
              Nog geen voedingsplannen
            </h2>
            <p className="mb-8 text-client-text-secondary">
              Maak je eerste voedingsplan voor deze client
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-2xl font-semibold text-white transition-all hover:opacity-90 inline-flex items-center gap-2 bg-accent-dark"
            >
              <Plus strokeWidth={1.5} size={20} />
              Plan aanmaken
            </button>
          </Card>
        )}
      </div>
    </div>
  )
}
