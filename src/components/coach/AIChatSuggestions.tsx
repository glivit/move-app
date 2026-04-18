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

  // Auto-fetch suggestions when component mounts or messages change
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

  // Don't show anything if there are no messages or suggestions
  if (!isVisible || (suggestions.length === 0 && !isLoading && !error)) {
    return null
  }

  return (
    <div className="bg-[#A6ADA7] border border-[#A6ADA7] rounded-lg px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C0FC01]" />
          <span className="text-xs font-semibold text-[#E6E8E7] uppercase tracking-wide">
            AI suggesties
          </span>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="p-1 text-[#E6E8E7] hover:text-[#E6E8E7] hover:bg-[#A6ADA7] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Suggesties verversen"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Suggestions grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-3 gap-2">
          <Loader className="w-4 h-4 text-[#C0FC01] animate-spin" />
          <span className="text-xs text-[#E6E8E7]">Suggesties laden...</span>
        </div>
      ) : error ? (
        <p className="text-xs text-[#C0FC01]">Fout bij laden suggesties</p>
      ) : suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 bg-[#A6ADA7] border border-[#A6ADA7] rounded-xl text-sm text-[#E6E8E7] hover:border-[#C0FC01] hover:bg-[#FFF8F5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C0FC01] focus:ring-offset-1"
            >
              <p className="line-clamp-2">{suggestion}</p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#E6E8E7] py-2">Geen suggesties beschikbaar</p>
      )}
    </div>
  )
}
