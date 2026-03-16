'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Client {
  id: string
  full_name: string
}

interface ProgramAssignModalProps {
  isOpen: boolean
  onClose: () => void
  templateId: string
  templateName: string
  durationWeeks: number
  preSelectedClientId?: string
}

export function ProgramAssignModal({
  isOpen,
  onClose,
  templateId,
  templateName,
  durationWeeks,
  preSelectedClientId,
}: ProgramAssignModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId || '')
  const [programName, setProgramName] = useState(templateName)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [coachNotes, setCoachNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return

    const fetchClients = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'client')
          .order('full_name', { ascending: true })

        if (error) throw error
        setClients(data || [])
        if (preSelectedClientId) {
          setSelectedClientId(preSelectedClientId)
        } else if (data && data.length > 0) {
          setSelectedClientId(data[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch clients:', err)
        setError('Fout bij het laden van cliënten')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [isOpen, supabase])

  const handleAssign = async () => {
    if (!selectedClientId || !startDate) {
      setError('Selecteer een cliënt en startdatum')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Calculate end date
      const start = new Date(startDate)
      const end = new Date(start)
      end.setDate(end.getDate() + durationWeeks * 7)
      const endDateString = end.toISOString().split('T')[0]

      // Deactivate any existing active programs for this client
      await supabase
        .from('client_programs')
        .update({ is_active: false })
        .eq('client_id', selectedClientId)
        .eq('is_active', true)

      const { error: insertError } = await supabase.from('client_programs').insert({
        client_id: selectedClientId,
        template_id: templateId,
        name: programName,
        start_date: startDate,
        end_date: endDateString,
        is_active: true,
        coach_notes: coachNotes || null,
      })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setProgramName(templateName)
        setCoachNotes('')
        setError(null)
      }, 1500)
    } catch (err) {
      console.error('Failed to assign program:', err)
      setError('Fout bij het toewijzen van programma')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="p-5 border-b border-[#E8E4DC] flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[#1A1A18]">
              {success ? 'Gereed!' : 'Programma toewijzen'}
            </h2>
            {!success && (
              <button
                onClick={onClose}
                className="text-[#8E8E93] hover:text-[#1A1A18] transition-colors p-1"
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-[15px] text-[#1A1A18]">
                  Programma succesvol toegewezen
                </p>
              </div>
            ) : (
              <>
                {/* Client Select */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Cliënt
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <option>Laden...</option>
                    ) : clients.length === 0 ? (
                      <option disabled>Geen cliënten beschikbaar</option>
                    ) : (
                      clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.full_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
                  />
                </div>

                {/* Program Name */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Programma naam
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
                  />
                </div>

                {/* Coach Notes */}
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                    Coach aantekeningen (optioneel)
                  </label>
                  <textarea
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors resize-none"
                    placeholder="Bijzondere opmerkingen..."
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-[13px] text-red-700">{error}</p>
                  </div>
                )}

                {/* Duration Info */}
                <div className="p-3 bg-[#EDEAE4] border border-[#ECEAE3] rounded-2xl">
                  <p className="text-[13px] text-[#1A1917]">
                    <span className="font-semibold">Duur:</span> {durationWeeks} weken
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {!success && (
            <div className="p-5 border-t border-[#E8E4DC] flex gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                onClick={handleAssign}
                loading={saving}
                disabled={!selectedClientId || loading}
                className="flex-1"
              >
                {saving ? '' : 'Toewijzen'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
