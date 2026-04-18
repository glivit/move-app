'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { useMessageSubscription } from '@/hooks/useMessageSubscription'
import { MessageInput } from './MessageInput'
import { MessagePreview } from './MessagePreview'

/**
 * v6 Orion · Coach-side thread — gespiegeld op design-system/09-chat.html.
 * Spelregels:
 *   - Coach (=own) → DARK card, top-right squished, read-receipt onderaan.
 *   - Client (=other) → LIGHT card, top-left squished.
 *   - Timestamp staat IN de bubble (10px ink-faint, mt:4px).
 *   - Date dividers zonder hairlines, gecentreerd uppercase tracking.
 * Op de coach-tooling zit boven de thread een aparte page-header (client-
 * naam, terug, tag), dus deze component levert ALLEEN thread + input.
 */
const INK_FAINT = 'rgba(253,253,254,0.44)'

interface MessageThreadProps {
  currentUserId: string
  otherUserId: string
  otherUserName: string
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (messageDate.getTime() === today.getTime()) return 'Vandaag'

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (messageDate.getTime() === yesterday.getTime()) return 'Gisteren'

  return date.toLocaleString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupMessagesByDate(messages: any[]) {
  const groups: { [key: string]: any[] } = {}

  messages.forEach((msg) => {
    const date = new Date(msg.created_at)
    const dateKey = date.toLocaleString('nl-BE', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(msg)
  })

  return Object.entries(groups)
}

export function MessageThread({
  currentUserId,
  otherUserId,
  otherUserName,
}: MessageThreadProps) {
  const { messages, loading, sendMessage, markAsRead } = useMessageSubscription(
    currentUserId,
    otherUserId
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  useEffect(() => {
    const timer = setTimeout(() => {
      markAsRead()
    }, 500)
    return () => clearTimeout(timer)
  }, [messages, markAsRead])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (content: string, type: string, fileUrl?: string) => {
    await sendMessage(content, type, fileUrl)
    scrollToBottom()
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#8E9890' }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 animate-pulse">
            <div className="h-3 rounded-full w-48 mx-auto" style={{ background: 'rgba(253,253,254,0.18)' }} />
            <div className="h-3 rounded-full w-64 mx-auto" style={{ background: 'rgba(253,253,254,0.18)' }} />
          </div>
        </div>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-full" style={{ background: '#8E9890' }}>
      {/* ═══ Messages (5% gutter, 10px gap — matcht .thread) ═══ */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{
          padding: '12px 5% 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="text-center px-6 py-5 rounded-3xl max-w-[280px]"
              style={{
                background: '#A6ADA7',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
              }}
            >
              <p className="text-[15px] font-semibold" style={{ color: '#FDFDFE' }}>
                Nog geen berichten
              </p>
              <p
                className="text-[13px] mt-1"
                style={{ color: 'rgba(253,253,254,0.72)' }}
              >
                Start een gesprek met {otherUserName}
              </p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map(([dateKey, dateMessages]) => {
              const firstDate = new Date(dateMessages[0].created_at)
              const label = formatDateLabel(firstDate)
              return (
                <div
                  key={dateKey}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  {/* Date divider — gecentreerd, zonder lines */}
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
                    {label}
                  </div>

                  {dateMessages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    const time = formatTime(msg.created_at)

                    if (!isOwn) {
                      // Client (other) — light card, top-left squished
                      return (
                        <div key={msg.id} className="flex justify-start">
                          <div
                            style={{
                              maxWidth: '76%',
                              padding: '11px 14px',
                              borderRadius: 18,
                              borderTopLeftRadius: 8,
                              background: '#A6ADA7',
                              color: '#FDFDFE',
                              boxShadow:
                                'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.14)',
                              wordWrap: 'break-word',
                              fontSize: 14,
                              lineHeight: 1.45,
                              letterSpacing: '-0.003em',
                            }}
                          >
                            <MessagePreview
                              messageType={msg.message_type}
                              content={msg.content}
                              fileUrl={msg.file_url}
                            />
                            <span
                              style={{
                                display: 'block',
                                fontSize: 10,
                                fontWeight: 400,
                                color: INK_FAINT,
                                letterSpacing: '0.02em',
                                marginTop: 4,
                                fontFeatureSettings: '"tnum"',
                              }}
                            >
                              {time}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    // Own (coach) — dark card, top-right squished, + read-receipt
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div
                          style={{
                            maxWidth: '76%',
                            padding: '11px 14px',
                            borderRadius: 18,
                            borderTopRightRadius: 8,
                            background: '#474B48',
                            color: '#FDFDFE',
                            boxShadow:
                              'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.22)',
                            wordWrap: 'break-word',
                            fontSize: 14,
                            lineHeight: 1.45,
                            letterSpacing: '-0.003em',
                          }}
                        >
                          <MessagePreview
                            messageType={msg.message_type}
                            content={msg.content}
                            fileUrl={msg.file_url}
                          />
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 4,
                              fontSize: 10,
                              fontWeight: 400,
                              color: INK_FAINT,
                              letterSpacing: '0.02em',
                              marginTop: 4,
                              fontFeatureSettings: '"tnum"',
                            }}
                          >
                            {time}
                            {msg.read_at ? (
                              <CheckCheck
                                className="w-3 h-3"
                                style={{ color: '#2FA65A' }}
                              />
                            ) : (
                              <Check
                                className="w-3 h-3"
                                style={{ color: INK_FAINT }}
                              />
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  )
}
