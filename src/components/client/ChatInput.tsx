'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string) => void
  loading?: boolean
}

export function ChatInput({ onSend, loading = false }: ChatInputProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showSendButton, setShowSendButton] = useState(false)

  useEffect(() => {
    setShowSendButton(content.trim().length > 0)
  }, [content])

  const handleSend = () => {
    if (!content.trim()) return
    onSend(content)
    setContent('')
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }

  return (
    <div className="bg-white border-t border-client-border px-4 py-3 flex items-end gap-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Typ een bericht..."
        disabled={loading}
        className="flex-1 bg-client-surface-muted rounded-full px-5 py-3 text-[15px] placeholder:text-client-text-muted resize-none min-h-[44px] max-h-[120px] focus:outline-none disabled:opacity-50"
        rows={1}
      />
      {showSendButton && (
        <button
          onClick={handleSend}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 hover:bg-accent-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed transform origin-bottom-right transition-transform duration-200 scale-100 hover:scale-105"
          aria-label="Bericht verzenden"
          title="Bericht verzenden"
        >
          <Send size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
