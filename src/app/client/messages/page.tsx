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

interface GroupedMessages {
  [key: string]: Message[]
}

function getDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )

  if (messageDate.getTime() === today.getTime()) {
    return 'Vandaag'
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (messageDate.getTime() === yesterday.getTime()) {
    return 'Gisteren'
  }

  return date.toLocaleDateString('nl-BE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function groupMessagesByDate(messages: Message[]): GroupedMessages {
  const groups: GroupedMessages = {}

  messages.forEach((msg) => {
    const date = new Date(msg.created_at)
    const dateKey = getDateLabel(date)

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(msg)
  })

  return groups
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export default function ClientMessagesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [coachName, setCoachName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  // iOS keyboard: visualViewport resize → shrink container to actual visible area
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv || !shellRef.current) return
    const update = () => {
      if (shellRef.current) {
        shellRef.current.style.height = `${vv.height}px`
      }
      // Scroll to bottom when keyboard opens/closes
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [loading])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Initialize page and load data
  useEffect(() => {
    async function initPage() {
      try {
        const supabase = createClient()

        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/auth/login')
          return
        }

        setCurrentUserId(user.id)

        // Find coach
        const { data: coaches, error: coachError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'coach')
          .limit(1)

        if (coachError || !coaches || coaches.length === 0) {
          console.error('Coach not found')
          setLoading(false)
          return
        }

        const coach = coaches[0]
        setCoachId(coach.id)
        setCoachName(coach.full_name || 'Coach')

        // Load messages
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${coach.id}),and(sender_id.eq.${coach.id},receiver_id.eq.${user.id})`
          )
          .order('created_at', { ascending: true })

        if (!messageError && messageData) {
          setMessages(messageData as Message[])
        }

        // Mark messages as read — optimistic: patch dashboard cache zodat
        // de "unread"-badge op home onmiddellijk op 0 staat, ook als de
        // user terug-zwipet vóór de Supabase-update round-trip klaar is.
        if (messageData && messageData.length > 0) {
          const unreadIds = messageData
            .filter((m) => m.sender_id === coach.id && !m.read_at)
            .map((m) => m.id)

          if (unreadIds.length > 0) {
            const hit = await readDashboardCache<DashboardData>(user.id).catch(() => null)
            const cacheSnapshot = hit?.data ?? null

            optimisticMutate({
              key: `messages-mark-read:${unreadIds.length}`,
              apply: () => {
                if (cacheSnapshot) {
                  const nextData: DashboardData = {
                    ...cacheSnapshot,
                    actions: {
                      ...cacheSnapshot.actions,
                      unreadMessages: 0,
                    },
                  }
                  writeDashboardCache(user.id, nextData).catch(() => {})
                }
              },
              rollback: () => {
                if (cacheSnapshot) {
                  writeDashboardCache(user.id, cacheSnapshot).catch(() => {})
                }
              },
              commit: async () => {
                const { error: updateErr } = await supabase
                  .from('messages')
                  .update({ read_at: new Date().toISOString() })
                  .in('id', unreadIds)
                if (updateErr) throw updateErr
                return true
              },
              onSuccess: () => {
                invalidateCache('/api/dashboard')
              },
              onError: (err) => {
                console.error('[optimistic:messages-mark-read] update failed:', err)
              },
            }).catch(() => {
              // Rollback al uitgevoerd; we laten de page draaien — de messages
              // zelf zijn al geladen en getoond.
            })
          }
        }

        setLoading(false)

        // Subscribe to real-time messages
        const channel = supabase
          .channel(`conversation:${[user.id, coach.id].sort().join('-')}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            (payload) => {
              const msg = payload.new as Message
              const isRelevant =
                (msg.sender_id === user.id && msg.receiver_id === coach.id) ||
                (msg.sender_id === coach.id && msg.receiver_id === user.id)
              if (isRelevant) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === msg.id)) return prev
                  return [...prev, msg]
                })

                // Auto-mark incoming coach messages as read
                if (msg.sender_id === coach.id && !msg.read_at) {
                  supabase
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', msg.id)
                    .then(() => {})
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
            },
            (payload) => {
              const msg = payload.new as Message
              setMessages((prev) =>
                prev.map((m) => (m.id === msg.id ? msg : m))
              )
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.error('Error initializing page:', error)
        setLoading(false)
      }
    }

    initPage()
  }, [router])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (content: string, messageType: string = 'text', fileUrl?: string) => {
    if (!currentUserId || !coachId) return
    if (!content.trim() && !fileUrl) return

    setSending(true)

    try {
      const supabase = createClient()

      // Optimistic update
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        sender_id: currentUserId,
        receiver_id: coachId,
        content,
        message_type: messageType,
        file_url: fileUrl || null,
        read_at: null,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, optimisticMsg])
      scrollToBottom()

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: coachId,
          content,
          message_type: messageType,
          file_url: fileUrl || null,
        })
        .select()
        .single()

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
        console.error('Error sending message:', error)
        return
      }

      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? (data as Message) : m))
      )
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // v6 tokens
  const CANVAS = '#8E9890'
  const WHITE = '#FDFDFE'
  const MUTED = 'rgba(253,253,254,0.56)'
  const INK_FAINT = 'rgba(253,253,254,0.44)'

  if (loading) {
    return (
      <div
        className="flex flex-col"
        style={{ height: '100dvh', background: CANVAS }}
      >
        {/* Ghost header */}
        <div
          style={{
            padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 5% 14px',
            display: 'grid',
            gridTemplateColumns: '32px 1fr',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
            }}
          />
          <div className="flex items-center gap-[10px]">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
              }}
            />
            <div className="animate-pulse space-y-1.5">
              <div
                className="h-3 rounded w-24"
                style={{ background: 'rgba(253,253,254,0.14)' }}
              />
              <div
                className="h-2 rounded w-14"
                style={{ background: 'rgba(253,253,254,0.08)' }}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-3">
            <div
              className="h-3 rounded w-48 mx-auto"
              style={{ background: 'rgba(253,253,254,0.14)' }}
            />
            <div
              className="h-3 rounded w-64 mx-auto"
              style={{ background: 'rgba(253,253,254,0.10)' }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!currentUserId || !coachId) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: '100dvh', background: CANVAS }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(253,253,254,0.10)' }}
        >
          <MessageCircle size={28} style={{ color: MUTED }} strokeWidth={1.5} />
        </div>
        <p style={{ color: MUTED, fontSize: 14 }}>
          {!currentUserId ? 'Niet aangemeld' : 'Coach niet beschikbaar'}
        </p>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate(messages)
  const dateKeys = Object.keys(groupedMessages)

  return (
    <div
      ref={shellRef}
      className="flex flex-col relative"
      style={{ height: '100dvh', background: CANVAS, overflow: 'hidden' }}
    >
      {/* ═══ Chat top — back arrow · peer name ═══ */}
      <div
        className="animate-slide-up"
        style={{
          padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 5% 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background:
            'linear-gradient(180deg, rgba(142,152,144,1) 0%, rgba(142,152,144,1) 72%, rgba(142,152,144,0) 100%)',
          position: 'relative',
          zIndex: 40,
        }}
      >
        <Link
          href="/client"
          aria-label="Terug"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.8} style={{ color: WHITE }} />
        </Link>

        {/* Peer (coach) — avatar + name */}
        <div className="flex items-center gap-[10px] min-w-0">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(140deg, #5A5E52, #3D403A)',
              color: 'rgba(244,242,235,0.92)',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
              flexShrink: 0,
            }}
          >
            {getInitials(coachName)}
          </div>
          <div style={{ lineHeight: 1.15, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: WHITE,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {coachName}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: INK_FAINT,
                letterSpacing: '0.01em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                marginTop: 1,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#2FA65A',
                  display: 'inline-block',
                }}
              />
              Online
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Messages ═══ */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto animate-slide-up stagger-2"
        style={{
          padding: '0 5% 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full animate-fade-in">
            <div className="text-center space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(253,253,254,0.10)' }}
              >
                <MessageCircle size={28} style={{ color: WHITE }} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p style={{ fontSize: 15, fontWeight: 500, color: WHITE }}>
                  Stuur je coach een bericht
                </p>
                <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.62)' }}>
                  Reactie binnen 24 uur
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {dateKeys.map((dateKey) => (
              <div
                key={dateKey}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {/* Date divider — gecentreerd zonder hairlines. */}
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: INK_FAINT,
                    margin: '14px 0 6px',
                  }}
                >
                  {dateKey}
                </div>

                {groupedMessages[dateKey].map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={{
                      id: msg.id,
                      content: msg.content,
                      type: msg.message_type,
                      image_url: msg.file_url || undefined,
                      created_at: msg.created_at,
                      sender_id: msg.sender_id,
                    }}
                    isCoach={msg.sender_id === coachId}
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ═══ Input pill ═══ */}
      <div style={{ flexShrink: 0 }}>
        <ChatInput onSend={handleSendMessage} loading={sending} />
      </div>
    </div>
  )
}
