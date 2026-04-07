'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Send, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

interface MessageInputProps {
  onSend: (content: string, type: string, fileUrl?: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<{ name: string; url: string; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    if (!content.trim() && !filePreview) return

    if (filePreview) {
      const messageType = filePreview.type.startsWith('image/') ? 'image' :
                         filePreview.type.startsWith('video/') ? 'video' : 'file'
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
      // Upload via server-side API route (bypasses storage RLS)
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
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="border-t border-border bg-surface p-4 space-y-3">
      {/* File preview */}
      {filePreview && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-border">
          <div>
            <p className="text-sm font-medium text-text-primary truncate">{filePreview.name}</p>
            {filePreview.type.startsWith('image/') && (
              <Image
                src={filePreview.url}
                alt="preview"
                width={150}
                height={150}
                className="mt-2 max-h-32 rounded"
                unoptimized
                loading="lazy"
              />
            )}
          </div>
          <button
            onClick={() => setFilePreview(null)}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Verwijder bestandsvoorbeeld"
          >
            ×
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col rounded-lg border border-border bg-surface overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht..."
            disabled={isUploading || disabled}
            className="flex-1 px-4 py-3 bg-surface text-text-primary placeholder:text-text-muted resize-none focus:outline-none max-h-[120px]"
            rows={1}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading || disabled}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
        />

        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || disabled}
            className="p-3 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Bijlage toevoegen"
            title="Bijlage toevoegen"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <Button
            onClick={handleSend}
            disabled={(!content.trim() && !filePreview) || isUploading || disabled}
            className="px-3"
            size="md"
            title="Bericht verzenden"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {isUploading && (
        <p className="text-xs text-text-muted text-center">Bestand uploaden...</p>
      )}
    </div>
  )
}
