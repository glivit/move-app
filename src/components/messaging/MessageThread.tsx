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
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleString('nl-BE', { hour: '2-digit', minute: '2-digit' })

  if (messageDate.getTime() === today.getTime()) {
    return timeStr
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (messageDate.getTime() === yesterday.getTime()) {
    return `Gisteren ${timeStr}`
  }

  return date.toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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

  // Mark as read on mount
  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  // Mark as read when new messages arrive
  useEffect(() => {
    const timer = setTimeout(() => {
      markAsRead()
    }, 500)
    return () => clearTimeout(timer)
  }, [messages, markAsRead])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (content: string, type: string, fileUrl?: string) => {
    await sendMessage(content, type, fileUrl)
    scrollToBottom()
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-surface">
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-3 bg-surface-muted rounded w-48 mx-auto" />
              <div className="h-3 bg-surface-muted rounded w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-text-muted">Nog geen berichten</p>
              <p className="text-xs text-text-muted">
                Start een gesprek met {otherUserName}
              </p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map(([dateKey, dateMessages]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date separator */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-muted font-medium px-2">{dateKey}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Messages for this date */}
                {dateMessages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl ${
                          isOwn
                            ? 'bg-accent text-white rounded-br-none'
                            : 'bg-surface-muted text-text-primary rounded-bl-none border border-border'
                        }`}
                      >
                        <MessagePreview
                          messageType={msg.message_type}
                          content={msg.content}
                          fileUrl={msg.file_url}
                        />

                        {/* Timestamp and read receipt */}
                        <div
                          className={`flex items-center gap-2 mt-2 text-xs ${
                            isOwn ? 'justify-end text-white/70' : 'text-text-muted'
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>
                          {isOwn && (
                            msg.read_at ? (
                              <CheckCheck className="w-4 h-4" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  )
}
