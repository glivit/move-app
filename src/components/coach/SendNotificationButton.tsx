'use client'

import { useState } from 'react'
import { Bell, Send, X } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
}

const quickMessages = [
  { label: 'Training herinnering', title: 'Tijd om te trainen!', message: 'Hey {name}, vergeet je training vandaag niet! Ga ervoor 💪', url: '/client/program' },
  { label: 'Check-in herinnering', title: 'Wekelijkse check-in', message: 'Hey {name}, het is weer tijd voor je wekelijkse check-in. Hoe gaat het?', url: '/client/check-in' },
  { label: 'Nieuw programma', title: 'Nieuw programma klaar!', message: 'Hey {name}, je nieuwe trainingsprogramma staat klaar. Bekijk het nu!', url: '/client/program' },
  { label: 'Motivatie', title: 'Keep going! 🔥', message: 'Hey {name}, je doet het geweldig. Blijf zo doorgaan!', url: '/client' },
]

export function SendNotificationButton({ clientId, clientName }: Props) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [mode, setMode] = useState<'quick' | 'custom'>('quick')

  const firstName = clientName.split(' ')[0]

  const sendNotification = async (title: string, message: string, url: string) => {
    setSending(true)
    setError(null)
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          title,
          message: message.replace('{name}', firstName),
          url,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Verzenden mislukt')
        return
      }

      setSent(true)
      setTimeout(() => {
        setSent(false)
        setOpen(false)
        setCustomTitle('')
        setCustomMessage('')
      }, 2000)
    } catch {
      setError('Netwerk fout')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-xl transition-all hover:bg-[#FAFAFA]"
        title="Stuur notificatie"
      >
        <Bell strokeWidth={1.5} className="w-5 h-5" style={{ color: '#8E8E93' }} />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div
        className="relative w-full max-w-md mx-4 mb-4 lg:mb-0 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'white',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#F0F0ED]">
          <h3 className="text-base font-semibold" style={{ color: '#1A1A18' }}>
            Notificatie naar {firstName}
          </h3>
          <button onClick={() => setOpen(false)} className="p-1">
            <X strokeWidth={1.5} className="w-5 h-5" style={{ color: '#8E8E93' }} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-3 pb-0">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              mode === 'quick' ? 'bg-[#1A1A18] text-white' : 'bg-[#FAFAFA] text-[#8E8E93]'
            }`}
          >
            Snel bericht
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              mode === 'custom' ? 'bg-[#1A1A18] text-white' : 'bg-[#FAFAFA] text-[#8E8E93]'
            }`}
          >
            Eigen bericht
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {sent ? (
            <div className="text-center py-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: '#E8FAF0' }}
              >
                <Bell strokeWidth={1.5} className="w-6 h-6" style={{ color: '#34C759' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#1A1A18' }}>
                Verzonden!
              </p>
            </div>
          ) : mode === 'quick' ? (
            <div className="space-y-2">
              {quickMessages.map((msg) => (
                <button
                  key={msg.label}
                  onClick={() => sendNotification(msg.title, msg.message, msg.url)}
                  disabled={sending}
                  className="w-full text-left p-3 rounded-xl transition-all hover:bg-[#FAFAFA] border border-[#F0F0ED]"
                >
                  <p className="text-sm font-semibold" style={{ color: '#1A1A18' }}>
                    {msg.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>
                    {msg.message.replace('{name}', firstName)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: '#8E8E93' }}>
                  Titel
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Notificatie titel..."
                  className="w-full mt-1 p-3 rounded-xl border border-[#F0F0ED] text-sm focus:outline-none focus:border-[#8B6914]"
                  style={{ color: '#1A1A18' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: '#8E8E93' }}>
                  Bericht
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Typ je bericht..."
                  rows={3}
                  className="w-full mt-1 p-3 rounded-xl border border-[#F0F0ED] text-sm focus:outline-none focus:border-[#8B6914] resize-none"
                  style={{ color: '#1A1A18' }}
                />
              </div>
              <button
                onClick={() => sendNotification(customTitle, customMessage, '/client')}
                disabled={sending || !customTitle.trim() || !customMessage.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: '#8B6914' }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Send strokeWidth={1.5} className="w-4 h-4" />
                  {sending ? 'Verzenden...' : 'Verstuur notificatie'}
                </span>
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-center mt-3" style={{ color: '#FF3B30' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
