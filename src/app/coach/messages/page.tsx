'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
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

  // Get current user ID from auth
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <div className="h-3 rounded-lg w-48 mx-auto animate-pulse" style={{ backgroundColor: '#E8E4DC' }} />
            <div className="h-3 rounded-lg w-64 mx-auto animate-pulse" style={{ backgroundColor: '#E8E4DC' }} />
            <div className="h-3 rounded-lg w-56 mx-auto animate-pulse" style={{ backgroundColor: '#E8E4DC' }} />
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated state
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="text-center space-y-3">
          <p style={{ color: '#8E8E93' }} className="text-lg font-medium">
            Niet aangemeld
          </p>
          <p style={{ color: '#8E8E93' }} className="text-sm">
            Meld je aan om berichten te zien
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-80px)]" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Desktop Layout: Split view (list + thread) */}
      <div className="hidden lg:flex w-full gap-0">
        {/* Left Panel: Conversation List */}
        <div
          className="w-80 border-r flex flex-col overflow-hidden"
          style={{ borderColor: '#E8E4DC' }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 border-b"
            style={{ borderColor: '#E8E4DC' }}
          >
            <h1
              className="text-2xl font-bold"
              style={{ color: '#1A1A18' }}
            >
              Berichten
            </h1>
            <p
              className="text-xs mt-1"
              style={{ color: '#8E8E93' }}
            >
              Jouw gesprekken
            </p>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-hidden">
            {conversationsLoading ? (
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="h-4 rounded-lg w-3/4 animate-pulse" style={{ backgroundColor: '#E8E4DC' }} />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-lg animate-pulse"
                        style={{ backgroundColor: '#E8E4DC' }}
                      />
                    ))}
                  </div>
                </div>
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

        {/* Right Panel: Message Thread */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedClientId ? (
            <MessageThread
              currentUserId={userId}
              otherUserId={selectedClientId}
              otherUserName={selectedClientName}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
              <div className="text-center space-y-3 max-w-sm">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ backgroundColor: '#E8E4DC' }}
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#1A1917' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p
                  className="text-lg font-medium"
                  style={{ color: '#1A1A18' }}
                >
                  Selecteer een gesprek
                </p>
                <p
                  className="text-sm"
                  style={{ color: '#8E8E93' }}
                >
                  Kies een cliënt uit de lijst om berichten uit te wisselen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout: Toggle between list and thread */}
      <div className="lg:hidden w-full flex flex-col overflow-hidden">
        {!selectedClientId ? (
          // Show conversation list on mobile
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Header */}
            <div
              className="px-4 py-4 border-b"
              style={{ borderColor: '#E8E4DC' }}
            >
              <h1
                className="text-2xl font-bold"
                style={{ color: '#1A1A18' }}
              >
                Berichten
              </h1>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-hidden">
              {conversationsLoading ? (
                <div className="p-4 space-y-4">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-lg animate-pulse"
                        style={{ backgroundColor: '#E8E4DC' }}
                      />
                    ))}
                  </div>
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
          // Show message thread on mobile
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Thread Header with Back Button */}
            <div
              className="px-4 py-3 border-b flex items-center gap-3"
              style={{ borderColor: '#E8E4DC' }}
            >
              <button
                onClick={handleBackToList}
                className="p-2 rounded-lg transition-colors hover:opacity-75"
                style={{ backgroundColor: '#E8E4DC', color: '#1A1A18' }}
                aria-label="Terug naar berichten"
              >
                <ArrowLeft strokeWidth={1.5} className="w-5 h-5" />
              </button>
              <h2
                className="text-lg font-semibold"
                style={{ color: '#1A1A18' }}
              >
                {selectedClientName}
              </h2>
            </div>

            {/* Message Thread */}
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
