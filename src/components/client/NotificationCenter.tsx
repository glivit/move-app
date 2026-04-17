'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell, Megaphone, FileText, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import Link from 'next/link'

type NotificationType = 'broadcast' | 'prompt' | 'message'

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  url: string
}

const notifConfig: Record<NotificationType, { icon: React.ReactNode; bg: string }> = {
  broadcast: {
    icon: <Megaphone className="w-4 h-4 text-[#3068C4]" />,
    bg: 'bg-[#3068C4]/8',
  },
  prompt: {
    icon: <FileText className="w-4 h-4 text-[#FDFDFE]" />,
    bg: 'bg-[#5A5E5B]/10',
  },
  message: {
    icon: <MessageCircle className="w-4 h-4 text-[#3068C4]" />,
    bg: 'bg-[#3068C4]/8',
  },
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [broadcastsRes, promptsRes, messagesRes] = await Promise.all([
      // Unread broadcasts targeted at this client
      supabase
        .from('broadcasts')
        .select('id, title, content, created_at, target_clients, read_by')
        .order('created_at', { ascending: false })
        .limit(10),
      // Pending prompts
      supabase
        .from('prompt_responses')
        .select('id, created_at, prompts(question)')
        .eq('client_id', user.id)
        .eq('response', '')
        .order('created_at', { ascending: false })
        .limit(5),
      // Unread messages
      supabase
        .from('messages')
        .select('id, content, created_at')
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const notifs: Notification[] = []

    // Broadcasts — only unread ones targeted at this user
    if (broadcastsRes.data) {
      broadcastsRes.data
        .filter((b: any) => {
          const targets = b.target_clients || []
          const readBy = b.read_by || []
          return targets.includes(user.id) && !readBy.includes(user.id)
        })
        .forEach((b: any) => {
          notifs.push({
            id: `bc-${b.id}`,
            type: 'broadcast',
            title: b.title || 'Bericht van je coach',
            description: (b.content || '').substring(0, 80),
            timestamp: b.created_at,
            url: `/client/notifications/${b.id}`,
          })
        })
    }

    // Prompts
    if (promptsRes.data) {
      promptsRes.data.forEach((p: any) => {
        notifs.push({
          id: `pr-${p.id}`,
          type: 'prompt',
          title: 'Vraag van je coach',
          description: (p.prompts?.question || '').substring(0, 80),
          timestamp: p.created_at,
          url: '/client/prompts',
        })
      })
    }

    // Messages
    if (messagesRes.data) {
      messagesRes.data.forEach((m: any) => {
        notifs.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: 'Nieuw bericht',
          description: (m.content || '').substring(0, 80),
          timestamp: m.created_at,
          url: '/client/messages',
        })
      })
    }

    notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setNotifications(notifs)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const count = notifications.length

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-[rgba(253,253,254,0.08)] transition-colors"
        aria-label="Meldingen"
      >
        <Bell strokeWidth={1.5} className="w-6 h-6 text-[rgba(253,253,254,0.68)]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] rounded-full bg-[#B55A4A] flex items-center justify-center px-1">
            <span className="text-[11px] font-bold text-white leading-none">
              {count > 9 ? '9+' : count}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-[#A6ADA7] rounded-2xl overflow-hidden z-50"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid rgba(253,253,254,0.14)',
          }}
        >
          <div className="px-4 py-3 border-b border-[rgba(253,253,254,0.14)] flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#FDFDFE] tracking-[-0.01em]">Meldingen</h3>
            {count > 0 && (
              <span className="text-[12px] font-medium text-[#FDFDFE] bg-[#FDFDFE]/8 px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell strokeWidth={1.5} className="w-8 h-8 text-[#CCC7BC] mx-auto mb-2" />
                <p className="text-[14px] text-[rgba(253,253,254,0.55)]">Geen meldingen</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.url}
                  onClick={() => setIsOpen(false)}
                  className="flex items-start gap-3 px-4 py-3.5 border-b border-[rgba(253,253,254,0.14)]/60 hover:bg-[rgba(253,253,254,0.08)]/50 transition-colors"
                >
                  <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${notifConfig[n.type].bg}`}>
                    {notifConfig[n.type].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#FDFDFE] tracking-[-0.01em]">{n.title}</p>
                    <p className="text-[13px] text-[rgba(253,253,254,0.55)] line-clamp-2 mt-0.5">{n.description}</p>
                    <p className="text-[12px] text-[#CCC7BC] mt-1">
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: nl })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Link naar volledige pagina */}
          {count > 0 && (
            <Link
              href="/client/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-[13px] font-medium text-[#FDFDFE] py-3 border-t border-[rgba(253,253,254,0.14)] hover:bg-[rgba(253,253,254,0.08)]/50 transition-colors"
            >
              Alle meldingen bekijken
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
