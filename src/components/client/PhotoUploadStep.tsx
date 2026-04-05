'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Camera, X, Check, SwitchCamera } from 'lucide-react'

interface Props {
  photos: { front: File | null; back: File | null; left: File | null; right: File | null }
  onChange: (photos: Props['photos']) => void
  showSilhouette?: boolean
}

type Position = 'front' | 'back' | 'left' | 'right'

const positions: Array<{ key: Position; label: string; instruction: string }> = [
  { key: 'front', label: 'Voorkant', instruction: 'Sta recht met armen langs je lichaam' },
  { key: 'back', label: 'Achterkant', instruction: 'Draai je om, armen langs je lichaam' },
  { key: 'left', label: 'Linkerkant', instruction: 'Draai 90° naar links' },
  { key: 'right', label: 'Rechterkant', instruction: 'Draai 90° naar rechts' },
]

// ─── Silhouette SVGs per position ────────────────────────────

function SilhouetteFront({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 340" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="42" rx="22" ry="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="92" y1="70" x2="92" y2="82" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="108" y1="70" x2="108" y2="82" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M92 82 C80 82 52 88 45 100" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M108 82 C120 82 148 88 155 100" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M45 100 L38 155 L42 200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M155 100 L162 155 L158 200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M55 100 L60 145 L65 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M145 100 L140 145 L135 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M65 180 C70 195 75 200 78 205" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M135 180 C130 195 125 200 122 205" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M78 205 L75 260 L72 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M122 205 L125 260 L128 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M95 205 L93 260 L90 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M105 205 L107 260 L110 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
    </svg>
  )
}

function SilhouetteSide({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 200 340" className={className} style={flip ? { transform: 'scaleX(-1)' } : {}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="105" cy="42" rx="18" ry="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="100" y1="70" x2="95" y2="85" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M95 85 C88 95 80 120 78 145 L80 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M110 85 C118 95 125 115 122 145 L118 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M80 180 C75 195 73 200 78 210" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M118 180 C120 195 118 200 112 210" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M78 210 L80 260 L82 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M112 210 L108 260 L106 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M105 90 C115 100 120 120 115 155 L110 195" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
    </svg>
  )
}

function SilhouetteBack({ className }: { className?: string }) {
  return <SilhouetteFront className={className} />
}

const silhouetteMap: Record<Position, (props: { className?: string }) => React.ReactElement> = {
  front: SilhouetteFront,
  back: SilhouetteBack,
  left: (props) => <SilhouetteSide {...props} />,
  right: (props) => <SilhouetteSide {...props} flip />,
}

// ─── Custom Camera Viewfinder ─────────────────────────────

function CameraViewfinder({
  position,
  onCapture,
  onClose,
}: {
  position: Position
  onCapture: (file: File) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  const posInfo = positions.find((p) => p.key === position)!
  const Silhouette = silhouetteMap[position]

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    // Stop previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    setReady(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      }
    } catch {
      setError('Camera niet beschikbaar. Gebruik de bestandskiezer.')
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const flipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera(next)
  }, [facingMode, startCamera])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `progress_${position}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
      }
    }, 'image/jpeg', 0.92)
  }, [facingMode, position, onCapture])

  const startCountdown = useCallback(() => {
    setCountdown(3)
    let count = 3
    const interval = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(interval)
        setCountdown(null)
        capturePhoto()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }, [capturePhoto])

  // Fallback file input
  const fileRef = useRef<HTMLInputElement>(null)

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onCapture(file)
          }}
        />
        <p className="text-white text-center mb-6">{error}</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-6 py-3 bg-white text-black rounded-2xl font-medium"
        >
          Kies foto uit galerij
        </button>
        <button onClick={onClose} className="mt-4 text-white/60 text-sm">
          Annuleer
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera feed */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
        />

        {/* Silhouette overlay — removed per user feedback */}

        {/* Countdown */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[120px] font-bold text-white/80" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
              {countdown}
            </span>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 pt-12 flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <X className="h-5 w-5 text-white" strokeWidth={2} />
          </button>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-white">{posInfo.label}</p>
            <p className="text-[11px] text-white/60 mt-0.5">{posInfo.instruction}</p>
          </div>
          <button onClick={flipCamera} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <SwitchCamera className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* Guide text */}
        {ready && countdown === null && (
          <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            <p className="text-[12px] text-white/50">Sta recht, armen langs je lichaam</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black p-6 pb-10 flex items-center justify-center gap-8">
        {/* Timer button */}
        <button
          onClick={startCountdown}
          disabled={!ready || countdown !== null}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 disabled:opacity-30"
        >
          <span className="text-[14px] font-semibold">3s</span>
        </button>

        {/* Capture button */}
        <button
          onClick={capturePhoto}
          disabled={!ready || countdown !== null}
          className="w-[72px] h-[72px] rounded-full border-[3px] border-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
        >
          <div className="w-[58px] h-[58px] rounded-full bg-white" />
        </button>

        {/* Spacer for layout balance */}
        <div className="w-12" />
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────

export function PhotoUploadStep({ photos, onChange, showSilhouette = true }: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [cameraActive, setCameraActive] = useState<Position | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleCapture = useCallback((position: Position, file: File) => {
    onChange({ ...photos, [position]: file })
    const url = URL.createObjectURL(file)
    setPreviews((prev) => ({ ...prev, [position]: url }))
    setCameraActive(null)
  }, [photos, onChange])

  const handleRemove = useCallback((position: Position) => {
    onChange({ ...photos, [position]: null })
    setPreviews((prev) => {
      const next = { ...prev }
      if (next[position]) {
        URL.revokeObjectURL(next[position])
        delete next[position]
      }
      return next
    })
  }, [photos, onChange])

  // Fallback for file input (desktop / older devices)
  const handleFileChange = useCallback((position: Position, file: File | null) => {
    if (file) {
      handleCapture(position, file)
    }
  }, [handleCapture])

  const completedCount = Object.values(photos).filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Camera viewfinder (fullscreen overlay) */}
      {cameraActive && (
        <CameraViewfinder
          position={cameraActive}
          onCapture={(file) => handleCapture(cameraActive, file)}
          onClose={() => setCameraActive(null)}
        />
      )}

      <div>
        <h3 className="font-semibold text-[20px] text-[#1A1917]">Foto&apos;s</h3>
        <p className="text-[13px] text-[#A09D96] mt-1">
          Nuchter, zelfde ondergoed, zelfde locatie, ochtendlicht
        </p>
        {completedCount > 0 && (
          <p className="text-[12px] font-semibold text-[var(--color-pop)] mt-1">
            {completedCount}/4 foto&apos;s genomen
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {positions.map(({ key, label }) => {
          const Silhouette = silhouetteMap[key]
          const hasPhoto = !!previews[key]

          return (
            <div key={key} className="relative">
              {/* Hidden file input as fallback */}
              <input
                ref={(el) => { inputRefs.current[key] = el }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
              />

              {hasPhoto ? (
                /* ── Photo taken ── */
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1A1917]">
                  <Image src={previews[key]} alt={label} width={400} height={500} className="w-full h-full object-cover" unoptimized loading="lazy" />
                  <button
                    onClick={() => handleRemove(key)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-6 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white uppercase tracking-[0.06em]">
                      {label}
                    </span>
                    <div className="w-5 h-5 rounded-full bg-[#3D8B5C] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Empty state — tap opens custom camera ── */
                <button
                  onClick={() => setCameraActive(key)}
                  className="aspect-[3/4] w-full rounded-2xl border-2 border-dashed border-[#DDD9D0] hover:border-[var(--color-pop)]/40 flex flex-col items-center justify-center transition-all bg-[#F5F2EC] relative overflow-hidden group"
                >
                  {showSilhouette && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-15 group-hover:opacity-25 transition-opacity">
                      <Silhouette className="h-[85%] text-[#1A1917]" />
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                      <Camera className="h-5 w-5 text-[#6B6862]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-bold text-[#6B6862] uppercase tracking-[0.06em]">{label}</span>
                  </div>
                  <p className="relative z-10 text-[9px] text-[#A09D96] mt-2 px-4 text-center">
                    Tik om camera te openen
                  </p>
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-[#F5F2EC] rounded-xl p-3.5">
        <p className="text-[12px] text-[#6B6862] leading-relaxed">
          <span className="font-semibold">Tip:</span> Zet je telefoon op ooghoogte met de timer (3s). Gebruik dezelfde plek en belichting voor de beste vergelijking.
        </p>
      </div>
    </div>
  )
}
