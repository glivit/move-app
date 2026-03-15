'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Download, Loader2, ExternalLink } from 'lucide-react'

interface ReportButtonProps {
  clientId: string
  clientName: string
}

export function ReportButton({ clientId, clientName }: ReportButtonProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [period, setPeriod] = useState(4)
  const [showOptions, setShowOptions] = useState(false)
  const [coachNotes, setCoachNotes] = useState('')

  const generateReport = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          period_weeks: period,
          coach_notes: coachNotes,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Rapport generatie mislukt')
      }

      // Download the PDF
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MOVE-Rapport-${clientName.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setShowOptions(false)
      setCoachNotes('')
    } catch (error: any) {
      // Fallback to report preview page if PDF generation fails
      router.push(`/coach/clients/${clientId}/report`)
    } finally {
      setGenerating(false)
    }
  }

  const openReportPreview = () => {
    router.push(`/coach/clients/${clientId}/report`)
  }

  if (!showOptions) {
    return (
      <button
        onClick={() => setShowOptions(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-[#F0F0ED] text-[14px] font-medium text-[#1A1A18] hover:bg-[#F5F0E8] hover:border-[#8B6914]/30 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <FileText size={16} strokeWidth={1.5} className="text-[#8B6914]" />
        PDF Rapport
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-[#1A1A18]">Voortgangsrapport genereren</h3>
        <button
          onClick={() => setShowOptions(false)}
          className="text-[#8E8E93] text-[13px] hover:text-[#1A1A18]"
        >
          Annuleren
        </button>
      </div>

      {/* Period selector */}
      <div className="mb-4">
        <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-2">
          Periode
        </label>
        <div className="flex gap-2">
          {[
            { value: 2, label: '2 wkn' },
            { value: 4, label: '4 wkn' },
            { value: 8, label: '8 wkn' },
            { value: 12, label: '12 wkn' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                period === opt.value
                  ? 'bg-[#8B6914] text-white'
                  : 'bg-[#F0F0ED] text-[#8E8E93] hover:text-[#1A1A18]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coach notes */}
      <div className="mb-4">
        <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-2">
          Persoonlijke notitie (optioneel)
        </label>
        <textarea
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder="Wordt onderaan het rapport getoond..."
          className="w-full px-3 py-2.5 border border-[#F0F0ED] rounded-xl text-[13px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914] resize-none h-20"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={generateReport}
          disabled={generating}
          className="flex-1 py-3 px-4 bg-[#8B6914] text-white rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#6F5612] transition-colors disabled:opacity-60"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Genereren...
            </>
          ) : (
            <>
              <Download size={16} strokeWidth={1.5} />
              Download PDF
            </>
          )}
        </button>
        <button
          onClick={openReportPreview}
          className="py-3 px-4 bg-[#F0F0ED] text-[#1A1A18] rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#E8E8E5] transition-colors"
        >
          <ExternalLink size={16} strokeWidth={1.5} />
          Preview
        </button>
      </div>
    </div>
  )
}
