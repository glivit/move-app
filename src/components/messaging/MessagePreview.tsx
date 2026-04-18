'use client'

import Image from 'next/image'
import { FileText, Play } from 'lucide-react'

interface MessagePreviewProps {
  messageType: string
  content: string
  fileUrl: string | null
}

// v6: used inside MessageThread bubbles (both own/other use dark/light card).
// Text colour is always #FDFDFE on dark/light cards; accents muted.
export function MessagePreview({ messageType, content, fileUrl }: MessagePreviewProps) {
  if (messageType === 'image' && fileUrl) {
    return (
      <div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
        >
          <Image
            src={fileUrl}
            alt="Afbeelding bericht"
            width={240}
            height={240}
            className="max-h-60 object-cover rounded-xl"
            unoptimized
            loading="lazy"
          />
        </a>
      </div>
    )
  }

  if (messageType === 'video' && fileUrl) {
    return (
      <div className="relative inline-block">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block relative"
        >
          <video
            src={fileUrl}
            className="max-h-60 rounded-xl"
            preload="metadata"
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-xl">
            <Play className="w-10 h-10" style={{ color: '#FDFDFE' }} />
          </div>
        </a>
      </div>
    )
  }

  if (messageType === 'file' && fileUrl) {
    const fileName = content || fileUrl.split('/').pop() || 'Bestand'
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="flex items-center gap-3 px-3 py-2 rounded-xl"
        style={{ background: 'rgba(253,253,254,0.10)' }}
      >
        <FileText className="w-[18px] h-[18px]" style={{ color: 'rgba(253,253,254,0.72)' }} />
        <span
          className="text-[13px] font-medium truncate max-w-[180px]"
          style={{ color: '#FDFDFE' }}
        >
          {fileName}
        </span>
      </a>
    )
  }

  // Text
  return <p className="text-[15px] leading-[1.45]" style={{ color: '#FDFDFE' }}>{content}</p>
}
