'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase'
import { CheckCircle2 } from 'lucide-react'

interface LoggedWorkout {
  date: string
  programName: string
  notes: string
  logged_at: string
}

interface WorkoutLoggerProps {
  programName: string
  clientId: string
}

export function WorkoutLogger({ programName, clientId }: WorkoutLoggerProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [recentWorkouts, setRecentWorkouts] = useState<LoggedWorkout[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load recent workouts on mount
  useEffect(() => {
    loadRecentWorkouts()
  }, [clientId])

  const loadRecentWorkouts = async () => {
    setLoadingHistory(true)
    try {
      const supabase = createClient()

      // For now, we'll store workout logs in a simple JSON structure in the database
      // In a real scenario, you might have a dedicated workouts table
      // This is a placeholder that loads data from user preferences or metadata

      // Since we don't have a dedicated workouts table yet, we'll just clear the loading state
      setLoadingHistory(false)
    } catch (err) {
      console.error('Error loading workouts:', err)
      setLoadingHistory(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      if (!date || !notes.trim()) {
        setError('Voer alstublieft een datum en notities in')
        setSaving(false)
        return
      }

      // In a real scenario, this would save to a dedicated workouts table
      // For now, we'll just show a success message
      const newWorkout: LoggedWorkout = {
        date,
        programName,
        notes: notes.trim(),
        logged_at: new Date().toISOString(),
      }

      // Add to recent workouts
      setRecentWorkouts([newWorkout, ...recentWorkouts.slice(0, 4)])

      // Clear form
      setDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log workout')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logger Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-semibold text-text-primary">Workout loggen</h3>

          <Input
            type="date"
            label="Datum"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saving}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Notities
            </label>
            <textarea
              placeholder="Hoe ging het vandaag? Opmerkingen, gewicht gebruikt, enz."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
              <p className="text-sm text-accent">Workout gelogd!</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={saving}
            disabled={saving || !date || !notes.trim()}
          >
            {saving ? 'Opslaan...' : 'Workout loggen'}
          </Button>
        </form>
      </Card>

      {/* Recent Workouts */}
      {recentWorkouts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-text-primary">Recente workouts</h3>
          {recentWorkouts.map((workout, index) => (
            <Card key={index} padding="sm">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {workout.programName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(workout.date).toLocaleDateString('nl-BE')}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{workout.notes}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {loadingHistory && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-muted rounded-lg animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}
