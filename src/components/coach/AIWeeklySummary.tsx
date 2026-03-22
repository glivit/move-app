'use client'

import { useState, useCallback } from 'react'
import { Bot, RefreshCw, ChevronDown, ChevronUp, Sparkles, AlertCircle } from 'lucide-react'

interface AIWeeklySummaryProps {
  clientId: string
  clientName: string
}

interface SummaryData {
  summary: string
  stats?: {
    workoutsCompleted?: number
    totalMinutes?: number
    averageIntensity?: string
  }
  generatedAt?: string
}

export function AIWeeklySummary({ clientId, clientName }: AIWeeklySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)

  const generateSummary = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai/weekly-summary?client_id=${encodeURIComponent(clientId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: SummaryData = await response.json()
      setSummary(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate summary'
      setError(message)
      console.error('Error generating AI summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DD] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-[#F0EDFF] to-[#E8E4FF] rounded-xl">
            <Bot className="w-5 h-5 text-[#6B4226]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1A1917]">Weekoverzicht {clientName}</h3>
            <p className="text-xs text-[#9B9390] mt-0.5">Gegenereerd door AI</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-[#6B6862] hover:bg-[#F5F2F0] rounded-lg transition-colors"
          aria-label={isExpanded ? 'Inklappen' : 'Uitklappen'}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Stats row if available */}
          {summary?.stats && (
            <div className="grid grid-cols-3 gap-3 pb-4 border-b border-[#E8E4DD]">
              {summary.stats.workoutsCompleted !== undefined && (
                <div className="bg-[#FAF8F5] rounded-lg p-3">
                  <p className="text-xs text-[#9B9390] font-medium">Trainingen</p>
                  <p className="text-lg font-semibold text-[#1A1917]">{summary.stats.workoutsCompleted}</p>
                </div>
              )}
              {summary.stats.totalMinutes !== undefined && (
                <div className="bg-[#FAF8F5] rounded-lg p-3">
                  <p className="text-xs text-[#9B9390] font-medium">Minuten</p>
                  <p className="text-lg font-semibold text-[#1A1917]">{summary.stats.totalMinutes}</p>
                </div>
              )}
              {summary.stats.averageIntensity && (
                <div className="bg-[#FAF8F5] rounded-lg p-3">
                  <p className="text-xs text-[#9B9390] font-medium">Intensiteit</p>
                  <p className="text-lg font-semibold text-[#1A1917]">{summary.stats.averageIntensity}</p>
                </div>
              )}
            </div>
          )}

          {/* Summary text */}
          {isLoading && !summary ? (
            <div className="space-y-3">
              <div className="h-4 bg-[#E8E4DD] rounded-full w-full animate-pulse" />
              <div className="h-4 bg-[#E8E4DD] rounded-full w-5/6 animate-pulse" />
              <div className="h-4 bg-[#E8E4DD] rounded-full w-4/5 animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-3 bg-[#FEF5F0] border border-[#FFD4C2] rounded-lg">
              <AlertCircle className="w-5 h-5 text-[#D4682A] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#D4682A]">Fout bij ophalen samenvatting</p>
                <p className="text-xs text-[#A0542F] mt-1">{error}</p>
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <p className="text-sm text-[#6B6862] leading-relaxed">{summary.summary}</p>
              {summary.generatedAt && (
                <p className="text-xs text-[#9B9390]">
                  Gegenereerd op: {new Date(summary.generatedAt).toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-[#9B9390] mb-4">Geen samenvatting gegenereerd</p>
              <button
                onClick={generateSummary}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4682A] text-white rounded-lg hover:bg-[#C25720] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Genereren
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer with refresh button */}
      {isExpanded && summary && (
        <div className="mt-4 pt-4 border-t border-[#E8E4DD] flex justify-end">
          <button
            onClick={generateSummary}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#D4682A] hover:bg-[#FFF8F5] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Samenvatting verversen"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Verversen
          </button>
        </div>
      )}

      {/* Initial generate button */}
      {!summary && !isLoading && !error && (
        <div className="flex justify-center pt-2">
          <button
            onClick={generateSummary}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4682A] text-white rounded-lg hover:bg-[#C25720] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Samenvatting genereren
          </button>
        </div>
      )}
    </div>
  )
}
