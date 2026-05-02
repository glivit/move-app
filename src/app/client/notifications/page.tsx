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
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[rgba(28,30,24,0.60)] border-t-[#1C1E18]" />
      </div>
    )
  }

  const unreadBroadcasts = broadcasts.filter(b => !b.read)
  const readBroadcasts = broadcasts.filter(b => b.read)
  const hasNothing = broadcasts.length === 0 && prompts.length === 0

  return (
    <div className="pb-24 space-y-6">
      {/* Hero Section */}
      <div className="flex items-center gap-3 pt-1 animate-slide-up">
        <Link href="/client" className="p-2 -ml-2 rounded-xl hover:bg-[rgba(28,30,24,0.10)] transition-colors">
          <ArrowLeft strokeWidth={1.5} className="w-5 h-5 text-[rgba(28,30,24,0.62)]" />
        </Link>
        <div>
          <p className="text-label mb-1">Inbox</p>
          <h1 className="page-title-sm">
            Notificaties
          </h1>
        </div>
      </div>

      {/* Empty state */}
      {hasNothing && (
        <div className="text-center py-16 animate-slide-up stagger-2">
          <div className="w-14 h-14 rounded-full bg-[rgba(28,30,24,0.10)] flex items-center justify-center mx-auto mb-4">
            <Megaphone strokeWidth={1.5} className="w-6 h-6 text-[rgba(28,30,24,0.60)]" />
          </div>
          <p className="text-[15px] text-[rgba(28,30,24,0.62)]">Geen meldingen</p>
        </div>
      )}

      {/* Pending prompts */}
      {prompts.length > 0 && (
        <div className="space-y-3 animate-slide-up stagger-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(28,30,24,0.60)] px-1">
            Openstaande vragen
          </p>
          {prompts.map(prompt => (
            <Link
              key={prompt.id}
              href="/client/prompts"
              className="block rounded-2xl border-2 border-[#5A5E5B]/20 bg-white p-5 transition-all hover:border-[#1C1E18]/30"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#5A5E5B]/12 flex items-center justify-center flex-shrink-0">
                  <FileText strokeWidth={1.5} className="w-5 h-5 text-[#1C1E18]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1C1E18] tracking-[-0.01em]">
                    {prompt.question}
                  </p>
                  <p className="text-[13px] text-[#1C1E18] font-medium mt-1">
                    Tik om te beantwoorden
                  </p>
                </div>
                <ChevronRight strokeWidth={1.5} className="w-5 h-5 text-[#5A5E5B] flex-shrink-0 mt-2" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Unread broadcasts */}
      {unreadBroadcasts.length > 0 && (
        <div className="space-y-3 animate-slide-up stagger-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(28,30,24,0.60)] px-1">
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
        <div className="space-y-3 animate-slide-up stagger-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(28,30,24,0.60)] px-1">
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
          ? 'border-2 border-[#3068C4]/25 bg-[rgba(255,255,255,0.50)] backdrop-blur-md border border-[rgba(28,30,24,0.10)]'
          : 'border border-[rgba(28,30,24,0.10)] bg-white'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUnread ? 'bg-[#3068C4]/10' : 'bg-[rgba(28,30,24,0.10)]'
        }`}>
          <Megaphone strokeWidth={1.5} className={`w-5 h-5 ${
            isUnread ? 'text-[#3068C4]' : 'text-[rgba(28,30,24,0.60)]'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-[15px] font-semibold tracking-[-0.01em] ${
              isUnread ? 'text-[#1C1E18]' : 'text-[rgba(28,30,24,0.62)]'
            }`}>
              {broadcast.title}
            </p>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-[#3068C4] flex-shrink-0" />
            )}
          </div>

          <p className="text-[14px] text-[rgba(28,30,24,0.62)] mt-1 line-clamp-2">
            {broadcast.content}
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <p className="text-[12px] text-[rgba(28,30,24,0.60)]">
              {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true, locale: nl })}
            </p>
            {broadcast.read && (
              <div className="flex items-center gap-1">
                <Check strokeWidth={2} className="w-3 h-3 text-[#2FA65A]" />
                <span className="text-[11px] text-[#2FA65A]">Gelezen</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight strokeWidth={1.5} className={`w-5 h-5 flex-shrink-0 mt-2 ${
          isUnread ? 'text-[#3068C4]' : 'text-[rgba(28,30,24,0.60)]'
        }`} />
      </div>
    </button>
  )
}
