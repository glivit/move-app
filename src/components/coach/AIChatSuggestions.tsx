'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, Loader } from 'lucide-react'

interface Message {
  role: string
  content: string
}

interface AIChatSuggestionsProps {
  clientId: string
  recentMessages: Message[]
  onSelectSuggestion: (text: string) => void
}

interface SuggestionsData {
  suggestions: string[]
}

export function AIChatSuggestions({
  clientId,
  recentMessages,
  onSelectSuggestion,
}: AIChatSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    if (recentMessages.length === 0) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/chat-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          recent_messages: recentMessages,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: SuggestionsData = await response.json()
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch suggestions'
      setError(message)
      console.error('Error fetching AI suggestions:', err)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [clientId, recentMessages])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handleSelectSuggestion = useCallback(
    (text: string) => {
      onSelectSuggestion(text)
      setIsVisible(false)
    },
    [onSelectSuggestion]
  )

  if (!isVisible || (suggestions.length === 0 && !isLoading && !error)) {
    return null
  }

  return (
    <div
      className="rounded-3xl px-4 py-3"
      style={{
        background: '#474B48',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles
            className="w-4 h-4"
            style={{ color: 'rgba(253,253,254,0.82)' }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'rgba(253,253,254,0.56)' }}
          >
            AI-suggesties
          </span>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(253,253,254,0.10)',
            color: '#FDFDFE',
          }}
          aria-label="Suggesties verversen"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4 gap-2">
          <Loader
            className="w-4 h-4 animate-spin"
            style={{ color: 'rgba(253,253,254,0.72)' }}
          />
          <span
            className="text-[12px]"
            style={{ color: 'rgba(253,253,254,0.72)' }}
          >
            Suggesties laden…
          </span>
        </div>
      ) : error ? (
        <p
          className="text-[12px] py-2"
          style={{ color: 'rgba(253,180,180,0.88)' }}
        >
          Fout bij laden suggesties
        </p>
      ) : suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3.5 py-2.5 rounded-2xl text-[14px] leading-[1.4] transition-colors focus:outline-none"
              style={{
                background: 'rgba(253,253,254,0.10)',
                color: '#FDFDFE',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(253,253,254,0.16)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(253,253,254,0.10)'
              }}
            >
              <p className="line-clamp-2">{suggestion}</p>
            </button>
          ))}
        </div>
      ) : (
        <p
          className="text-[12px] py-2"
          style={{ color: 'rgba(253,253,254,0.56)' }}
        >
          Geen suggesties beschikbaar
        </p>
      )}
    </div>
  )
}
