'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, MessageCircle, CheckCircle, FileText, Video, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

type NotificationType = 'message' | 'checkin_reviewed' | 'prompt_ready' | 'video_call'

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  read: boolean
  url?: string
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  message: <MessageCircle className="w-4 h-4 text-blue-500" />,
  checkin_reviewed: <CheckCircle className="w-4 h-4 text-green-500" />,
  prompt_ready: <FileText className="w-4 h-4 text-amber-500" />,
  video_call: <Video className="w-4 h-4 text-purple-500" />,
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load recent unread messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10)

      // Load recently reviewed check-ins
      const { data: reviews } = await supabase
        .from('checkins')
        .select('id, coach_notes, created_at')
        .eq('client_id', user.id)
        .eq('coach_reviewed', true)
        .not('coach_notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5)

      const notifs: Notification[] = []

      if (messages) {
        messages.forEach((msg: any) => {
          notifs.push({
            id: `msg-${msg.id}`,
            type: 'message',
            title: 'Nieuw bericht',
            description: (msg.content || '').substring(0, 80),
            timestamp: msg.created_at,
            read: false,
            url: '/client/messages',
          })
        })
      }

      if (reviews) {
        reviews.forEach((r: any) => {
          notifs.push({
            id: `review-${r.id}`,
            type: 'checkin_reviewed',
            title: 'Check-in beoordeeld',
            description: r.coach_notes?.substring(0, 80) || 'Je coach heeft je check-in beoordeeld',
            timestamp: r.created_at,
            read: false,
            url: '/client/progress',
          })
        })
      }

      notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setNotifications(notifs)
    }

    load()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleClick = (n: Notification) => {
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)))
    if (n.url) window.location.href = n.url
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-bg-secondary transition-colors"
        aria-label="Meldingen"
      >
        <Bell className="w-5 h-5 text-text-primary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold min-w-[18px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-border z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Meldingen</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-accent/10 text-accent-dark px-2 py-0.5 rounded-full">
                {unreadCount} ongelezen
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                <p className="text-sm text-text-muted">Geen meldingen</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`p-3 border-b border-border/50 cursor-pointer transition-colors ${
                    n.read ? 'bg-white hover:bg-bg-secondary/50' : 'bg-accent/5 hover:bg-accent/10'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">{notificationIcons[n.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{n.title}</p>
                      <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{n.description}</p>
                      <p className="text-xs text-text-muted/70 mt-1">
                        {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: nl })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setNotifications((prev) => prev.filter((item) => item.id !== n.id))
                      }}
                      className="flex-shrink-0 text-text-muted hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-border">
              <button
                onClick={handleMarkAllAsRead}
                className="w-full text-xs text-text-muted hover:text-text-primary py-1.5"
              >
                Alles gelezen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
