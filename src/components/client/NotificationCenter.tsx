'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell, MessageCircle, FileText, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import Link from 'next/link'

type NotificationType = 'message' | 'prompt'

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  url: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Parallel: unread messages + pending prompts
    const [messagesRes, promptsRes] = await Promise.all([
      supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('prompt_responses')
        .select('id, created_at, prompts(question)')
        .eq('client_id', user.id)
        .eq('response', '')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const notifs: Notification[] = []

    if (messagesRes.data) {
      messagesRes.data.forEach((msg: any) => {
        notifs.push({
          id: `msg-${msg.id}`,
          type: 'message',
          title: 'Nieuw bericht van je coach',
          description: (msg.content || '').substring(0, 80),
          timestamp: msg.created_at,
          url: '/client/messages',
        })
      })
    }

    if (promptsRes.data) {
      promptsRes.data.forEach((p: any) => {
        notifs.push({
          id: `prompt-${p.id}`,
          type: 'prompt',
          title: 'Vraag van je coach',
          description: (p.prompts?.question || 'Beantwoord de vraag van je coach').substring(0, 80),
          timestamp: p.created_at,
          url: '/client/prompts',
        })
      })
    }

    notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setNotifications(notifs)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

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

  const count = notifications.length

  const notifIcon: Record<NotificationType, React.ReactNode> = {
    message: <MessageCircle className="w-4 h-4 text-[#3068C4]" />,
    prompt: <FileText className="w-4 h-4 text-[#9B7B2E]" />,
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-[#F5F2ED] transition-colors"
        aria-label="Meldingen"
      >
        <Bell strokeWidth={1.5} className="w-6 h-6 text-[#5C5A55]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] rounded-full bg-[#FF3B30] flex items-center justify-center px-1">
            <span className="text-[11px] font-bold text-white leading-none">
              {count > 9 ? '9+' : count}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl overflow-hidden z-50"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F0F0ED',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#F0F0ED] flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">Meldingen</h3>
            {count > 0 && (
              <span className="text-[12px] font-medium text-[#9B7B2E] bg-[#9B7B2E]/8 px-2 py-0.5 rounded-full">
                {count} nieuw
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell strokeWidth={1.5} className="w-8 h-8 text-[#D1CFC9] mx-auto mb-2" />
                <p className="text-[14px] text-[#9C9A95]">Geen meldingen</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.url}
                  onClick={() => setIsOpen(false)}
                  className="flex items-start gap-3 px-4 py-3.5 border-b border-[#F0F0ED]/60 hover:bg-[#F5F2ED]/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-[#F5F2ED] flex items-center justify-center">
                    {notifIcon[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1A1917] tracking-[-0.01em]">{n.title}</p>
                    <p className="text-[13px] text-[#9C9A95] line-clamp-2 mt-0.5">{n.description}</p>
                    <p className="text-[12px] text-[#D1CFC9] mt-1">
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: nl })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
