'use client'

import { useState } from 'react'
import { Mail, Check, Loader2 } from 'lucide-react'

interface ResendInviteButtonProps {
  clientId: string
  clientName: string
}

export function ResendInviteButton({ clientId, clientName }: ResendInviteButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleResend() {
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/clients/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Er ging iets mis')
      }

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <button
      onClick={handleResend}
      disabled={status === 'loading'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 disabled:opacity-50"
      style={{
        backgroundColor: status === 'success' ? '#3D8B5C' : status === 'error' ? '#D14343' : '#F5F5F5',
        color: status === 'success' || status === 'error' ? '#fff' : '#1A1A18',
      }}
      title={`Uitnodiging opnieuw versturen naar ${clientName}`}
    >
      {status === 'loading' && <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />}
      {status === 'success' && <Check strokeWidth={1.5} className="w-4 h-4" />}
      {status === 'error' && <Mail strokeWidth={1.5} className="w-4 h-4" />}
      {status === 'idle' && <Mail strokeWidth={1.5} className="w-4 h-4" />}
      <span>
        {status === 'loading' && 'Versturen...'}
        {status === 'success' && 'Verstuurd!'}
        {status === 'error' && (errorMsg || 'Fout')}
        {status === 'idle' && 'Uitnodiging opnieuw'}
      </span>
    </button>
  )
}
