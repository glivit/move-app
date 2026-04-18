'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, Send, X, Pencil, Check, Loader2 } from 'lucide-react'

interface Draft {
  id: string
  client_id: string
  content: string
  context_type: string
  context_data: Record<string, any>
  created_at: string
  profiles: { full_name: string; avatar_url: string | null } | null
}

const CONTEXT_LABELS: Record<string, string> = {
  workout_feedback: 'Workout feedback',
  missed_workout: 'Gemiste workout',
  missed_nutrition: 'Voeding niet gelogd',
  weekly_motivation: 'Weekmotivatie',
}

const CONTEXT_COLORS: Record<string, string> = {
  workout_feedback: 'bg-[#8A7BA8]/10 text-[#8A7BA8]',
  missed_workout: 'bg-[#D9A645]/10 text-[#D9A645]',
  missed_nutrition: 'bg-[#5A7FB5]/10 text-[#5A7FB5]',
  weekly_motivation: 'bg-[#2FA65A]/10 text-[#2FA65A]',
}

function timeSince(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'zojuist'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m geleden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  return `${days}d geleden`
}

export function AIDraftsPanel() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-drafts?status=pending')
      const data = await res.json()
      setDrafts(data.drafts || [])
    } catch (err) {
      console.error('Load drafts error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  async function handleAction(draftId: string, action: 'send' | 'dismiss' | 'edit_send', editedContent?: string) {
    setProcessingId(draftId)
    try {
      const res = await fetch('/api/ai-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, action, editedContent }),
      })
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draftId))
        setEditingId(null)
      }
    } catch (err) {
      console.error('Draft action error:', err)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="card-tactile overflow-hidden animate-pulse">
        <div className="px-6 py-4 border-b border-[#A6ADA7] flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#A6ADA7]" />
          <div className="h-4 w-32 bg-[#A6ADA7] rounded" />
        </div>
        <div className="px-6 py-6">
          <div className="h-3 w-48 bg-[#A6ADA7] rounded mb-3" />
          <div className="h-3 w-64 bg-[#A6ADA7] rounded" />
        </div>
      </div>
    )
  }

  if (drafts.length === 0) return null

  return (
    <div className="card-tactile overflow-hidden">
      <div className="px-6 py-4 border-b border-[#A6ADA7] flex items-center gap-2.5">
        <Bot className="w-4 h-4 text-[#8A7BA8]" strokeWidth={1.5} />
        <p className="text-[14px] font-semibold text-[#FDFDFE]">AI Concepten</p>
        <span className="text-[12px] text-[#E6E8E7] ml-auto font-medium">
          {drafts.length} te beoordelen
        </span>
      </div>

      {drafts.map((draft, index) => {
        const isEditing = editingId === draft.id
        const isProcessing = processingId === draft.id
        const clientName = draft.profiles?.full_name || 'Client'

        return (
          <div
            key={draft.id}
            className={`px-6 py-4 ${index !== drafts.length - 1 ? 'border-b border-[#A6ADA7]' : ''}`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-medium text-[#FDFDFE]">{clientName}</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CONTEXT_COLORS[draft.context_type] || 'bg-[#A6ADA7] text-[#E6E8E7]'}`}>
                  {CONTEXT_LABELS[draft.context_type] || draft.context_type}
                </span>
              </div>
              <span className="text-[12px] text-[#989F99]">{timeSince(draft.created_at)}</span>
            </div>

            {/* Message content */}
            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                rows={3}
                className="w-full px-3 py-2.5 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] focus:outline-none focus:border-[#FDFDFE] resize-none mb-3"
              />
            ) : (
              <p className="text-[14px] text-[#E6E8E7] leading-relaxed mb-3 whitespace-pre-wrap">
                {draft.content}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => handleAction(draft.id, 'edit_send', editText)}
                    disabled={isProcessing || !editText.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#474B48] text-white text-[13px] font-semibold hover:bg-[#333] transition-colors disabled:opacity-40"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Verstuur
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3.5 py-2 rounded-xl text-[13px] font-medium text-[#D6D9D6] hover:bg-[#A6ADA7] transition-colors"
                  >
                    Annuleren
                  </button>
                </>
              ) : (
                <>
                  {/* Send as-is */}
                  <button
                    onClick={() => handleAction(draft.id, 'send')}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#474B48] text-white text-[13px] font-semibold hover:bg-[#333] transition-colors disabled:opacity-40"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Verstuur
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => { setEditingId(draft.id); setEditText(draft.content) }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium text-[#E6E8E7] hover:bg-[#A6ADA7] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Bewerken
                  </button>

                  {/* Dismiss */}
                  <button
                    onClick={() => handleAction(draft.id, 'dismiss')}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium text-[#989F99] hover:text-[#B55A4A] hover:bg-[rgba(181,90,74,0.08)] transition-colors ml-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                    Verwijder
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
