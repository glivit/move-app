'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase'
import { Save, CheckCircle2 } from 'lucide-react'

interface ProgramNotesProps {
  programId: string
  initialNotes?: string
}

export function ProgramNotes({ programId, initialNotes = '' }: ProgramNotesProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
    setIsDirty(true)
  }

  const handleBlurSave = async () => {
    if (isDirty) {
      await saveNotes()
    }
  }

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveNotes()
  }

  const saveNotes = async () => {
    if (!isDirty) return

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('programs')
        .update({
          coach_notes: notes.trim(),
        })
        .eq('id', programId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccess(true)
      setIsDirty(false)

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleManualSave} className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-text-secondary">
            Coachnotities
          </label>
          {success && (
            <div className="flex items-center gap-1 text-sm text-accent">
              <CheckCircle2 className="h-4 w-4" />
              Opgeslagen
            </div>
          )}
        </div>

        <textarea
          value={notes}
          onChange={handleChange}
          onBlur={handleBlurSave}
          placeholder="Voeg notities toe voor deze training... (auto-saved)"
          disabled={saving}
          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          rows={4}
        />

        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {isDirty && (
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={saving}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              Notities opslaan
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}
