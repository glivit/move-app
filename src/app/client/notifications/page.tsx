'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Megaphone, FileText, Check, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Broadcast {
  id: string
  title: string
  content: string
  created_at: string
  read: boolean
}

interface PendingPrompt {
  id: string
  question: string
  created_at: string
}

export default function NotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [prompts, setPrompts] = useState<PendingPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load broadcasts targeted at this client
    const { data: allBroadcasts } = await supabase
      .from('broadcasts')
      .select('id, title, content, created_at, target_clients, read_by')
      .order('created_at', { ascending: false })
      .limit(20)

    if (allBroadcasts) {
      setBroadcasts(
        allBroadcasts
          .filter((b: any) => {
            const targets = b.target_clients || []
            return targets.includes(user.id)
          })
          .map((b: any) => ({
            id: b.id,
            title: b.title,
            content: b.content,
            created_at: b.created_at,
            read: (b.read_by || []).includes(user.id),
          }))
      )
    }

    // Load pending prompts
    const { data: pendingPrompts } = await supabase
      .from('prompt_responses')
      .select('id, created_at, prompts(question)')
      .eq('client_id', user.id)
      .eq('response', '')
      .order('created_at', { ascending: false })

    if (pendingPrompts) {
      setPrompts(
        pendingPrompts.map((p: any) => ({
          id: p.id,
          question: p.prompts?.question || 'Vraag van je coach',
          created_at: p.created_at,
        }))
      )
    }

    setLoading(false)
  }

  function openBroadcast(broadcastId: string) {
    router.push(`/client/notifications/${broadcastId}`)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[#9B7B2E] border-t-transparent" />
      </div>
    )
  }

  const unreadBroadcasts = broadcasts.filter(b => !b.read)
  const readBroadcasts = broadcasts.filter(b => b.read)
  const hasNothing = broadcasts.length === 0 && prompts.length === 0

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <Link href="/client" className="p-2 -ml-2 rounded-xl hover:bg-[#F0F0ED] transition-colors">
          <ArrowLeft strokeWidth={1.5} className="w-5 h-5 text-[#5C5A55]" />
        </Link>
        <h1
          className="text-[28px] font-semibold text-[#1A1917] tracking-[-0.03em]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Meldingen
        </h1>
      </div>

      {/* Empty state */}
      {hasNothing && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto mb-4">
            <Megaphone strokeWidth={1.5} className="w-6 h-6 text-[#D1CFC9]" />
          </div>
          <p className="text-[15px] text-[#9C9A95]">Geen meldingen</p>
        </div>
      )}

      {/* Pending prompts */}
      {prompts.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3] px-1">
            Openstaande vragen
          </p>
          {prompts.map(prompt => (
            <Link
              key={prompt.id}
              href="/client/prompts"
              className="block rounded-2xl border-2 border-[#C8A96E]/30 bg-gradient-to-br from-[#FFF9F0] to-white p-5 transition-all hover:border-[#C8A96E]/50 hover:shadow-md"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#C8A96E]/12 flex items-center justify-center flex-shrink-0">
                  <FileText strokeWidth={1.5} className="w-5 h-5 text-[#9B7B2E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">
                    {prompt.question}
                  </p>
                  <p className="text-[13px] text-[#9B7B2E] font-medium mt-1">
                    Tik om te beantwoorden
                  </p>
                </div>
                <ChevronRight strokeWidth={1.5} className="w-5 h-5 text-[#C8A96E] flex-shrink-0 mt-2" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Unread broadcasts */}
      {unreadBroadcasts.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3] px-1">
            Nieuw
          </p>
          {unreadBroadcasts.map(b => (
            <BroadcastCard
              key={b.id}
              broadcast={b}
              onTap={() => openBroadcast(b.id)}
            />
          ))}
        </div>
      )}

      {/* Read broadcasts */}
      {readBroadcasts.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3] px-1">
            Gelezen
          </p>
          {readBroadcasts.map(b => (
            <BroadcastCard
              key={b.id}
              broadcast={b}
              onTap={() => openBroadcast(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BroadcastCard({ broadcast, onTap }: {
  broadcast: Broadcast
  onTap: () => void
}) {
  const isUnread = !broadcast.read

  return (
    <button
      onClick={onTap}
      className={`w-full text-left rounded-2xl p-5 transition-all active:scale-[0.98] ${
        isUnread
          ? 'border-2 border-[#3068C4]/25 bg-gradient-to-br from-[#F0F5FF] to-white shadow-sm'
          : 'border border-[#F0F0ED] bg-white'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUnread ? 'bg-[#3068C4]/10' : 'bg-[#F5F2ED]'
        }`}>
          <Megaphone strokeWidth={1.5} className={`w-5 h-5 ${
            isUnread ? 'text-[#3068C4]' : 'text-[#BAB8B3]'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-[15px] font-semibold tracking-[-0.01em] ${
              isUnread ? 'text-[#1A1917]' : 'text-[#5C5A55]'
            }`}>
              {broadcast.title}
            </p>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-[#3068C4] flex-shrink-0" />
            )}
          </div>

          <p className="text-[14px] text-[#9C9A95] mt-1 line-clamp-2">
            {broadcast.content}
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <p className="text-[12px] text-[#D1CFC9]">
              {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true, locale: nl })}
            </p>
            {broadcast.read && (
              <div className="flex items-center gap-1">
                <Check strokeWidth={2} className="w-3 h-3 text-[#3D8B5C]" />
                <span className="text-[11px] text-[#3D8B5C]">Gelezen</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight strokeWidth={1.5} className={`w-5 h-5 flex-shrink-0 mt-2 ${
          isUnread ? 'text-[#3068C4]' : 'text-[#D1CFC9]'
        }`} />
      </div>
    </button>
  )
}
