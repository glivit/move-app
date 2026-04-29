'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileText, Download, Play, X } from 'lucide-react'

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

/**
 * v6 Orion · Chat bubble
 * Geënt op design-system/09-chat.html. Belangrijke verschillen t.o.v. v5:
 *   - corners squished aan de TOP (top-left:8 voor coach, top-right:8 voor me)
 *     i.p.v. de bottom — geeft “gesprek-vlag” silhouet, matcht web app shells.
 *   - timestamp staat IN de bubble (`.t` regel, 10px, ink-faint, mt:4px,
 *     right-aligned voor me).
 *   - bubble: 14px font / 1.45 line-height / -0.003em letter-spacing.
 *   - max-width 76%, padding 11px 14px, border-radius 18px.
 * Voice note krijgt eigen waveform-pill (geen native <audio controls>).
 */

const CARD_LIGHT = '#A6ADA7' // coach bubble
const CARD_DARK = '#474B48' // me bubble
const INK = '#FDFDFE'
const INK_FAINT = 'rgba(253,253,254,0.44)'
const INK_SOFT = 'rgba(253,253,254,0.78)'

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
        aria-label="Sluiten"
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

/* ─────────────────────────────────────────────────────────────────
 *   Voice waveform — replaces native <audio controls>.
 *   Visueel matcht 09-chat.html: 32px ronde play, 22px hoge wave
 *   (2px brede staafjes), 11px duur. Toggelt audio play/pause.
 * ───────────────────────────────────────────────────────────────── */
function VoiceWave({ src, isOwn: _isOwn }: { src: string; isOwn: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState<string>('')
  const [audio] = useState(() => {
    if (typeof Audio === 'undefined') return null as unknown as HTMLAudioElement
    const a = new Audio(src)
    a.preload = 'metadata'
    return a
  })

  // Pseudo-random but deterministic bar heights so each voice msg has
  // a stable shape. Hash the URL.
  const bars = (() => {
    let seed = 0
    for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) | 0
    const out: number[] = []
    let s = seed || 1
    for (let i = 0; i < 22; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      out.push(4 + (s % 17)) // 4..20px
    }
    return out
  })()

  if (!audio) {
    return null
  }

  audio.onloadedmetadata = () => {
    if (Number.isFinite(audio.duration)) {
      const m = Math.floor(audio.duration / 60)
      const s = Math.floor(audio.duration % 60)
      setDuration(`${m}:${s.toString().padStart(2, '0')}`)
    }
  }
  audio.onended = () => setPlaying(false)

  const toggle = () => {
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <button
        onClick={toggle}
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.16)',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label={playing ? 'Pauzeer spraakbericht' : 'Speel spraakbericht af'}
      >
        {playing ? (
          <span
            style={{
              width: 9,
              height: 9,
              background: INK,
              borderRadius: 1,
              display: 'inline-block',
            }}
          />
        ) : (
          <Play size={11} style={{ color: INK, marginLeft: 2 }} fill={INK} strokeWidth={0} />
        )}
      </button>
      <div className="flex items-center gap-[2px]" style={{ height: 22 }}>
        {bars.map((h, i) => (
          <span
            key={i}
            style={{
              display: 'block',
              width: 2,
              height: h,
              borderRadius: 1,
              background: 'rgba(253,253,254,0.50)',
            }}
          />
        ))}
      </div>
      {duration && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: INK_SOFT,
            fontFeatureSettings: '"tnum"',
            letterSpacing: '0.02em',
            marginLeft: 4,
          }}
        >
          {duration}
        </span>
      )}
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
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.45,
              letterSpacing: '-0.003em',
              color: INK,
              marginTop: 8,
            }}
          >
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
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.45,
              letterSpacing: '-0.003em',
              color: INK,
              marginTop: 8,
            }}
          >
            {message.content}
          </p>
        )}
      </div>
    )
  }

  // Voice — waveform + play (NIET native controls)
  if (message.type === 'voice' && fileUrl) {
    return <VoiceWave src={fileUrl} isOwn={isOwn} />
  }

  // File
  if (message.type === 'file' && fileUrl) {
    const fileName = message.content || fileUrl.split('/').pop() || 'Bestand'
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-3 py-2 rounded-xl"
        style={{
          background: isOwn ? 'rgba(253,253,254,0.10)' : 'rgba(26,25,23,0.06)',
        }}
      >
        <FileText size={18} style={{ color: INK_SOFT }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: INK,
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fileName}
        </span>
        <Download size={14} style={{ color: INK_FAINT }} />
      </a>
    )
  }

  // Text (default)
  return (
    <p
      style={{
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.45,
        letterSpacing: '-0.003em',
        color: INK,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {message.content}
    </p>
  )
}

/**
 * System card — centered ghost pill met lime dot.
 * Renderpad voor type === 'system' (PR / workout-completed / check-in).
 * Lime is hier de event-paint regel; nooit op gewone bubbles.
 */
function SystemCard({ content }: { content: string }) {
  // Convention: "<title> · <strong>" → split op ' · ' om strong te markeren.
  const parts = content.split(' · ')
  const title = parts[0]
  const detail = parts.slice(1).join(' · ')

  return (
    <div className="flex justify-center">
      <div
        style={{
          maxWidth: '80%',
          padding: '11px 16px',
          borderRadius: 14,
          background: 'var(--card-bg-subtle)',
          border: '1px solid var(--card-divider)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          fontWeight: 400,
          color: INK_SOFT,
          letterSpacing: '0.005em',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#C0FC01',
            boxShadow: '0 0 8px rgba(192,252,1,0.60)',
            flexShrink: 0,
          }}
        />
        <span>
          {title}
          {detail && (
            <>
              {' · '}
              <strong style={{ color: INK, fontWeight: 500 }}>{detail}</strong>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

export function ChatBubble({ message, isCoach }: ChatBubbleProps) {
  // System events (PR, workout completed, check-in submitted) renderen
  // los van het bubble-paar.
  if (message.type === 'system') {
    return <SystemCard content={message.content} />
  }

  const time = formatTime(message.created_at)
  const isOwn = !isCoach

  // Coach = links, light card, top-left squished
  if (isCoach) {
    return (
      <div className="flex justify-start">
        <div
          style={{
            maxWidth: '76%',
            padding: '11px 14px',
            borderRadius: 18,
            borderTopLeftRadius: 8,
            background: CARD_LIGHT,
            color: INK,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.14)',
            wordWrap: 'break-word',
          }}
        >
          <MediaContent message={message} isOwn={false} />
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 400,
              color: INK_FAINT,
              letterSpacing: '0.02em',
              marginTop: 4,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {time}
          </span>
        </div>
      </div>
    )
  }

  // Me = rechts, dark card, top-right squished
  return (
    <div className="flex justify-end">
      <div
        style={{
          maxWidth: '76%',
          padding: '11px 14px',
          borderRadius: 18,
          borderTopRightRadius: 8,
          background: CARD_DARK,
          color: INK,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.22)',
          wordWrap: 'break-word',
        }}
      >
        <MediaContent message={message} isOwn={isOwn} />
        <span
          style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 400,
            color: INK_FAINT,
            letterSpacing: '0.02em',
            marginTop: 4,
            fontFeatureSettings: '"tnum"',
            textAlign: 'right',
          }}
        >
          {time}
        </span>
      </div>
    </div>
  )
}

/**
 * Typing indicator — 3-dot bounce.
 * Mount/unmount door de page als presence binnenkomt; render zelf is
 * dom: 3 ronde dots met cascaded animation-delay.
 */
export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        style={{
          padding: '13px 16px',
          background: CARD_LIGHT,
          borderRadius: 18,
          borderTopLeftRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.30s' }} />
      </div>
      <style jsx>{`
        :global(.typing-dot) {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(253, 253, 254, 0.58);
          animation: typing-bounce 1.2s infinite;
          display: inline-block;
        }
        @keyframes typing-bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.58;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
