'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, MessageCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface MessageSearchResult {
  id: string
  content: string
  clientName: string
  clientId: string
  createdAt: string
  senderName: string
}

export function MessageSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<MessageSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([])
        return
      }

      setIsLoading(true)

      try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select(
            `
            id,
            content,
            created_at,
            sender:profiles!messages_sender_id_fkey(id, full_name),
            recipient:profiles!messages_receiver_id_fkey(id, full_name)
          `
          )
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('Fout bij zoeken in berichten:', error)
          return
        }

        const formattedResults = (messages || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          clientName: msg.recipient?.full_name || 'Onbekend',
          clientId: msg.recipient?.id || '',
          createdAt: msg.created_at,
          senderName: msg.sender?.full_name || 'Onbekend',
        }))

        setResults(formattedResults)
        setIsOpen(true)
      } catch (error) {
        console.error('Fout bij zoeken:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleResultClick = (result: MessageSearchResult) => {
    router.push(`/coach/conversations/${result.clientId}`)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'rgba(253,253,254,0.56)' }}
        />
        <input
          type="text"
          placeholder="Zoeken in berichten…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery && setIsOpen(true)}
          className="w-full pl-10 pr-4 py-2.5 text-[14px] rounded-full focus:outline-none placeholder:text-[rgba(253,253,254,0.44)]"
          style={{
            background: 'rgba(253,253,254,0.10)',
            color: '#FDFDFE',
            border: '1px solid rgba(253,253,254,0.10)',
          }}
        />
      </div>

      {isOpen && (searchQuery || results.length > 0) && (
        <div
          className="absolute top-full mt-2 w-full z-50 overflow-hidden rounded-2xl"
          style={{
            background: '#474B48',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.28)',
          }}
        >
          {isLoading ? (
            <div className="p-5 text-center">
              <div className="inline-block animate-spin">
                <MessageCircle
                  className="w-4 h-4"
                  style={{ color: 'rgba(253,253,254,0.72)' }}
                />
              </div>
              <p
                className="text-[12px] mt-2"
                style={{ color: 'rgba(253,253,254,0.72)' }}
              >
                Zoeken…
              </p>
            </div>
          ) : results.length === 0 && searchQuery ? (
            <div className="p-6 text-center">
              <MessageCircle
                className="w-8 h-8 mx-auto mb-2"
                style={{ color: 'rgba(253,253,254,0.44)' }}
              />
              <p
                className="text-[13px]"
                style={{ color: 'rgba(253,253,254,0.72)' }}
              >
                Geen berichten gevonden
              </p>
            </div>
          ) : (
            <div
              className="max-h-96 overflow-y-auto"
              style={{
                // subtle row dividers
              }}
            >
              {results.map((result, idx) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-4 transition-colors"
                  style={{
                    borderTop:
                      idx > 0 ? '1px solid rgba(253,253,254,0.06)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(253,253,254,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold"
                        style={{ color: '#FDFDFE' }}
                      >
                        {result.clientName}
                      </p>
                      <p
                        className="text-[13px] line-clamp-2 mt-1"
                        style={{ color: 'rgba(253,253,254,0.72)' }}
                      >
                        {result.content}
                      </p>
                      <div
                        className="flex items-center gap-1.5 mt-2 text-[11px]"
                        style={{ color: 'rgba(253,253,254,0.56)' }}
                      >
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(result.createdAt), {
                          addSuffix: true,
                          locale: nl,
                        })}
                      </div>
                    </div>
                    <MessageCircle
                      className="w-4 h-4 flex-shrink-0 mt-1"
                      style={{ color: 'rgba(253,253,254,0.56)' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isOpen && !searchQuery && results.length === 0 && (
        <div
          className="absolute top-full mt-2 w-full z-50 p-4 text-center rounded-2xl"
          style={{
            background: '#474B48',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.28)',
          }}
        >
          <p
            className="text-[13px]"
            style={{ color: 'rgba(253,253,254,0.72)' }}
          >
            Type om berichten te zoeken
          </p>
        </div>
      )}
    </div>
  )
}
