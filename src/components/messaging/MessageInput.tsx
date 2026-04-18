'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Send, Paperclip, X } from 'lucide-react'

interface MessageInputProps {
  onSend: (content: string, type: string, fileUrl?: string) => void
  disabled?: boolean
}

// v6 Orion composer (coach-side): muted-fill input, ink-pill send (lime is reserved
// as event-paint for the sending action).
const LIME = '#C0FC01'

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<{ name: string; url: string; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    if (!content.trim() && !filePreview) return

    if (filePreview) {
      const messageType = filePreview.type.startsWith('image/')
        ? 'image'
        : filePreview.type.startsWith('video/')
          ? 'video'
          : 'file'
      onSend(content || filePreview.name, messageType, filePreview.url)
    } else {
      onSend(content, 'text')
    }

    setContent('')
    setFilePreview(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'message-attachments')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload mislukt')

      setFilePreview({
        name: file.name,
        url: uploadData.url,
        type: file.type,
      })
    } catch (error) {
      console.error('Fout bij uploaden bestand:', error)
      alert('Fout bij uploaden bestand. Probeer opnieuw.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const canSend = (content.trim() || filePreview) && !isUploading && !disabled

  return (
    <div
      className="px-4 py-3 space-y-3"
      style={{
        background: '#474B48',
        borderTop: '1px solid rgba(253,253,254,0.08)',
      }}
    >
      {/* File preview */}
      {filePreview && (
        <div
          className="flex items-start justify-between gap-3 p-3 rounded-2xl"
          style={{ background: 'rgba(253,253,254,0.08)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: '#FDFDFE' }}>
              {filePreview.name}
            </p>
            {filePreview.type.startsWith('image/') && (
              <Image
                src={filePreview.url}
                alt="preview"
                width={150}
                height={150}
                className="mt-2 max-h-32 rounded-xl"
                unoptimized
                loading="lazy"
              />
            )}
          </div>
          <button
            onClick={() => setFilePreview(null)}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(253,253,254,0.72)' }}
            aria-label="Verwijder bestandsvoorbeeld"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(253,253,254,0.10)',
            color: '#FDFDFE',
          }}
          aria-label="Bijlage toevoegen"
          title="Bijlage toevoegen"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading || disabled}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
        />

        <div
          className="flex-1 rounded-3xl overflow-hidden"
          style={{ background: 'rgba(253,253,254,0.10)' }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht..."
            disabled={isUploading || disabled}
            rows={1}
            className="w-full px-4 py-3 bg-transparent text-[15px] resize-none focus:outline-none max-h-[120px] placeholder:text-[rgba(253,253,254,0.44)]"
            style={{ color: '#FDFDFE' }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canSend ? LIME : 'rgba(253,253,254,0.10)',
            color: canSend ? '#1A1917' : '#FDFDFE',
            boxShadow: canSend ? '0 2px 6px rgba(192,252,1,0.32)' : 'none',
          }}
          title="Bericht verzenden"
          aria-label="Bericht verzenden"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {isUploading && (
        <p
          className="text-[11px] text-center uppercase tracking-[0.16em]"
          style={{ color: 'rgba(253,253,254,0.56)' }}
        >
          Bestand uploaden…
        </p>
      )}
    </div>
  )
}
