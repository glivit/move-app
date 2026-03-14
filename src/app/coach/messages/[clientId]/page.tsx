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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-gray-200 rounded w-48 mx-auto" />
          <div className="h-3 bg-gray-200 rounded w-64 mx-auto" />
        </div>
      </div>
    )
  }

  if (!userId) return null

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
          aria-label="Terug"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">
          {clientName || 'Client'}
        </h1>
      </div>
      <div className="flex-1">
        <MessageThread
          currentUserId={userId}
          otherUserId={clientId}
          otherUserName={clientName || 'Client'}
        />
      </div>
    </div>
  )
}
