'use client'

import Image from 'next/image'
import { Image as ImageIcon, FileText, Play } from 'lucide-react'

interface MessagePreviewProps {
  messageType: string
  content: string
  fileUrl: string | null
}

export function MessagePreview({ messageType, content, fileUrl }: MessagePreviewProps) {
  if (messageType === 'image' && fileUrl) {
    return (
      <div className="mt-3">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
        >
          <Image
            src={fileUrl}
            alt="Afbeelding bericht"
            width={200}
            height={200}
            className="max-h-48 object-cover rounded-lg"
            unoptimized
            loading="lazy"
          />
        </a>
      </div>
    )
  }

  if (messageType === 'video' && fileUrl) {
    return (
      <div className="mt-3 relative inline-block">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block relative"
        >
          <video
            src={fileUrl}
            className="max-h-48 rounded-lg"
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg">
            <Play className="w-12 h-12 text-white" />
          </div>
        </a>
      </div>
    )
  }

  if (messageType === 'file' && fileUrl) {
    const fileName = fileUrl.split('/').pop() || 'Bestand'
    return (
      <div className="mt-3 p-3 rounded-lg bg-surface-muted border border-border flex items-center gap-3">
        <FileText className="w-5 h-5 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{fileName}</p>
        </div>
        <a
          href={fileUrl}
          download
          className="text-xs font-medium text-accent hover:text-accent-dark transition-colors whitespace-nowrap"
        >
          Download
        </a>
      </div>
    )
  }

  // For text messages
  return <p className="text-sm text-text-primary">{content}</p>
}
