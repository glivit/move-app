'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  Send,
  Plus,
  X,
  Camera,
  Image as ImageIcon,
  Film,
  Mic,
  Square,
  Paperclip,
} from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string, messageType?: string, fileUrl?: string) => void
  loading?: boolean
}

/**
 * v6 Orion · Chat input pill
 * Geënt op design-system/09-chat.html `.input-bar`:
 *   - dark pill (#474B48), grid 36px 1fr 36px.
 *   - links: attach/plus knop (opent media-menu).
 *   - midden: textveld (transparant, ink-placeholder).
 *   - rechts: MIC in rest-state — swap naar SEND zodra er tekst staat
 *     (design: "send na typen"). Long-press/klik op mic start opname.
 *   - geen top-border; het bubble-oppervlak zweeft boven canvas via
 *     eigen schaduw.
 */

// v7 — dark glass pill op licht canvas
const DARK = 'rgba(28,30,24,0.92)'
const WHITE = '#F2F2EC'
const LIME = '#C0FC01'
const PLACEHOLDER = 'rgba(242,242,236,0.50)'
const INK_MUTED = 'rgba(242,242,236,0.65)'
const INPUT_BG = 'rgba(255,255,255,0.08)'
const INPUT_HOVER = 'rgba(255,255,255,0.14)'

export function ChatInput({ onSend, loading = false }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filePreview, setFilePreview] = useState<{
    name: string
    url: string
    type: string
    localPreview?: string
  } | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const hasContent = content.trim().length > 0 || filePreview !== null

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      // Release any in-flight blob preview URL — prevents leak if user navigates
      // away mid-recording or with an attached preview.
      if (filePreview?.localPreview) {
        URL.revokeObjectURL(filePreview.localPreview)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = () => {
    if (isUploading) return

    if (filePreview) {
      const messageType = filePreview.type.startsWith('image/')
        ? 'image'
        : filePreview.type.startsWith('video/')
          ? 'video'
          : filePreview.type.startsWith('audio/')
            ? 'voice'
            : 'file'
      onSend(content || filePreview.name, messageType, filePreview.url)
      // Free the local blob URL — uploaded URL is what we render going forward.
      if (filePreview.localPreview) URL.revokeObjectURL(filePreview.localPreview)
      setFilePreview(null)
      setContent('')
    } else if (content.trim()) {
      onSend(content, 'text')
      setContent('')
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setShowMediaMenu(false)
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

  /* ─── compress large photos in-browser to keep upload fast ─── */
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || file.size < 500_000) return file

    return new Promise((resolve) => {
      const img = new window.Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        const maxWidth = 1200
        const maxHeight = 1200
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.8
        )
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(10)
    setShowMediaMenu(false)

    // If an old preview was attached, release its blob URL before overwriting.
    if (filePreview?.localPreview) URL.revokeObjectURL(filePreview.localPreview)

    try {
      let localPreview: string | undefined
      if (file.type.startsWith('image/')) {
        localPreview = URL.createObjectURL(file)
      }

      const processedFile = await compressImage(file)
      setUploadProgress(30)

      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('bucket', 'message-attachments')

      setUploadProgress(50)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload mislukt')

      setUploadProgress(100)

      setFilePreview({
        name: file.name,
        url: uploadData.url,
        type: file.type,
        localPreview,
      })
    } catch (error) {
      console.error('Upload fout:', error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    e.target.value = ''
  }

  /* ─── voice recording ─── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: 'audio/webm',
        })
        await uploadFile(audioFile)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      setShowMediaMenu(false)
    } catch (err) {
      console.error('Microfoon niet beschikbaar:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      style={{
        padding: '10px 5% calc(14px + env(safe-area-inset-bottom, 0px))',
        background:
          'linear-gradient(180deg, rgba(142,152,144,0) 0%, rgba(142,152,144,0.95) 30%, rgba(142,152,144,1) 100%)',
      }}
    >
      {/* ═══ File preview strip ═══ */}
      {filePreview && (
        <div className="pb-2">
          <div className="relative inline-block">
            {filePreview.type.startsWith('image/') ? (
              <Image
                src={filePreview.localPreview || filePreview.url}
                alt="Preview"
                width={80}
                height={80}
                className="h-20 rounded-xl object-cover"
                unoptimized
              />
            ) : filePreview.type.startsWith('video/') ? (
              <div
                className="h-20 w-32 rounded-xl flex items-center justify-center"
                style={{ background: INPUT_BG }}
              >
                <Film size={24} style={{ color: INK_MUTED }} />
                <span className="text-[11px] ml-1" style={{ color: INK_MUTED }}>
                  Video
                </span>
              </div>
            ) : filePreview.type.startsWith('audio/') ? (
              <div
                className="h-12 px-4 rounded-xl flex items-center gap-2"
                style={{ background: INPUT_BG }}
              >
                <Mic size={16} style={{ color: WHITE }} />
                <span className="text-[13px]" style={{ color: WHITE }}>
                  Spraakbericht
                </span>
              </div>
            ) : (
              <div
                className="h-12 px-4 rounded-xl flex items-center gap-2"
                style={{ background: INPUT_BG }}
              >
                <Paperclip size={16} style={{ color: INK_MUTED }} />
                <span
                  className="text-[13px] truncate max-w-[200px]"
                  style={{ color: WHITE }}
                >
                  {filePreview.name}
                </span>
              </div>
            )}
            <button
              onClick={() => {
                if (filePreview.localPreview) URL.revokeObjectURL(filePreview.localPreview)
                setFilePreview(null)
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: DARK,
                border: '1px solid rgba(253,253,254,0.12)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.32)',
              }}
              aria-label="Bestand verwijderen"
            >
              <X size={12} style={{ color: WHITE }} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Upload progress ═══ */}
      {isUploading && (
        <div className="pb-2">
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ background: INPUT_BG }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%`, background: LIME }}
              />
            </div>
            <span className="text-[11px]" style={{ color: INK_MUTED }}>
              Uploaden…
            </span>
          </div>
        </div>
      )}

      {/* ═══ Recording indicator ═══ */}
      {isRecording && (
        <div className="pb-2">
          <div
            className="flex items-center gap-3 py-2 px-4 rounded-full"
            style={{ background: 'rgba(232,96,79,0.14)' }}
          >
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: '#B55A4A' }}
            />
            <span className="text-[13px] font-medium" style={{ color: '#B55A4A' }}>
              Opnemen {formatRecordingTime(recordingTime)}
            </span>
            <button
              onClick={stopRecording}
              className="ml-auto w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#B55A4A' }}
              aria-label="Opname stoppen"
            >
              <Square size={12} style={{ color: WHITE }} fill={WHITE} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Media menu (chips) ═══ */}
      {showMediaMenu && !isRecording && (
        <div className="pb-2 flex gap-2 flex-wrap">
          {[
            { icon: ImageIcon, label: 'Foto', onClick: () => fileInputRef.current?.click() },
            { icon: Camera, label: 'Camera', onClick: () => cameraInputRef.current?.click() },
            { icon: Film, label: 'Video', onClick: () => videoInputRef.current?.click() },
            { icon: Paperclip, label: 'Bestand', onClick: () => docInputRef.current?.click() },
          ].map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors"
              style={{ background: INPUT_BG }}
              onMouseEnter={(e) => (e.currentTarget.style.background = INPUT_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.background = INPUT_BG)}
            >
              <Icon size={16} style={{ color: WHITE }} />
              <span
                className="text-[13px] font-medium"
                style={{ color: WHITE, letterSpacing: '-0.003em' }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
      />
      <input
        ref={cameraInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
        capture="environment"
      />
      <input
        ref={videoInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="video/*"
        capture="environment"
      />
      <input
        ref={docInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
      />

      {/* ═══ The pill — dark glass v7 ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 36px',
          alignItems: 'center',
          gap: 8,
          padding: '8px 8px 8px 8px',
          background: DARK,
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          borderRadius: 999,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(28,30,24,0.20)',
        }}
      >
        {/* Attach */}
        <button
          onClick={() => !isRecording && setShowMediaMenu(!showMediaMenu)}
          disabled={loading || isUploading || isRecording}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: showMediaMenu ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
            border: 'none',
            cursor: isRecording ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 160ms ease, transform 160ms ease',
            transform: showMediaMenu ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          aria-label={showMediaMenu ? 'Menu sluiten' : 'Bijlage toevoegen'}
        >
          <Plus size={16} style={{ color: WHITE }} strokeWidth={1.8} />
        </button>

        {/* Text field */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Opname bezig…' : 'Bericht…'}
          disabled={loading || isUploading || isRecording}
          rows={1}
          className="chat-pill-textarea"
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

        {/* Mic ↔ Send (hasContent triggert swap) */}
        {hasContent ? (
          <button
            onClick={handleSend}
            disabled={loading || isUploading}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: LIME,
              color: '#1A1917',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(192,252,1,0.42)',
              transition: 'transform 160ms ease',
            }}
            aria-label="Bericht verzenden"
            title="Bericht verzenden"
          >
            <Send size={15} strokeWidth={2} style={{ color: '#1A1917' }} />
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={loading || isUploading || isRecording}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Spraakbericht opnemen"
            title="Spraakbericht opnemen"
          >
            <Mic size={15} style={{ color: WHITE }} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <style jsx>{`
        .chat-pill-textarea::placeholder {
          color: ${PLACEHOLDER};
        }
      `}</style>
    </div>
  )
}
