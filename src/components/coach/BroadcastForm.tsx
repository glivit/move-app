'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Send, X } from 'lucide-react'

interface Client {
  id: string
  full_name: string
  avatar_url?: string
  email?: string
}

interface BroadcastFormProps {
  clients: Client[]
  onSend: (clientIds: string[], title: string, message: string) => Promise<void>
  isSending?: boolean
}

export function BroadcastForm({ clients, onSend, isSending = false }: BroadcastFormProps) {
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectAll = () => {
    if (selectedClientIds.size === clients.length) {
      setSelectedClientIds(new Set())
    } else {
      setSelectedClientIds(new Set(clients.map((c) => c.id)))
    }
  }

  const handleSelectClient = (clientId: string) => {
    const newSelected = new Set(selectedClientIds)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClientIds(newSelected)
  }

  const handleSendClick = () => {
    if (!title.trim() || !message.trim() || selectedClientIds.size === 0) return
    setShowConfirm(true)
  }

  const handleConfirmSend = async () => {
    setIsSubmitting(true)
    try {
      await onSend(Array.from(selectedClientIds), title, message)
      setTitle('')
      setMessage('')
      setSelectedClientIds(new Set())
      setShowConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = selectedClientIds.size
  const allSelected = clients.length > 0 && selectedCount === clients.length

  return (
    <>
      <div className="space-y-6">
        {/* Client Selection */}
        <div>
          <h3 className="font-semibold text-text-primary mb-3">Selecteer ontvangers</h3>

          {clients.length === 0 ? (
            <div className="p-4 bg-bg-secondary rounded-lg text-center text-text-muted text-sm">
              Geen clients beschikbaar
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-4">
              <label className="flex items-center gap-3 pb-3 border-b border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span className="flex-1 font-medium text-text-primary">
                  Selecteer alle klanten ({clients.length})
                </span>
              </label>

              {clients.map((client) => (
                <label key={client.id} className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={selectedClientIds.has(client.id)}
                    onChange={() => handleSelectClient(client.id)}
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent-dark">
                      {client.full_name.charAt(0)}
                    </div>
                    <span className="text-sm text-text-primary">{client.full_name}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedCount > 0 && (
            <p className="mt-2 text-sm text-accent-dark bg-accent/10 px-3 py-2 rounded-md">
              {selectedCount} klant{selectedCount !== 1 ? 'en' : ''} geselecteerd
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <Input
            label="Onderwerp"
            type="text"
            placeholder="Bijv. Wekelijkse update"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <p className="text-xs text-text-muted mt-1">{title.length}/100 karakters</p>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Bericht</label>
          <textarea
            placeholder="Schrijf je bericht hier..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={5}
            className="w-full px-3 py-2 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none text-sm"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-text-muted">{message.length}/1000 karakters</p>
            {message.length > 900 && (
              <p className="text-xs text-orange-600">Je nadert de limiet</p>
            )}
          </div>
        </div>

        {/* Preview */}
        {message && (
          <Card>
            <h4 className="text-xs font-medium text-text-muted uppercase mb-2">Voorbeeld</h4>
            <div className="bg-bg-secondary rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-accent/30 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-primary">Je coach</p>
                  <p className="text-sm text-text-secondary mt-0.5">{message}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Send */}
        <Button
          variant="primary"
          onClick={handleSendClick}
          disabled={!title.trim() || !message.trim() || selectedCount === 0 || isSubmitting || isSending}
        >
          <Send className="w-4 h-4 mr-2" />
          Verzenden naar {selectedCount} {selectedCount === 1 ? 'klant' : 'klanten'}
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card padding="lg">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Broadcast bevestigen</h3>
              <button onClick={() => setShowConfirm(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Weet je zeker dat je dit bericht wilt verzenden naar {selectedCount}{' '}
              {selectedCount === 1 ? 'klant' : 'klanten'}?
            </p>
            <div className="bg-bg-secondary rounded-lg p-3 mb-6">
              <p className="text-xs text-text-muted uppercase mb-1">Onderwerp</p>
              <p className="text-sm font-medium mb-2">{title}</p>
              <p className="text-xs text-text-muted uppercase mb-1">Bericht</p>
              <p className="text-sm text-text-secondary line-clamp-3">{message}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                Annuleren
              </Button>
              <Button variant="primary" onClick={handleConfirmSend} disabled={isSubmitting} loading={isSubmitting}>
                Verzenden
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
