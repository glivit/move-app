'use client'

import { useState, useEffect } from 'react'
import {
  Zap, Plus, Power, Trash2, Edit3, ChevronDown, ChevronUp,
  MessageSquare, Bell, ClipboardCheck, AlertTriangle,
  Timer, Dumbbell, Trophy, Calendar, Heart, Scale, Star, X,
  Activity, Check, Loader2
} from 'lucide-react'

interface AutomationRule {
  id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_type: string
  trigger_config: Record<string, any>
  action_type: string
  action_config: Record<string, any>
  target: string
  target_config: Record<string, any>
  cooldown_hours: number
  total_triggers: number
  created_at: string
}

const TRIGGER_OPTIONS = [
  { value: 'days_inactive', label: 'Dagen inactief', icon: Timer, description: 'Client heeft X dagen niet getraind', configLabel: 'Aantal dagen', configKey: 'days', configDefault: 3 },
  { value: 'workout_completed', label: 'Workout afgerond', icon: Dumbbell, description: 'Client rondt een workout af', configLabel: null, configKey: null, configDefault: null },
  { value: 'checkin_submitted', label: 'Check-in ingevuld', icon: ClipboardCheck, description: 'Client vult een check-in in', configLabel: null, configKey: null, configDefault: null },
  { value: 'streak_milestone', label: 'Streak milestone', icon: Trophy, description: 'Client bereikt X opeenvolgende trainingsdagen', configLabel: 'Aantal dagen streak', configKey: 'streak_days', configDefault: 7 },
  { value: 'first_workout', label: 'Eerste workout', icon: Star, description: 'Client voltooit allereerste workout', configLabel: null, configKey: null, configDefault: null },
  { value: 'missed_meals', label: 'Voeding niet gelogd', icon: Scale, description: 'Client logt X dagen geen voeding', configLabel: 'Aantal dagen', configKey: 'days', configDefault: 3 },
  { value: 'subscription_anniversary', label: 'Lid-jubileum', icon: Calendar, description: 'Client is X maanden lid', configLabel: 'Aantal maanden', configKey: 'months', configDefault: 1 },
]

const ACTION_OPTIONS = [
  { value: 'send_message', label: 'Bericht sturen', icon: MessageSquare, description: 'Stuur automatisch chatbericht', hasMessage: true },
  { value: 'send_notification', label: 'Push notificatie', icon: Bell, description: 'Stuur push notificatie', hasTitle: true, hasBody: true },
  { value: 'send_checkin_request', label: 'Check-in verzoek', icon: ClipboardCheck, description: 'Vraag om check-in in te vullen', hasMessage: true },
  { value: 'flag_at_risk', label: 'Markeer als risico', icon: AlertTriangle, description: 'Markeer client en stuur jou een melding', hasMessage: true },
]

const TEMPLATE_RULES = [
  {
    name: 'Motivatie bij inactiviteit',
    description: 'Stuur een motiverend bericht als client 3 dagen niet traint',
    trigger_type: 'days_inactive',
    trigger_config: { days: 3 },
    action_type: 'send_message',
    action_config: { message: 'Hey {first_name}! Ik merk dat je even niet getraind hebt. Alles goed? Laat me weten als ik ergens mee kan helpen. Samen komen we er wel! 💪' },
    cooldown_hours: 168,
  },
  {
    name: 'Felicitatie bij workout',
    description: 'Stuur push notificatie na elke voltooide workout',
    trigger_type: 'workout_completed',
    trigger_config: {},
    action_type: 'send_notification',
    action_config: { title: 'Goed bezig! 💪', body: 'Weer een workout afgerond, {first_name}! Keep it up!' },
    cooldown_hours: 24,
  },
  {
    name: 'Streak milestone (7 dagen)',
    description: 'Bericht bij 7 opeenvolgende trainingsdagen',
    trigger_type: 'streak_milestone',
    trigger_config: { streak_days: 7 },
    action_type: 'send_message',
    action_config: { message: 'Wauw {first_name}! 🔥 7 dagen op rij getraind — wat een discipline! Hou dit vol, je ziet snel resultaat.' },
    cooldown_hours: 168,
  },
  {
    name: 'Check-in herinnering',
    description: 'Herinner client als voeding 3 dagen niet gelogd is',
    trigger_type: 'missed_meals',
    trigger_config: { days: 3 },
    action_type: 'send_checkin_request',
    action_config: { message: 'Hey {first_name}! Ik zie dat je voeding nog niet gelogd is de laatste dagen. Het hoeft niet perfect te zijn — gewoon loggen helpt al enorm. Kan ik ergens mee helpen?' },
    cooldown_hours: 168,
  },
  {
    name: 'Welkom eerste workout',
    description: 'Feliciteer client na allereerste workout',
    trigger_type: 'first_workout',
    trigger_config: {},
    action_type: 'send_message',
    action_config: { message: 'Yes {first_name}! 🎉 Je eerste workout zit erop! Dit is het begin van iets moois. Hoe voelde het? Laat me weten als je vragen hebt!' },
    cooldown_hours: 8760,
  },
]

function getTriggerLabel(type: string) {
  return TRIGGER_OPTIONS.find(t => t.value === type)?.label || type
}

function getActionLabel(type: string) {
  return ACTION_OPTIONS.find(a => a.value === type)?.label || type
}

function getTriggerIcon(type: string) {
  const Icon = TRIGGER_OPTIONS.find(t => t.value === type)?.icon || Zap
  return Icon
}

function getActionIcon(type: string) {
  const Icon = ACTION_OPTIONS.find(a => a.value === type)?.icon || Bell
  return Icon
}

function formatCooldown(hours: number): string {
  if (hours >= 8760) return `${Math.round(hours / 8760)} jaar`
  if (hours >= 720) return `${Math.round(hours / 720)} maanden`
  if (hours >= 168) return `${Math.round(hours / 168)} week`
  if (hours >= 24) return `${Math.round(hours / 24)} dagen`
  return `${hours} uur`
}

export default function CoachAutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [tab, setTab] = useState<'rules' | 'templates'>('rules')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTriggerType, setFormTriggerType] = useState('days_inactive')
  const [formTriggerConfig, setFormTriggerConfig] = useState<Record<string, any>>({ days: 3 })
  const [formActionType, setFormActionType] = useState('send_message')
  const [formActionConfig, setFormActionConfig] = useState<Record<string, any>>({ message: '' })
  const [formTarget, setFormTarget] = useState('all_clients')
  const [formCooldown, setFormCooldown] = useState(168)

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    try {
      const res = await fetch('/api/automations')
      if (res.ok) {
        const data = await res.json()
        setRules(data.data || [])
      }
    } catch (err) {
      console.error('Error loading automations:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleRule(id: string, isActive: boolean) {
    setTogglingId(id)
    try {
      const res = await fetch('/api/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !isActive }),
      })
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !isActive } : r))
      }
    } catch (err) {
      console.error('Error toggling rule:', err)
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Weet je zeker dat je deze regel wilt verwijderen?')) return
    try {
      const res = await fetch(`/api/automations?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error('Error deleting rule:', err)
    }
  }

  function openCreateModal() {
    setEditingRule(null)
    setFormName('')
    setFormDescription('')
    setFormTriggerType('days_inactive')
    setFormTriggerConfig({ days: 3 })
    setFormActionType('send_message')
    setFormActionConfig({ message: '' })
    setFormTarget('all_clients')
    setFormCooldown(168)
    setShowModal(true)
  }

  function openEditModal(rule: AutomationRule) {
    setEditingRule(rule)
    setFormName(rule.name)
    setFormDescription(rule.description || '')
    setFormTriggerType(rule.trigger_type)
    setFormTriggerConfig(rule.trigger_config || {})
    setFormActionType(rule.action_type)
    setFormActionConfig(rule.action_config || {})
    setFormTarget(rule.target)
    setFormCooldown(rule.cooldown_hours)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim()) return
    setSaving(true)

    try {
      const payload = {
        ...(editingRule ? { id: editingRule.id } : {}),
        name: formName,
        description: formDescription || null,
        trigger_type: formTriggerType,
        trigger_config: formTriggerConfig,
        action_type: formActionType,
        action_config: formActionConfig,
        target: formTarget,
        cooldown_hours: formCooldown,
      }

      const res = await fetch('/api/automations', {
        method: editingRule ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowModal(false)
        await loadRules()
      }
    } catch (err) {
      console.error('Error saving rule:', err)
    } finally {
      setSaving(false)
    }
  }

  async function activateTemplate(template: typeof TEMPLATE_RULES[0]) {
    setSaving(true)
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          target: 'all_clients',
          target_config: {},
        }),
      })
      if (res.ok) {
        setTab('rules')
        await loadRules()
      }
    } catch (err) {
      console.error('Error activating template:', err)
    } finally {
      setSaving(false)
    }
  }

  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === formTriggerType)
  const selectedAction = ACTION_OPTIONS.find(a => a.value === formActionType)

  if (loading) {
    return (
      <div className="min-h-screen bg-client-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-semibold text-text-primary">Automatisering</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#A6ADA7] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-text-primary">Automatisering</h1>
          <p className="mt-2 text-[15px] text-client-text-secondary">
            Configureer automatische acties op basis van client-activiteit
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Nieuwe regel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
            tab === 'rules' ? 'bg-accent text-white' : 'bg-[#A6ADA7] border border-client-border text-text-primary hover:bg-client-surface-muted'
          }`}
        >
          Mijn regels ({rules.length})
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
            tab === 'templates' ? 'bg-accent text-white' : 'bg-[#A6ADA7] border border-client-border text-text-primary hover:bg-client-surface-muted'
          }`}
        >
          Templates
        </button>
      </div>

      {/* Rules tab */}
      {tab === 'rules' && (
        <>
          {rules.length === 0 ? (
            <div className="bg-[#A6ADA7] rounded-2xl p-8 border border-client-border text-center">
              <Zap size={48} strokeWidth={1.5} className="text-client-text-secondary mx-auto mb-3" />
              <p className="font-semibold text-text-primary text-lg">Nog geen automatiseringen</p>
              <p className="text-[14px] text-client-text-secondary mt-2">
                Maak een nieuwe regel aan of kies een template om te beginnen.
              </p>
              <button
                onClick={() => setTab('templates')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-accent text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
              >
                Bekijk templates
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => {
                const isExpanded = expandedRule === rule.id
                const TriggerIcon = getTriggerIcon(rule.trigger_type)
                const ActionIcon = getActionIcon(rule.action_type)

                return (
                  <div key={rule.id} className="bg-[#A6ADA7] rounded-2xl border border-client-border overflow-hidden">
                    <div
                      className="p-5 flex items-center gap-4 cursor-pointer hover:bg-client-surface-muted transition-colors"
                      onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        rule.is_active ? 'bg-[#2FA65A]/10' : 'bg-[#A6ADA7]'
                      }`}>
                        <TriggerIcon size={20} strokeWidth={1.5} className={rule.is_active ? 'text-[#2FA65A]' : 'text-gray-400'} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">{rule.name}</p>
                        <p className="text-[12px] text-client-text-secondary mt-0.5">
                          {getTriggerLabel(rule.trigger_type)} → {getActionLabel(rule.action_type)}
                          {rule.total_triggers > 0 && (
                            <span className="ml-2">• {rule.total_triggers}x getriggerd</span>
                          )}
                        </p>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleRule(rule.id, rule.is_active) }}
                        disabled={togglingId === rule.id}
                        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                          rule.is_active ? 'bg-[#2FA65A]' : 'bg-[#989F99]'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-[#A6ADA7] shadow transition-transform ${
                          rule.is_active ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>

                      {isExpanded ? (
                        <ChevronUp size={18} className="text-client-text-secondary shrink-0" />
                      ) : (
                        <ChevronDown size={18} className="text-client-text-secondary shrink-0" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-client-border px-5 py-4 space-y-4">
                        {rule.description && (
                          <p className="text-[14px] text-client-text-secondary">{rule.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-client-surface-muted rounded-xl p-3">
                            <p className="text-[11px] font-medium text-client-text-secondary uppercase tracking-wide mb-1">Trigger</p>
                            <div className="flex items-center gap-2">
                              <TriggerIcon size={16} className="text-accent" />
                              <span className="text-[14px] text-text-primary font-medium">{getTriggerLabel(rule.trigger_type)}</span>
                            </div>
                            {rule.trigger_config && Object.keys(rule.trigger_config).length > 0 && (
                              <p className="text-[12px] text-client-text-secondary mt-1">
                                {Object.entries(rule.trigger_config).map(([k, v]) => `${k}: ${v}`).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="bg-client-surface-muted rounded-xl p-3">
                            <p className="text-[11px] font-medium text-client-text-secondary uppercase tracking-wide mb-1">Actie</p>
                            <div className="flex items-center gap-2">
                              <ActionIcon size={16} className="text-accent" />
                              <span className="text-[14px] text-text-primary font-medium">{getActionLabel(rule.action_type)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Message preview */}
                        {(rule.action_config?.message || rule.action_config?.body) && (
                          <div className="bg-[#A6ADA7] rounded-xl p-3 border border-client-border">
                            <p className="text-[11px] font-medium text-client-text-secondary uppercase tracking-wide mb-1">Bericht</p>
                            <p className="text-[14px] text-text-primary italic">
                              &ldquo;{rule.action_config.message || rule.action_config.body}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-[12px] text-client-text-secondary">
                            <span>Cooldown: {formatCooldown(rule.cooldown_hours)}</span>
                            <span>•</span>
                            <span>Doelgroep: {rule.target === 'all_clients' ? 'Alle clients' : 'Specifiek'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(rule)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-text-primary hover:bg-client-surface-muted transition-colors"
                            >
                              <Edit3 size={14} />
                              Bewerk
                            </button>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#B55A4A] hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                              Verwijder
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="space-y-3">
          <p className="text-[14px] text-client-text-secondary mb-4">
            Klik op &ldquo;Activeer&rdquo; om een template direct te gebruiken. Je kunt hem daarna aanpassen.
          </p>
          {TEMPLATE_RULES.map((template, i) => {
            const TriggerIcon = getTriggerIcon(template.trigger_type)
            const existsAlready = rules.some(r => r.name === template.name)

            return (
              <div key={i} className="bg-[#A6ADA7] rounded-2xl border border-client-border p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <TriggerIcon size={20} strokeWidth={1.5} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">{template.name}</p>
                    <p className="text-[13px] text-client-text-secondary mt-0.5">{template.description}</p>
                    <div className="mt-2 bg-[#A6ADA7] rounded-lg p-2.5">
                      <p className="text-[12px] text-client-text-secondary italic">
                        &ldquo;{template.action_config.message || template.action_config.body}&rdquo;
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => activateTemplate(template)}
                    disabled={saving || existsAlready}
                    className={`px-4 py-2 rounded-xl text-[13px] font-medium shrink-0 transition-all ${
                      existsAlready
                        ? 'bg-[#A6ADA7] text-gray-400 cursor-not-allowed'
                        : 'bg-accent text-white hover:opacity-90'
                    }`}
                  >
                    {existsAlready ? (
                      <span className="flex items-center gap-1"><Check size={14} /> Actief</span>
                    ) : (
                      'Activeer'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[10vh] px-4 overflow-y-auto">
          <div className="bg-[#A6ADA7] rounded-2xl w-full max-w-lg shadow-xl mb-10">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-client-border">
              <h2 className="text-[18px] font-semibold text-text-primary">
                {editingRule ? 'Regel bewerken' : 'Nieuwe automatisering'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-[#A6ADA7] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Naam</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="bijv. Motivatie bij inactiviteit"
                  className="w-full px-4 py-2.5 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Beschrijving (optioneel)</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Korte beschrijving van deze regel"
                  className="w-full px-4 py-2.5 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Als... (trigger)</label>
                <select
                  value={formTriggerType}
                  onChange={(e) => {
                    setFormTriggerType(e.target.value)
                    const trigger = TRIGGER_OPTIONS.find(t => t.value === e.target.value)
                    if (trigger?.configKey) {
                      setFormTriggerConfig({ [trigger.configKey]: trigger.configDefault })
                    } else {
                      setFormTriggerConfig({})
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 bg-[#A6ADA7]"
                >
                  {TRIGGER_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
                  ))}
                </select>

                {selectedTrigger?.configKey && (
                  <div className="mt-3">
                    <label className="block text-[12px] text-client-text-secondary mb-1">{selectedTrigger.configLabel}</label>
                    <input
                      type="number"
                      min={1}
                      value={formTriggerConfig[selectedTrigger.configKey] || selectedTrigger.configDefault}
                      onChange={(e) => setFormTriggerConfig({ [selectedTrigger.configKey!]: parseInt(e.target.value) || 1 })}
                      className="w-24 px-3 py-2 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                )}
              </div>

              {/* Action */}
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Dan... (actie)</label>
                <select
                  value={formActionType}
                  onChange={(e) => {
                    setFormActionType(e.target.value)
                    setFormActionConfig({})
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 bg-[#A6ADA7]"
                >
                  {ACTION_OPTIONS.map(a => (
                    <option key={a.value} value={a.value}>{a.label} — {a.description}</option>
                  ))}
                </select>

                {/* Message input */}
                {selectedAction?.hasMessage && (
                  <div className="mt-3">
                    <label className="block text-[12px] text-client-text-secondary mb-1">
                      Bericht <span className="text-[11px]">(variabelen: {'{client_name}'}, {'{first_name}'})</span>
                    </label>
                    <textarea
                      value={formActionConfig.message || ''}
                      onChange={(e) => setFormActionConfig({ ...formActionConfig, message: e.target.value })}
                      placeholder="Typ je automatisch bericht..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                  </div>
                )}

                {/* Notification title + body */}
                {selectedAction?.hasTitle && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="block text-[12px] text-client-text-secondary mb-1">Titel</label>
                      <input
                        type="text"
                        value={formActionConfig.title || ''}
                        onChange={(e) => setFormActionConfig({ ...formActionConfig, title: e.target.value })}
                        placeholder="Notificatie titel"
                        className="w-full px-4 py-2.5 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] text-client-text-secondary mb-1">
                        Inhoud <span className="text-[11px]">(variabelen: {'{client_name}'}, {'{first_name}'})</span>
                      </label>
                      <textarea
                        value={formActionConfig.body || ''}
                        onChange={(e) => setFormActionConfig({ ...formActionConfig, body: e.target.value })}
                        placeholder="Notificatie tekst..."
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-client-border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cooldown */}
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Cooldown</label>
                <p className="text-[12px] text-client-text-secondary mb-2">Hoe lang wachten voor dezelfde client opnieuw getriggerd wordt</p>
                <div className="flex gap-2">
                  {[
                    { label: '1 dag', hours: 24 },
                    { label: '3 dagen', hours: 72 },
                    { label: '1 week', hours: 168 },
                    { label: '2 weken', hours: 336 },
                    { label: '1 maand', hours: 720 },
                  ].map(opt => (
                    <button
                      key={opt.hours}
                      onClick={() => setFormCooldown(opt.hours)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                        formCooldown === opt.hours
                          ? 'bg-accent text-white'
                          : 'bg-client-surface-muted text-text-primary hover:bg-[#989F99]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mx-5 mb-4 p-3 bg-[#A6ADA7] rounded-xl border border-client-border">
              <p className="text-[12px] font-medium text-client-text-secondary mb-1">Preview</p>
              <p className="text-[14px] text-text-primary">
                Als <strong>{getTriggerLabel(formTriggerType)}</strong>{' '}
                dan <strong>{getActionLabel(formActionType)}</strong>{' '}
                naar <strong>{formTarget === 'all_clients' ? 'alle clients' : 'geselecteerde clients'}</strong>
                {' '}(cooldown: {formatCooldown(formCooldown)})
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-client-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl text-[14px] font-medium text-text-primary hover:bg-[#A6ADA7] transition-colors"
              >
                Annuleer
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingRule ? 'Opslaan' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
