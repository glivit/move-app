'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CheckCircle2, Loader2 } from 'lucide-react'

/**
 * v3 Orion review form.
 *
 * Fixes previous visibility bug: textarea had `backgroundColor: '#FFFFFF'`
 * with `color: '#FDFDFE'` — white ink on white paper → user could type but
 * not see a single character, and the "Markeer als beoordeeld" button below
 * was inside a white card that looked dead. Rewritten as dark #474B48 card
 * with semi-transparent input + high-contrast white pill button.
 */

interface Props {
  checkinId: string
  existingNotes: string | null
  isReviewed: boolean
  reviewedDate?: string | null
}

export function CheckInReviewForm({
  checkinId,
  existingNotes,
  isReviewed,
  reviewedDate,
}: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(existingNotes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    const { error: updErr } = await supabase
      .from('checkins')
      .update({
        coach_notes: notes,
        coach_reviewed: true,
      })
      .eq('id', checkinId)

    if (updErr) {
      setError(updErr.message)
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => router.push('/coach/check-ins'), 1200)
  }

  if (saved) {
    return (
      <div
        className="rounded-[18px] px-[18px] py-6 text-center"
        style={{ background: 'rgba(192,252,1,0.10)' }}
      >
        <div className="flex justify-center mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(192,252,1,0.18)' }}
          >
            <CheckCircle2
              strokeWidth={1.75}
              className="w-5 h-5"
              style={{ color: '#C0FC01' }}
            />
          </div>
        </div>
        <p
          className="text-[15px] font-medium m-0 tracking-[-0.005em]"
          style={{ color: '#FDFDFE' }}
        >
          Review opgeslagen
        </p>
        <p
          className="text-[12.5px] m-0 mt-1 leading-[1.45]"
          style={{ color: 'rgba(253,253,254,0.62)' }}
        >
          Cliënt ontvangt een notificatie.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-[18px] px-[18px] py-5"
      style={{ background: '#474B48' }}
    >
      {isReviewed && reviewedDate && (
        <p
          className="text-[11.5px] m-0 mb-3 uppercase tracking-[0.14em]"
          style={{ color: 'rgba(253,253,254,0.55)' }}
        >
          Beoordeeld op{' '}
          {new Date(reviewedDate).toLocaleDateString('nl-BE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notities en feedback voor de cliënt..."
        rows={5}
        className="w-full rounded-[14px] px-[14px] py-3 text-[14px] leading-[1.5] resize-none transition-colors focus:outline-none placeholder:text-[rgba(253,253,254,0.40)]"
        style={{
          background: 'rgba(253,253,254,0.06)',
          color: '#FDFDFE',
          border: 'none',
        }}
      />

      {error && (
        <div
          className="mt-3 px-3.5 py-2.5 rounded-[12px] text-[12.5px]"
          style={{
            background: 'rgba(232,108,60,0.10)',
            color: '#E86C3C',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-opacity active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: '#FDFDFE',
          color: '#1A1A18',
        }}
      >
        {saving ? (
          <>
            <Loader2 strokeWidth={2} className="w-4 h-4 animate-spin" />
            Opslaan…
          </>
        ) : (
          <>{isReviewed ? 'Feedback bijwerken' : 'Markeer als beoordeeld'}</>
        )}
      </button>
    </div>
  )
}
