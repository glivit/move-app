'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { X, Megaphone, Check } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface BroadcastDetail {
  id: string
  title: string
  content: string
  created_at: string
}

export default function BroadcastDetailPage() {
  const params = useParams()
  const router = useRouter()
  const broadcastId = params.id as string
  const [broadcast, setBroadcast] = useState<BroadcastDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [markedRead, setMarkedRead] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadBroadcast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId])

  async function loadBroadcast() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('broadcasts')
      .select('id, title, content, created_at, read_by')
      .eq('id', broadcastId)
      .single()

    if (data) {
      setBroadcast({
        id: data.id,
        title: data.title,
        content: data.content,
        created_at: data.created_at,
      })

      // Mark as read if not yet
      const readBy = (data.read_by as string[]) || []
      if (!readBy.includes(user.id)) {
        await supabase
          .from('broadcasts')
          .update({ read_by: [...readBy, user.id] })
          .eq('id', broadcastId)
        setMarkedRead(true)
      } else {
        setMarkedRead(true)
      }
    }

    setLoading(false)
  }

  function handleClose() {
    // Go back or to notifications list
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/client/notifications')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[#1A1917] border-t-transparent" />
      </div>
    )
  }

  if (!broadcast) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center gap-4">
        <p className="text-[15px] text-[#A09D96]">Melding niet gevonden</p>
        <button
          onClick={handleClose}
          className="text-[14px] font-medium text-[#1A1917] underline underline-offset-2"
        >
          Terug naar meldingen
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-white z-50 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar with close button */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3068C4]/10 flex items-center justify-center">
            <Megaphone strokeWidth={1.5} className="w-5 h-5 text-[#3068C4]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3068C4]">
              Bericht van je coach
            </p>
            <p className="text-[12px] text-[#A09D96]">
              {format(new Date(broadcast.created_at), 'd MMMM yyyy · HH:mm', { locale: nl })}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-[#EEEBE3] flex items-center justify-center hover:bg-[#EBE8E2] transition-colors"
          aria-label="Sluiten"
        >
          <X strokeWidth={1.5} className="w-5 h-5 text-[#6B6862]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <h1
          className="text-[24px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {broadcast.title}
        </h1>

        <div className="mt-6 text-[16px] text-[#3A3835] leading-[1.7] whitespace-pre-wrap">
          {broadcast.content}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-6 py-5 border-t border-[#E8E4DC]">
        <button
          onClick={handleClose}
          className="w-full py-3.5 rounded-2xl bg-[#1A1917] text-white text-[15px] font-semibold tracking-[-0.01em] transition-all active:scale-[0.98]"
        >
          {markedRead ? (
            <span className="flex items-center justify-center gap-2">
              <Check strokeWidth={2} className="w-4 h-4" />
              Gelezen — sluiten
            </span>
          ) : (
            'Sluiten'
          )}
        </button>
      </div>
    </div>
  )
}
