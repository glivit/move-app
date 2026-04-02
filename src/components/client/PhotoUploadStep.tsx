'use client'

import React, { useRef, useState } from 'react'
import { Camera, X, Check } from 'lucide-react'

interface Props {
  photos: { front: File | null; back: File | null; left: File | null; right: File | null }
  onChange: (photos: Props['photos']) => void
}

type Position = 'front' | 'back' | 'left' | 'right'

const positions: Array<{ key: Position; label: string }> = [
  { key: 'front', label: 'Voorkant' },
  { key: 'back', label: 'Achterkant' },
  { key: 'left', label: 'Linkerkant' },
  { key: 'right', label: 'Rechterkant' },
]

// ─── Silhouette SVGs per position ────────────────────────────

function SilhouetteFront({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 340" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="100" cy="42" rx="22" ry="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Neck */}
      <line x1="92" y1="70" x2="92" y2="82" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="108" y1="70" x2="108" y2="82" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Shoulders */}
      <path d="M92 82 C80 82 52 88 45 100" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M108 82 C120 82 148 88 155 100" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Arms */}
      <path d="M45 100 L38 155 L42 200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M155 100 L162 155 L158 200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Torso */}
      <path d="M55 100 L60 145 L65 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M145 100 L140 145 L135 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Waist/Hips */}
      <path d="M65 180 C70 195 75 200 78 205" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M135 180 C130 195 125 200 122 205" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Legs */}
      <path d="M78 205 L75 260 L72 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M122 205 L125 260 L128 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Inner legs */}
      <path d="M95 205 L93 260 L90 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M105 205 L107 260 L110 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
    </svg>
  )
}

function SilhouetteSide({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 200 340" className={className} style={flip ? { transform: 'scaleX(-1)' } : {}} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="105" cy="42" rx="18" ry="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Neck */}
      <line x1="100" y1="70" x2="95" y2="85" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Back line */}
      <path d="M95 85 C88 95 80 120 78 145 L80 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Front line (chest/belly) */}
      <path d="M110 85 C118 95 125 115 122 145 L118 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Butt */}
      <path d="M80 180 C75 195 73 200 78 210" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Front hip */}
      <path d="M118 180 C120 195 118 200 112 210" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Back leg */}
      <path d="M78 210 L80 260 L82 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Front leg */}
      <path d="M112 210 L108 260 L106 320" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* Arm */}
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

// ─── Component ────────────────────────────────────

export function PhotoUploadStep({ photos, onChange }: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [cameraActive, setCameraActive] = useState<Position | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFileChange = (position: Position, file: File | null) => {
    onChange({ ...photos, [position]: file })
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviews(prev => ({ ...prev, [position]: url }))
    } else {
      setPreviews(prev => {
        const next = { ...prev }
        delete next[position]
        return next
      })
    }
    setCameraActive(null)
  }

  const completedCount = Object.values(photos).filter(Boolean).length

  return (
    <div className="space-y-6">
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
              <input
                ref={el => { inputRefs.current[key] = el }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
              />

              {hasPhoto ? (
                /* ── Photo taken ── */
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1A1917]">
                  <img src={previews[key]} alt={label} className="w-full h-full object-cover" />
                  {/* Remove button */}
                  <button
                    onClick={() => handleFileChange(key, null)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                  {/* Label + check */}
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
                /* ── Empty state with silhouette guide ── */
                <button
                  onClick={() => {
                    setCameraActive(key)
                    inputRefs.current[key]?.click()
                  }}
                  className="aspect-[3/4] w-full rounded-2xl border-2 border-dashed border-[#DDD9D0] hover:border-[var(--color-pop)]/40 flex flex-col items-center justify-center transition-all bg-[#F5F2EC] relative overflow-hidden group"
                >
                  {/* Silhouette guide */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-15 group-hover:opacity-25 transition-opacity">
                    <Silhouette className="h-[85%] text-[#1A1917]" />
                  </div>

                  {/* Camera icon + label */}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                      <Camera className="h-5 w-5 text-[#6B6862]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-bold text-[#6B6862] uppercase tracking-[0.06em]">{label}</span>
                  </div>

                  {/* Guide text */}
                  <p className="relative z-10 text-[9px] text-[#A09D96] mt-2 px-4 text-center">
                    Lijn je lichaam uit met het silhouet
                  </p>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Tip */}
      <div className="bg-[#F5F2EC] rounded-xl p-3.5">
        <p className="text-[12px] text-[#6B6862] leading-relaxed">
          <span className="font-semibold">Tip:</span> Zet je telefoon op ooghoogte met een timer. Gebruik dezelfde plek en belichting voor de beste vergelijking.
        </p>
      </div>
    </div>
  )
}
