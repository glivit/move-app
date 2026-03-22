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
    <div className="bg-[#FAF8F5] border border-[#E8E4DD] rounded-lg px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D4682A]" />
          <span className="text-xs font-semibold text-[#6B6862] uppercase tracking-wide">
            AI suggesties
          </span>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="p-1 text-[#9B9390] hover:text-[#6B6862] hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Suggesties verversen"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Suggestions grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-3 gap-2">
          <Loader className="w-4 h-4 text-[#D4682A] animate-spin" />
          <span className="text-xs text-[#9B9390]">Suggesties laden...</span>
        </div>
      ) : error ? (
        <p className="text-xs text-[#D4682A]">Fout bij laden suggesties</p>
      ) : suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 bg-white border border-[#E8E4DD] rounded-xl text-sm text-[#6B6862] hover:border-[#D4682A] hover:bg-[#FFF8F5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4682A] focus:ring-offset-1"
            >
              <p className="line-clamp-2">{suggestion}</p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#9B9390] py-2">Geen suggesties beschikbaar</p>
      )}
    </div>
  )
}
