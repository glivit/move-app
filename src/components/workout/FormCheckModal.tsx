'use client'

import { useState, useRef, memo } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * FormCheckModal — video uploaden naar je coach voor feedback op één
 * specifieke oefening. Geëxtraheerd uit workout/active/page.tsx als losse
 * lazy-load chunk zodat het niet in de initial bundle van de active
 * workout pagina zit.
 */
function FormCheckModalComponent({
  exerciseName,
  onClose,
}: {
  exerciseName: string
  onClose: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [sent, setSent] = useState(false)
  const [note, setNote] = useState('')
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'message-attachments')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload mislukt')

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd')

      const { data: coaches } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'coach')
        .limit(1)

      if (!coaches || coaches.length === 0) throw new Error('Coach niet gevonden')

      const content = `📹 Form check: ${exerciseName}${note ? `\n${note}` : ''}`
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: coaches[0].id,
        content,
        message_type: 'video',
        file_url: uploadData.url,
      })

      setSent(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      console.error('Form check upload fout:', err)
      setUploadError(err instanceof Error ? err.message : 'Upload mislukt, probeer opnieuw')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-t-2xl p-6 animate-slide-up dark-surface" style={{ background: '#474B48' }}>
        <h3 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--card-text)' }}>
          Form Check
        </h3>
        <p className="text-[13px] mb-5" style={{ color: 'var(--card-text-muted)' }}>
          Neem een video op van je {exerciseName} en stuur deze naar je coach voor feedback.
        </p>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-[32px] mb-2">✅</div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--card-text)' }}>Verstuurd naar je coach!</p>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optioneel: vraag of opmerking..."
              className="w-full px-4 py-3 rounded-xl text-[14px] mb-4 focus:outline-none border"
              style={{
                background: 'var(--card-bg-tint)',
                color: 'var(--card-text)',
                borderColor: 'var(--card-divider)',
              }}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadError && (
              <p className="text-[13px] mb-3 text-center" style={{ color: '#B55A4A' }}>{uploadError}</p>
            )}
            <button
              onClick={() => { setUploadError(''); fileInputRef.current?.click() }}
              disabled={uploading}
              className="w-full py-4 rounded-2xl font-bold text-[14px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#C0FC01', color: '#000' }}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-[1.5px] rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.20)', borderTopColor: '#000' }} />
                  Uploaden...
                </>
              ) : (
                '📹 Video opnemen'
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 mt-2 text-[14px] font-medium"
              style={{ color: 'var(--card-text-muted)' }}
            >
              Annuleren
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export const FormCheckModal = memo(FormCheckModalComponent)
export default FormCheckModal
