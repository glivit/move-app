'use client'

import { useState } from 'react'
import { Search, Image as ImageIcon, Video as VideoIcon, Paperclip, Mic } from 'lucide-react'

interface Conversation {
  clientId: string
  client?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  lastMessage: {
    id: string
    content: string
    message_type: string
    created_at: string
  }
  unreadCount: number
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedClientId: string | null
  onSelect: (clientId: string) => void
}

type FilterTab = 'all' | 'unread'

const TAB_BASE =
  'flex-1 px-4 py-2 text-[13px] font-semibold rounded-full transition-colors'

export function ConversationList({
  conversations,
  selectedClientId,
  onSelect,
}: ConversationListProps) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredConversations = conversations.filter((conv) => {
    const matchesFilter =
      filter === 'all' || (filter === 'unread' && conv.unreadCount > 0)
    const matchesSearch =
      !searchTerm ||
      conv.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  const renderPreview = (conv: Conversation) => {
    const msg = conv.lastMessage
    if (msg.message_type === 'image') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Afbeelding</span>
        </span>
      )
    }
    if (msg.message_type === 'video') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <VideoIcon className="w-3.5 h-3.5" />
          <span>Video</span>
        </span>
      )
    }
    if (msg.message_type === 'voice') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5" />
          <span>Spraakbericht</span>
        </span>
      )
    }
    if (msg.message_type === 'file') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          <span>Bestand</span>
        </span>
      )
    }
    return msg.content || '(Geen inhoud)'
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Nu'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}u`
    if (diffDays === 1) return 'Gisteren'
    if (diffDays < 7) return `${diffDays}d`

    return date.toLocaleString('nl-BE', { month: 'short', day: 'numeric' })
  }

  const getInitial = (name: string): string => {
    return name?.charAt(0).toUpperCase() || '?'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="px-4 pt-2 pb-4 space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'rgba(253,253,254,0.56)' }}
          />
          <input
            type="text"
            placeholder="Zoeken op naam…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[14px] rounded-full focus:outline-none placeholder:text-[rgba(253,253,254,0.44)]"
            style={{
              background: 'rgba(253,253,254,0.10)',
              color: '#FDFDFE',
              border: '1px solid rgba(253,253,254,0.10)',
            }}
          />
        </div>

        {/* Segmented filter pill */}
        <div
          className="flex gap-1 p-1 rounded-full"
          style={{ background: 'rgba(26,25,23,0.18)' }}
        >
          <button
            onClick={() => setFilter('all')}
            className={TAB_BASE}
            style={
              filter === 'all'
                ? { background: '#FDFDFE', color: '#2A2D2B' }
                : { background: 'transparent', color: 'rgba(253,253,254,0.72)' }
            }
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`${TAB_BASE} inline-flex items-center justify-center gap-2`}
            style={
              filter === 'unread'
                ? { background: '#FDFDFE', color: '#2A2D2B' }
                : { background: 'transparent', color: 'rgba(253,253,254,0.72)' }
            }
          >
            Ongelezen
            {unreadTotal > 0 && (
              <span
                className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
                style={{
                  background: filter === 'unread' ? '#2A2D2B' : '#C0FC01',
                  color: filter === 'unread' ? '#FDFDFE' : '#1A1917',
                }}
              >
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <p className="text-sm text-center" style={{ color: 'rgba(253,253,254,0.56)' }}>
              {filter === 'unread' ? 'Geen ongelezen berichten' : 'Geen gesprekken'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => {
              const selected = selectedClientId === conv.clientId
              const hasUnread = conv.unreadCount > 0
              return (
                <button
                  key={conv.clientId}
                  onClick={() => onSelect(conv.clientId)}
                  className="w-full p-3 rounded-2xl text-left transition-all"
                  style={
                    selected
                      ? {
                          background: '#474B48',
                          boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.18)',
                        }
                      : {
                          background: '#A6ADA7',
                          boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(0,0,0,0.08)',
                        }
                  }
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0"
                      style={{
                        background: selected
                          ? 'rgba(253,253,254,0.14)'
                          : 'rgba(26,25,23,0.10)',
                        color: '#FDFDFE',
                      }}
                    >
                      {getInitial(conv.client?.full_name || 'Client')}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className="text-[15px] truncate"
                          style={{
                            color: '#FDFDFE',
                            fontWeight: hasUnread ? 700 : 600,
                          }}
                        >
                          {conv.client?.full_name || 'Onbekend'}
                        </p>
                        <span
                          className="text-[11px] whitespace-nowrap"
                          style={{
                            color: hasUnread
                              ? '#FDFDFE'
                              : 'rgba(253,253,254,0.56)',
                            fontWeight: hasUnread ? 600 : 400,
                          }}
                        >
                          {formatTime(conv.lastMessage.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p
                          className="text-[13px] truncate flex-1"
                          style={{
                            color: hasUnread
                              ? 'rgba(253,253,254,0.88)'
                              : 'rgba(253,253,254,0.64)',
                            fontWeight: hasUnread ? 500 : 400,
                          }}
                        >
                          {renderPreview(conv)}
                        </p>

                        {hasUnread && (
                          <div
                            className="flex-shrink-0 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[11px] font-bold px-1.5"
                            style={{ background: '#C0FC01', color: '#1A1917' }}
                          >
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
