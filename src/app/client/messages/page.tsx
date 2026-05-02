'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ChatBubble } from '@/components/client/ChatBubble'
import { ChatInput } from '@/components/client/ChatInput'
import { invalidateCache } from '@/lib/fetcher'
import { optimisticMutate } from '@/lib/optimistic'
import { readDashboardCache, writeDashboardCache } from '@/lib/dashboard-cache'
import type { DashboardData } from '@/app/client/DashboardClient'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: string
  file_url: string | null
  read_at: string | null
  created_at: string
}

function getDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (messageDate.getTime() === today.getTime()) return 'Vandaag'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (messageDate.getTime() === yesterday.getTime()) return 'Gisteren'
  return date.toLocaleDateString('nl-BE', { year: 'numeric', month: 'long', day: 'numeric' })
}

function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {}
  messages.forEach((msg) => {
    const key = getDateLabel(new Date(msg.created_at))
    if (!groups[key]) groups[key] = []
    groups[key].push(msg)
  })
  return groups
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

// v7 tokens — naming legacy (WHITE actually = ink-dark)
const CANVAS_BG =
  'radial-gradient(900px 700px at 0% 0%,    #EFE8D4 0%, transparent 55%),' +
  'radial-gradient(800px 700px at 100% 25%, #DCDBCF 0%, transparent 60%),' +
  'radial-gradient(700px 700px at 0% 100%,  #EBE3CB 0%, transparent 55%),' +
  '#EAE8DD'
const INK = '#1C1E18'
const INK_SOFT = 'rgba(28,30,24,0.78)'
const INK_FAINT = 'rgba(28,30,24,0.55)'
const SKELETON_BG = 'rgba(28,30,24,0.08)'
const SKELETON_BG_2 = 'rgba(28,30,24,0.12)'

export default function ClientMessagesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [coachName, setCoachName] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [])

  // Initialize page and load data
  useEffect(() => {
    async function initPage() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.push('/auth/login'); return }
        setCurrentUserId(user.id)

        const { data: coaches } = await supabase
          .from('profiles').select('id, full_name').eq('role', 'coach').limit(1)
        if (!coaches?.length) { setLoading(false); return }

        const coach = coaches[0]
        setCoachId(coach.id)
        setCoachName(coach.full_name || 'Coach')

        const { data: messageData } = await supabase
          .from('messages').select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${coach.id}),and(sender_id.eq.${coach.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true })

        if (messageData) setMessages(messageData as Message[])

        // Mark unread as read (optimistic)
        if (messageData?.length) {
          const unreadIds = messageData.filter((m) => m.sender_id === coach.id && !m.read_at).map((m) => m.id)
          if (unreadIds.length > 0) {
            const hit = await readDashboardCache<DashboardData>(user.id).catch(() => null)
            const snap = hit?.data ?? null
            optimisticMutate({
              key: `messages-mark-read:${unreadIds.length}`,
              apply: () => { if (snap) writeDashboardCache(user.id, { ...snap, actions: { ...snap.actions, unreadMessages: 0 } }).catch(() => {}) },
              rollback: () => { if (snap) writeDashboardCache(user.id, snap).catch(() => {}) },
              commit: async () => { const { error } = await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds); if (error) throw error; return true },
              onSuccess: () => invalidateCache('/api/dashboard'),
              onError: (err) => console.error('[messages-mark-read]', err),
            }).catch(() => {})
          }
        }

        setLoading(false)

        // Realtime subscription
        const channel = supabase
          .channel(`chat:${[user.id, coach.id].sort().join('-')}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const msg = payload.new as Message
            const relevant = (msg.sender_id === user.id && msg.receiver_id === coach.id) || (msg.sender_id === coach.id && msg.receiver_id === user.id)
            if (relevant) {
              setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
              if (msg.sender_id === coach.id && !msg.read_at) {
                supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {})
              }
            }
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
            const msg = payload.new as Message
            setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m))
          })
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      } catch (error) {
        console.error('Chat init error:', error)
        setLoading(false)
      }
    }
    initPage()
  }, [router])

  // Scroll to bottom when messages change
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleSendMessage = async (content: string, messageType: string = 'text', fileUrl?: string) => {
    if (!currentUserId || !coachId) return
    if (!content.trim() && !fileUrl) return
    setSending(true)
    try {
      const supabase = createClient()
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`, sender_id: currentUserId, receiver_id: coachId,
        content, message_type: messageType, file_url: fileUrl || null,
        read_at: null, created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMsg])

      const { data, error } = await supabase.from('messages')
        .insert({ sender_id: currentUserId, receiver_id: coachId, content, message_type: messageType, file_url: fileUrl || null })
        .select().single()

      if (error) { setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id)); return }
      setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? (data as Message) : m))
    } catch (e) { console.error('Send error:', e) }
    finally { setSending(false) }
  }

  // ─── Loading ──────────────────────────────────────
  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: CANVAS_BG, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: SKELETON_BG }} />
          <div style={{ width: 36, height: 36, borderRadius: 999, background: SKELETON_BG }} />
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: 80, height: 12, borderRadius: 4, background: SKELETON_BG_2 }} />
            <div style={{ width: 40, height: 8, borderRadius: 4, background: SKELETON_BG }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 180, height: 12, borderRadius: 4, background: SKELETON_BG_2 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!currentUserId || !coachId) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: CANVAS_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <MessageCircle size={28} style={{ color: INK_FAINT, margin: '0 auto 12px' }} strokeWidth={1.5} />
          <p style={{ color: INK_FAINT, fontSize: 14 }}>{!currentUserId ? 'Niet aangemeld' : 'Coach niet beschikbaar'}</p>
        </div>
      </div>
    )
  }

  const grouped = groupMessagesByDate(messages)
  const dateKeys = Object.keys(grouped)

  return (
    <>
      {/* Full-screen fixed container — immune to iOS keyboard layout shifts */}
      <div style={{
        position: 'fixed', inset: 0, background: CANVAS_BG,
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ─── Header ─── */}
        <div style={{
          padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <Link href="/client" aria-label="Terug" style={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
          }}>
            <ChevronLeft size={22} strokeWidth={1.8} style={{ color: INK }} />
          </Link>

          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(140deg, #5A5E52, #3D403A)',
            color: 'rgba(244,242,235,0.92)', fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {getInitials(coachName)}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em', color: INK,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {coachName}
            </div>
            <div style={{
              fontSize: 11, color: INK_FAINT,
              display: 'flex', alignItems: 'center', gap: 5, marginTop: 1,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2FA65A' }} />
              Online
            </div>
          </div>
        </div>

        {/* ─── Messages scroll area ─── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
            padding: '0 20px 8px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                  background: 'rgba(28,30,24,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageCircle size={24} style={{ color: INK_SOFT }} strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: INK, marginBottom: 4 }}>Stuur je coach een bericht</p>
                <p style={{ fontSize: 13, color: INK_FAINT }}>Reactie binnen 24 uur</p>
              </div>
            </div>
          ) : (
            <>
              {/* Spacer so messages start at bottom */}
              <div style={{ flex: 1, minHeight: 8 }} />
              {dateKeys.map((dateKey) => (
                <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{
                    textAlign: 'center', fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: INK_FAINT, padding: '12px 0 4px',
                  }}>
                    {dateKey}
                  </div>
                  {grouped[dateKey].map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      message={{
                        id: msg.id, content: msg.content, type: msg.message_type,
                        image_url: msg.file_url || undefined,
                        created_at: msg.created_at, sender_id: msg.sender_id,
                      }}
                      isCoach={msg.sender_id === coachId}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {/* ─── Input ─── */}
        <div style={{ flexShrink: 0 }}>
          <ChatInput onSend={handleSendMessage} loading={sending} />
        </div>
      </div>
    </>
  )
}
