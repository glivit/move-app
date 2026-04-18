'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  checkinId: string
  existingNotes: string | null
  isReviewed: boolean
  reviewedDate?: string | null
}

export function CheckInReviewForm({ checkinId, existingNotes, isReviewed, reviewedDate }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(existingNotes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('checkins')
      .update({
        coach_notes: notes,
        coach_reviewed: true,
      })
      .eq('id', checkinId)

    if (!error) {
      setSaved(true)
      setTimeout(() => router.push('/coach/check-ins'), 1500)
    }
    setSaving(false)
  }

  if (saved) {
    return (
      <Card variant="default" className="p-6 text-center space-y-4" style={{ backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }}>
        <div className="flex justify-center">
          <CheckCircle2 size={40} style={{ color: '#1D8C47' }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-display font-semibold" style={{ color: '#FDFDFE' }}>
            Review opgeslagen
          </p>
          <p className="text-sm mt-1" style={{ color: '#A3957E' }}>
            Cliënt ontvangt een notificatie
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="default" className="p-6 space-y-4" style={{ backgroundColor: '#A6ADA7', borderColor: '#E8E0D5' }}>
      <div>
        <h2 className="text-lg font-display font-semibold" style={{ color: '#FDFDFE' }}>
          Coach feedback
        </h2>
        {isReviewed && reviewedDate && (
          <p className="text-sm mt-2" style={{ color: '#A3957E' }}>
            Beoordeeld op{' '}
            {new Date(reviewedDate).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notities en feedback voor de cliënt..."
        rows={5}
        className="w-full rounded-lg border px-4 py-3 text-sm font-normal resize-none focus:outline-none transition-all"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E8E0D5',
          color: '#FDFDFE',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#FDFDFE'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(200, 169, 110, 0.1)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E8E0D5'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />

      <Button onClick={handleSubmit} loading={saving} fullWidth>
        {isReviewed ? 'Feedback bijwerken' : 'Markeer als beoordeeld'}
      </Button>
    </Card>
  )
}
