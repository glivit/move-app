'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Send, Plus, Mic, X } from 'lucide-react'

interface MessageInputProps {
  onSend: (content: string, type: string, fileUrl?: string) => void
  disabled?: boolean
}

/**
 * v6 Orion · Coach composer — zelfde pill als client (design-system 09).
 * Grid: 36px attach · 1fr textveld · 36px mic/send.
 * Swap mic ↔ send zodra er tekst/bijlage is. Lime = event-paint voor send.
 */
const DARK = '#474B48'
const WHITE = '#FDFDFE'
const LIME = '#C0FC01'
const PLACEHOLDER = 'rgba(253,253,254,0.44)'
const INK_MUTED = 'rgba(253,253,254,0.62)'

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<{
    name: string
    url: string
    type: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasContent = content.trim().length > 0 || filePreview !== null

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

  return (
    <div
      style={{
        padding: '10px 5% calc(14px + env(safe-area-inset-bottom, 0px))',
        background:
          'linear-gradient(180deg, rgba(142,152,144,0) 0%, rgba(142,152,144,0.95) 30%, rgba(142,152,144,1) 100%)',
      }}
    >
      {/* File preview strip */}
      {filePreview && (
        <div className="pb-2 flex items-start justify-between gap-3">
          <div
            className="flex-1 min-w-0 p-3 rounded-2xl"
            style={{ background: 'rgba(253,253,254,0.08)' }}
          >
            <p className="text-[13px] font-medium truncate" style={{ color: WHITE }}>
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
            style={{ color: INK_MUTED }}
            aria-label="Verwijder bestandsvoorbeeld"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* The pill */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 36px',
          alignItems: 'center',
          gap: 8,
          padding: '8px',
          background: DARK,
          borderRadius: 999,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.28)',
        }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isUploading || disabled ? 0.5 : 1,
          }}
          aria-label="Bijlage toevoegen"
          title="Bijlage toevoegen"
        >
          <Plus size={16} style={{ color: WHITE }} strokeWidth={1.8} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading || disabled}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Bericht…"
          disabled={isUploading || disabled}
          rows={1}
          className="message-pill-textarea"
          style={{
            background: 'transparent',
            color: WHITE,
            border: 'none',
            outline: 'none',
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: '-0.003em',
            lineHeight: 1.4,
            padding: '8px 4px',
            resize: 'none',
            width: '100%',
            minHeight: 20,
            maxHeight: 120,
            fontFamily: 'inherit',
          }}
        />

        {hasContent ? (
          <button
            onClick={handleSend}
            disabled={isUploading || disabled}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: LIME,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(192,252,1,0.42)',
            }}
            aria-label="Bericht verzenden"
            title="Bericht verzenden"
          >
            <Send size={15} strokeWidth={2} style={{ color: '#1A1917' }} />
          </button>
        ) : (
          <button
            disabled
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
            }}
            aria-label="Spraakbericht (coach-side voice nog niet ingeschakeld)"
            title="Mic binnenkort"
          >
            <Mic size={15} style={{ color: WHITE }} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {isUploading && (
        <p
          className="text-[11px] text-center uppercase tracking-[0.16em] mt-2"
          style={{ color: INK_MUTED }}
        >
          Bestand uploaden…
        </p>
      )}

      <style jsx>{`
        .message-pill-textarea::placeholder {
          color: ${PLACEHOLDER};
        }
      `}</style>
    </div>
  )
}
