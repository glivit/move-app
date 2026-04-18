'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useConversationList } from '@/hooks/useMessageSubscription'
import { ConversationList } from '@/components/coach/ConversationList'
import { MessageThread } from '@/components/messaging/MessageThread'

export default function CoachMessagesPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClientName, setSelectedClientName] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const { conversations, loading: conversationsLoading } = useConversationList(userId || '')

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      setAuthLoading(false)
    }

    getUser()
  }, [])

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId)
    const conversation = conversations.find((c) => c.clientId === clientId)
    if (conversation?.client) {
      setSelectedClientName(conversation.client.full_name)
    }
  }

  const handleBackToList = () => {
    setSelectedClientId(null)
    setSelectedClientName('')
  }

  // Loading state
  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#8E9890' }}
      >
        <div className="space-y-3 animate-pulse">
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

  // Not authenticated state
  if (!userId) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#8E9890' }}
      >
        <div
          className="text-center px-8 py-6 rounded-3xl max-w-sm"
          style={{
            background: '#A6ADA7',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          <p className="text-[17px] font-semibold" style={{ color: '#FDFDFE' }}>
            Niet aangemeld
          </p>
          <p className="text-[14px] mt-2" style={{ color: 'rgba(253,253,254,0.72)' }}>
            Meld je aan om berichten te zien
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-80px)]" style={{ background: '#8E9890' }}>
      {/* Desktop Layout */}
      <div className="hidden lg:flex w-full gap-0">
        {/* Left Panel — dark sidebar */}
        <div
          className="w-[340px] flex flex-col overflow-hidden"
          style={{
            background: '#474B48',
            boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'rgba(253,253,254,0.44)' }}
            >
              Inbox
            </span>
            <h1
              className="text-[26px] font-bold tracking-tight mt-1"
              style={{ color: '#FDFDFE' }}
            >
              Berichten
            </h1>
          </div>

          {/* List */}
          <div className="flex-1 overflow-hidden">
            {conversationsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl animate-pulse"
                    style={{ background: 'rgba(253,253,254,0.08)' }}
                  />
                ))}
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedClientId={selectedClientId}
                onSelect={handleSelectClient}
              />
            )}
          </div>
        </div>

        {/* Right Panel — thread */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedClientId ? (
            <>
              {/* Thread header */}
              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{
                  background: '#474B48',
                  boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold"
                  style={{ background: 'rgba(253,253,254,0.14)', color: '#FDFDFE' }}
                >
                  {selectedClientName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[16px] font-semibold truncate"
                    style={{ color: '#FDFDFE' }}
                  >
                    {selectedClientName}
                  </p>
                  <p
                    className="text-[11px] uppercase tracking-[0.16em]"
                    style={{ color: 'rgba(253,253,254,0.56)' }}
                  >
                    Cliënt
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <MessageThread
                  currentUserId={userId}
                  otherUserId={selectedClientId}
                  otherUserName={selectedClientName}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
              <div
                className="text-center space-y-4 max-w-sm px-8 py-8 rounded-3xl"
                style={{
                  background: '#A6ADA7',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(253,253,254,0.14)' }}
                >
                  <MessageCircle
                    className="w-8 h-8"
                    strokeWidth={1.5}
                    style={{ color: '#FDFDFE' }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[17px] font-semibold" style={{ color: '#FDFDFE' }}>
                    Selecteer een gesprek
                  </p>
                  <p
                    className="text-[14px]"
                    style={{ color: 'rgba(253,253,254,0.72)' }}
                  >
                    Kies een cliënt uit de lijst om berichten uit te wisselen
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden w-full flex flex-col overflow-hidden">
        {!selectedClientId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div
              className="px-5 pt-5 pb-3"
              style={{
                background: '#474B48',
                boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: 'rgba(253,253,254,0.44)' }}
              >
                Inbox
              </span>
              <h1
                className="text-[26px] font-bold tracking-tight mt-1"
                style={{ color: '#FDFDFE' }}
              >
                Berichten
              </h1>
            </div>

            <div className="flex-1 overflow-hidden" style={{ background: '#474B48' }}>
              {conversationsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl animate-pulse"
                      style={{ background: 'rgba(253,253,254,0.08)' }}
                    />
                  ))}
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  selectedClientId={selectedClientId}
                  onSelect={handleSelectClient}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Thread Header */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{
                background: '#474B48',
                boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <button
                onClick={handleBackToList}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(253,253,254,0.10)',
                  color: '#FDFDFE',
                }}
                aria-label="Terug naar berichten"
              >
                <ArrowLeft strokeWidth={1.75} className="w-5 h-5" />
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold"
                style={{ background: 'rgba(253,253,254,0.14)', color: '#FDFDFE' }}
              >
                {selectedClientName?.charAt(0).toUpperCase() || '?'}
              </div>
              <h2
                className="text-[16px] font-semibold flex-1 truncate"
                style={{ color: '#FDFDFE' }}
              >
                {selectedClientName}
              </h2>
            </div>

            <div className="flex-1 overflow-hidden">
              <MessageThread
                currentUserId={userId}
                otherUserId={selectedClientId}
                otherUserName={selectedClientName}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
