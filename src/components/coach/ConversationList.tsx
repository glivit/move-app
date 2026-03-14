'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'

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

  const getLastMessagePreview = (conv: Conversation): string => {
    const msg = conv.lastMessage
    if (msg.message_type === 'image') return '📷 Afbeelding'
    if (msg.message_type === 'video') return '🎥 Video'
    if (msg.message_type === 'file') return '📎 Bestand'
    return msg.content || '(Geen inhoud)'
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m geleden`
    if (diffHours < 24) return `${diffHours}u geleden`
    if (diffDays === 1) return 'Gisteren'
    if (diffDays < 7) return `${diffDays}d geleden`

    return date.toLocaleString('nl-BE', { month: 'short', day: 'numeric' })
  }

  const getInitial = (name: string): string => {
    return name?.charAt(0).toUpperCase() || '?'
  }

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      {/* Header */}
      <div className="p-4 space-y-4 border-b border-border">
        <h2 className="text-lg font-display font-semibold text-text-primary">
          Berichten
        </h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Zoeken..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-surface-muted border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-accent text-white'
                : 'bg-surface-muted text-text-primary hover:bg-border'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-accent text-white'
                : 'bg-surface-muted text-text-primary hover:bg-border'
            }`}
          >
            Ongelezen
          </button>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-text-muted text-center">
              {filter === 'unread'
                ? 'Geen ongelezen berichten'
                : 'Geen gesprekken'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.clientId}
                onClick={() => onSelect(conv.clientId)}
                className={`w-full p-3 rounded-lg transition-colors text-left space-y-1 ${
                  selectedClientId === conv.clientId
                    ? 'bg-accent/10 border border-accent'
                    : 'hover:bg-surface-muted'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-semibold text-accent">
                      {getInitial(conv.client?.full_name || 'Client')}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium text-text-primary truncate">
                        {conv.client?.full_name || 'Unknown'}
                      </p>
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-text-muted truncate">
                      {getLastMessagePreview(conv)}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-warning flex items-center justify-center text-xs font-bold text-white">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
