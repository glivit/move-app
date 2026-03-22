'use client'

import { useState } from 'react'
import { Play, FileText, Download, Mic, X } from 'lucide-react'

interface ChatBubbleProps {
  message: {
    id: string
    content: string
    type: string
    image_url?: string
    created_at: string
    sender_id: string
  }
  isCoach: boolean
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center z-10"
      >
        <X size={20} className="text-white" />
      </button>
      <img
        src={src}
        alt="Vergrote afbeelding"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function MediaContent({ message, isOwn }: { message: ChatBubbleProps['message']; isOwn: boolean }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileUrl = message.image_url

  // Image
  if (message.type === 'image' && fileUrl) {
    return (
      <>
        <img
          src={fileUrl}
          alt="Afbeelding"
          className="rounded-xl max-w-[260px] h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setLightboxOpen(true)}
          loading="lazy"
        />
        {message.content && message.content !== fileUrl.split('/').pop() && (
          <p className={`text-[15px] mt-2 ${isOwn ? 'text-white' : 'text-[#1A1917]'}`}>
            {message.content}
          </p>
        )}
        {lightboxOpen && <ImageLightbox src={fileUrl} onClose={() => setLightboxOpen(false)} />}
      </>
    )
  }

  // Video
  if (message.type === 'video' && fileUrl) {
    return (
      <div>
        <video
          src={fileUrl}
          controls
          preload="metadata"
          playsInline
          className="rounded-xl max-w-[260px] max-h-[300px]"
        />
        {message.content && message.content !== fileUrl.split('/').pop() && (
          <p className={`text-[15px] mt-2 ${isOwn ? 'text-white' : 'text-[#1A1917]'}`}>
            {message.content}
          </p>
        )}
      </div>
    )
  }

  // Voice message
  if (message.type === 'voice' && fileUrl) {
    return (
      <div className="flex items-center gap-3 min-w-[180px]">
        <Mic size={16} className={isOwn ? 'text-white/70' : 'text-[var(--color-pop)]'} />
        <audio src={fileUrl} controls className="h-8 flex-1" style={{ maxWidth: 200 }} />
      </div>
    )
  }

  // File
  if (message.type === 'file' && fileUrl) {
    const fileName = message.content || fileUrl.split('/').pop() || 'Bestand'
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
          isOwn ? 'bg-white/15' : 'bg-[#F0EDE8]'
        }`}
      >
        <FileText size={18} className={isOwn ? 'text-white/70' : 'text-[var(--color-pop)]'} />
        <span className={`text-[13px] font-medium truncate max-w-[160px] ${isOwn ? 'text-white' : 'text-[#1A1917]'}`}>
          {fileName}
        </span>
        <Download size={14} className={isOwn ? 'text-white/50' : 'text-[#A09D96]'} />
      </a>
    )
  }

  // Text (default)
  return <p className={`text-[15px] ${isOwn ? 'text-white' : 'text-[#1A1917]'}`}>{message.content}</p>
}

export function ChatBubble({ message, isCoach }: ChatBubbleProps) {
  const time = formatTime(message.created_at)
  const isOwn = !isCoach

  if (isCoach) {
    return (
      <div className="flex justify-start">
        <div className="flex flex-col max-w-[78%]">
          <div className="bg-white rounded-[20px] rounded-bl-[4px] px-4 py-3 shadow-sm">
            <MediaContent message={message} isOwn={false} />
          </div>
          <span className="text-[11px] text-[#C5C2BC] mt-1 px-2">{time}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="flex flex-col max-w-[78%] items-end">
        <div className="bg-[var(--color-pop)] rounded-[20px] rounded-br-[4px] px-4 py-3">
          <MediaContent message={message} isOwn={true} />
        </div>
        <span className="text-[11px] text-[#C5C2BC] mt-1 px-2">{time}</span>
      </div>
    </div>
  )
}
