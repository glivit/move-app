'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileText, Download, Mic, X } from 'lucide-react'

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
      <Image
        src={src}
        alt="Vergrote afbeelding"
        width={600}
        height={600}
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
        unoptimized
      />
    </div>
  )
}

function MediaContent({ message, isOwn }: { message: ChatBubbleProps['message']; isOwn: boolean }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileUrl = message.image_url

  // isOwn = user (dark bubble, light text)
  // !isOwn = coach (light bubble, dark text)
  const textClass = isOwn ? 'text-[#FDFDFE]' : 'text-[#1A1917]'
  const accentClass = isOwn ? 'text-[#C0FC01]' : 'text-[#1A1917]'
  const subtleClass = isOwn ? 'text-[rgba(253,253,254,0.56)]' : 'text-[rgba(26,25,23,0.48)]'

  // Image
  if (message.type === 'image' && fileUrl) {
    return (
      <>
        <Image
          src={fileUrl}
          alt="Afbeelding"
          width={260}
          height={260}
          className="rounded-xl max-w-[260px] h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setLightboxOpen(true)}
          unoptimized
          loading="lazy"
        />
        {message.content && message.content !== fileUrl.split('/').pop() && (
          <p className={`text-[15px] mt-2 ${textClass}`}>
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
          <p className={`text-[15px] mt-2 ${textClass}`}>
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
        <Mic size={16} className={accentClass} />
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
          isOwn ? 'bg-[rgba(253,253,254,0.10)]' : 'bg-[rgba(26,25,23,0.06)]'
        }`}
      >
        <FileText size={18} className={accentClass} />
        <span className={`text-[13px] font-medium truncate max-w-[160px] ${textClass}`}>
          {fileName}
        </span>
        <Download size={14} className={subtleClass} />
      </a>
    )
  }

  // Text (default)
  return <p className={`text-[15px] leading-[1.45] ${textClass}`}>{message.content}</p>
}

export function ChatBubble({ message, isCoach }: ChatBubbleProps) {
  const time = formatTime(message.created_at)
  const isOwn = !isCoach

  if (isCoach) {
    return (
      <div className="flex justify-start">
        <div className="flex flex-col max-w-[78%]">
          <div
            style={{
              background: '#FDFDFE',
              borderRadius: '20px',
              borderBottomLeftRadius: '4px',
              padding: '12px 16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            <MediaContent message={message} isOwn={false} />
          </div>
          <span className="text-[11px] mt-1 px-2" style={{ color: 'rgba(253,253,254,0.56)' }}>{time}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="flex flex-col max-w-[78%] items-end">
        <div
          style={{
            background: '#474B48',
            borderRadius: '20px',
            borderBottomRightRadius: '4px',
            padding: '12px 16px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.22)',
          }}
        >
          <MediaContent message={message} isOwn={true} />
        </div>
        <span className="text-[11px] mt-1 px-2" style={{ color: 'rgba(253,253,254,0.56)' }}>{time}</span>
      </div>
    </div>
  )
}
