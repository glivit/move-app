'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { MessageThread } from '@/components/messaging/MessageThread'

interface PageProps {
  params: Promise<{ clientId: string }>
}

/**
 * Coach · Client-chat (v3 Orion clean).
 * - Canvas #8E9890, geen volledige dark header-bar
 * - Header = dark chip-pill "Terug" + naam links uitgelijnd
 * - Thread neemt de rest van het scherm op boven het bottom-nav spacer blok
 */
export default function CoachClientThreadPage({ params }: PageProps) {
  const { clientId } = use(params)
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initPage() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/')
          return
        }

        setUserId(user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', clientId)
          .single()

        if (profile) setClientName(profile.full_name)
      } catch (error) {
        console.error('Error initializing page:', error)
      } finally {
        setLoading(false)
      }
    }

    initPage()
  }, [clientId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse space-y-3">
          <div
            className="h-3 rounded-full w-48 mx-auto"
            style={{ background: 'rgba(253,253,254,0.18)' }}
          />
          <div
            className="h-3 rounded-full w-64 mx-auto"
            style={{ background: 'rgba(253,253,254,0.18)' }}
          />
        </div>
      </div>
    )
  }

  if (!userId) return null

  const initial = (clientName || 'C').charAt(0).toUpperCase()

  return (
    <div
      className="flex flex-col"
      style={{
        // Viewport minus coach-layout safe-area padding, pb-8 (32) en bottom-nav spacer (90).
        height:
          'calc(100dvh - env(safe-area-inset-top, 0px) - 18px - 32px - 90px)',
        minHeight: 420,
      }}
    >
      {/* ═══ v3 clean header ═══ */}
      <div
        className="flex items-center gap-3 pb-3"
        style={{
          borderBottom: '1px solid rgba(253,253,254,0.10)',
          marginBottom: 4,
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 transition-opacity active:opacity-70"
          style={{
            background: '#474B48',
            color: '#FDFDFE',
            padding: '7px 12px 7px 9px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
          }}
          aria-label="Terug"
        >
          <ArrowLeft strokeWidth={1.75} className="w-[15px] h-[15px]" />
          Terug
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
            style={{
              background: 'rgba(253,253,254,0.14)',
              color: '#FDFDFE',
              letterSpacing: '0.02em',
            }}
          >
            {initial}
          </div>
          <h1
            className="text-[17px] font-semibold truncate"
            style={{
              color: '#FDFDFE',
              letterSpacing: '-0.01em',
            }}
          >
            {clientName || 'Client'}
          </h1>
        </div>
      </div>

      {/* ═══ Thread — vult resterende hoogte ═══ */}
      <div className="flex-1 overflow-hidden -mx-[22px]">
        <MessageThread
          currentUserId={userId}
          otherUserId={clientId}
          otherUserName={clientName || 'Client'}
        />
      </div>
    </div>
  )
}
