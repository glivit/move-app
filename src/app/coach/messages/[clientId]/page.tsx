'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { MessageThread } from '@/components/messaging/MessageThread'

interface PageProps {
  params: Promise<{ clientId: string }>
}

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
        const { data: { user } } = await supabase.auth.getUser()

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
      <div
        className="flex items-center justify-center min-h-[50vh]"
        style={{ background: '#8E9890' }}
      >
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]" style={{ background: '#8E9890' }}>
      {/* v6 thread header — dark card */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: '#474B48',
          boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: 'rgba(253,253,254,0.10)',
            color: '#FDFDFE',
          }}
          aria-label="Terug"
        >
          <ArrowLeft strokeWidth={1.75} className="w-5 h-5" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold"
          style={{ background: 'rgba(253,253,254,0.14)', color: '#FDFDFE' }}
        >
          {(clientName || 'C').charAt(0).toUpperCase()}
        </div>
        <h1 className="text-[16px] font-semibold flex-1 truncate" style={{ color: '#FDFDFE' }}>
          {clientName || 'Client'}
        </h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <MessageThread
          currentUserId={userId}
          otherUserId={clientId}
          otherUserName={clientName || 'Client'}
        />
      </div>
    </div>
  )
}
