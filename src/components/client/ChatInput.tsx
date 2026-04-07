'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Send, Paperclip, X, Camera, Image as ImageIcon, Film, Mic, Square } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface ChatInputProps {
  onSend: (content: string, messageType?: string, fileUrl?: string) => void
  loading?: boolean
}

export function ChatInput({ onSend, loading = false }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [showSendButton, setShowSendButton] = useState(false)
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setShowSendButton(content.trim().length > 0 || filePreview !== null)
  }, [content, filePreview])

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const handleSend = () => {
    if (isUploading) return

    if (filePreview) {
      const messageType = filePreview.type.startsWith('image/') ? 'image'
        : filePreview.type.startsWith('video/') ? 'video'
        : filePreview.type.startsWith('audio/') ? 'voice'
        : 'file'
      onSend(content || filePreview.name, messageType, filePreview.url)
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

    try {
      // Create local preview for images
      let localPreview: string | undefined
      if (file.type.startsWith('image/')) {
        localPreview = URL.createObjectURL(file)
      }

      // Compress images
      const processedFile = await compressImage(file)
      setUploadProgress(30)

      // Upload via server-side API route (bypasses storage RLS)
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

  // Voice recording
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
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
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
    <div className="bg-white border-t border-[#E8E4DC]">
      {/* Upload progress */}
      {isUploading && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 bg-[#E8E4DC] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-pop)] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-[#A09D96]">Uploaden...</span>
          </div>
        </div>
      )}

      {/* File preview */}
      {filePreview && (
        <div className="px-4 pt-3">
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
              <div className="h-20 w-32 rounded-xl bg-[#F0EDE8] flex items-center justify-center">
                <Film size={24} className="text-[#A09D96]" />
                <span className="text-[11px] text-[#A09D96] ml-1">Video</span>
              </div>
            ) : filePreview.type.startsWith('audio/') ? (
              <div className="h-12 px-4 rounded-xl bg-[#F0EDE8] flex items-center gap-2">
                <Mic size={16} className="text-[var(--color-pop)]" />
                <span className="text-[13px] text-[#6B6862]">Spraakbericht</span>
              </div>
            ) : (
              <div className="h-12 px-4 rounded-xl bg-[#F0EDE8] flex items-center gap-2">
                <Paperclip size={16} className="text-[#A09D96]" />
                <span className="text-[13px] text-[#6B6862] truncate max-w-[200px]">{filePreview.name}</span>
              </div>
            )}
            <button
              onClick={() => {
                if (filePreview.localPreview) URL.revokeObjectURL(filePreview.localPreview)
                setFilePreview(null)
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-[#1A1917] rounded-full flex items-center justify-center"
            >
              <X size={12} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3 py-2 px-4 bg-red-50 rounded-xl">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[13px] text-red-600 font-medium">
              Opnemen {formatRecordingTime(recordingTime)}
            </span>
            <button
              onClick={stopRecording}
              className="ml-auto w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
            >
              <Square size={12} className="text-white" fill="white" />
            </button>
          </div>
        </div>
      )}

      {/* Media menu */}
      {showMediaMenu && !isRecording && (
        <div className="px-4 pt-3 flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F2EC] hover:bg-[#E8E4DC] transition-colors"
          >
            <ImageIcon size={16} className="text-[var(--color-pop)]" />
            <span className="text-[13px] font-medium text-[#1A1917]">Foto</span>
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F2EC] hover:bg-[#E8E4DC] transition-colors"
          >
            <Camera size={16} className="text-[var(--color-pop)]" />
            <span className="text-[13px] font-medium text-[#1A1917]">Camera</span>
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F2EC] hover:bg-[#E8E4DC] transition-colors"
          >
            <Film size={16} className="text-[var(--color-pop)]" />
            <span className="text-[13px] font-medium text-[#1A1917]">Video</span>
          </button>
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F2EC] hover:bg-[#E8E4DC] transition-colors"
          >
            <Mic size={16} className="text-[var(--color-pop)]" />
            <span className="text-[13px] font-medium text-[#1A1917]">Audio</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*" />
      <input ref={cameraInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />
      <input ref={videoInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="video/*" capture="environment" />

      {/* Input row */}
      <div className="px-4 py-3 flex items-end gap-2">
        {!isRecording && (
          <button
            onClick={() => setShowMediaMenu(!showMediaMenu)}
            disabled={loading || isUploading}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              showMediaMenu ? 'bg-[var(--color-pop)] text-white' : 'text-[#A09D96] hover:bg-[#F0EDE8]'
            }`}
          >
            {showMediaMenu ? <X size={18} strokeWidth={1.5} /> : <Paperclip size={18} strokeWidth={1.5} />}
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Opname bezig...' : 'Typ een bericht...'}
          disabled={loading || isUploading || isRecording}
          className="flex-1 bg-[#F5F2EC] rounded-2xl px-4 py-2.5 text-[15px] text-[#1A1917] placeholder:text-[#CCC7BC] resize-none min-h-[40px] max-h-[120px] focus:outline-none disabled:opacity-50"
          rows={1}
        />

        {(showSendButton || filePreview) && !isRecording && (
          <button
            onClick={handleSend}
            disabled={loading || isUploading}
            className="w-10 h-10 rounded-full bg-[var(--color-pop)] text-white flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-all disabled:opacity-50 active:scale-95"
          >
            <Send size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
