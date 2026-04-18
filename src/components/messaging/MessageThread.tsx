'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { useMessageSubscription } from '@/hooks/useMessageSubscription'
import { MessageInput } from './MessageInput'
import { MessagePreview } from './MessagePreview'

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
      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
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
              <p className="text-[13px] mt-1" style={{ color: 'rgba(253,253,254,0.72)' }}>
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
                <div key={dateKey} className="space-y-3">
                  {/* Date separator */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px" style={{ background: 'rgba(253,253,254,0.18)' }} />
                    <span
                      className="text-[10px] font-semibold px-2 uppercase tracking-[0.16em]"
                      style={{ color: 'rgba(253,253,254,0.56)' }}
                    >
                      {label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(253,253,254,0.18)' }} />
                  </div>

                  {/* Messages */}
                  {dateMessages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId

                    if (!isOwn) {
                      // Other party (client) — light card
                      return (
                        <div key={msg.id} className="flex justify-start">
                          <div className="flex flex-col max-w-[78%]">
                            <div
                              style={{
                                background: '#A6ADA7',
                                borderRadius: 20,
                                borderBottomLeftRadius: 4,
                                padding: '12px 16px',
                                boxShadow:
                                  'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.14)',
                              }}
                            >
                              <MessagePreview
                                messageType={msg.message_type}
                                content={msg.content}
                                fileUrl={msg.file_url}
                              />
                            </div>
                            <span
                              className="text-[11px] mt-1 px-2"
                              style={{ color: 'rgba(253,253,254,0.56)' }}
                            >
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    // Own (coach) — dark card with read-receipt
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="flex flex-col max-w-[78%] items-end">
                          <div
                            style={{
                              background: '#474B48',
                              borderRadius: 20,
                              borderBottomRightRadius: 4,
                              padding: '12px 16px',
                              boxShadow:
                                'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.22)',
                            }}
                          >
                            <MessagePreview
                              messageType={msg.message_type}
                              content={msg.content}
                              fileUrl={msg.file_url}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 px-2">
                            <span
                              className="text-[11px]"
                              style={{ color: 'rgba(253,253,254,0.56)' }}
                            >
                              {formatTime(msg.created_at)}
                            </span>
                            {msg.read_at ? (
                              <CheckCheck
                                className="w-3.5 h-3.5"
                                style={{ color: '#2FA65A' }}
                              />
                            ) : (
                              <Check
                                className="w-3.5 h-3.5"
                                style={{ color: 'rgba(253,253,254,0.44)' }}
                              />
                            )}
                          </div>
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
