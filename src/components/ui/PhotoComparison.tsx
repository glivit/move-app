'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'

interface PhotoSet {
  front: string | null
  back: string | null
  left: string | null
  right: string | null
}

interface Props {
  currentPhotos: PhotoSet
  previousPhotos?: PhotoSet
}

const positions = [
  { key: 'front' as const, label: 'Voor' },
  { key: 'back' as const, label: 'Achter' },
  { key: 'left' as const, label: 'Links' },
  { key: 'right' as const, label: 'Rechts' },
]

export function PhotoComparison({ currentPhotos, previousPhotos }: Props) {
  const [activePosition, setActivePosition] = useState<keyof PhotoSet>('front')
  const [sliderPercent, setSliderPercent] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentUrl = currentPhotos[activePosition]
  const previousUrl = previousPhotos?.[activePosition]
  const hasBothPhotos = !!currentUrl && !!previousUrl

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPercent(pct)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true)
    updateSlider(e.clientX)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [updateSlider])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    updateSlider(e.clientX)
  }, [isDragging, updateSlider])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div className="space-y-4">
      {/* Position tabs */}
      <div className="flex gap-2">
        {positions.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePosition(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePosition === key
                ? 'bg-[#1A1917]/10 text-[#1A1917]'
                : 'text-[#8E8E93] hover:text-[#1A1A18] hover:bg-[#F5F5F3]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Photo display */}
      {hasBothPhotos ? (
        /* Interactive slider comparison */
        <div
          ref={containerRef}
          className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-col-resize select-none touch-none bg-[#F5F5F3]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* "Before" layer (full) */}
          <Image
            src={previousUrl}
            alt="Vorige"
            width={400}
            height={400}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
            unoptimized
            loading="lazy"
          />

          {/* "After" layer (clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPercent}%)` }}
          >
            <Image
              src={currentUrl}
              alt="Huidig"
              width={400}
              height={400}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              unoptimized
              loading="lazy"
            />
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 z-10"
            style={{ left: `${sliderPercent}%` }}
          >
            <div className="absolute inset-y-0 -translate-x-1/2 w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.3)]" />
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.2)] flex items-center justify-center">
              <div className="flex items-center gap-0.5">
                <svg width="6" height="12" viewBox="0 0 6 12" fill="none">
                  <path d="M5 1L1 6L5 11" stroke="#1A1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg width="6" height="12" viewBox="0 0 6 12" fill="none">
                  <path d="M1 1L5 6L1 11" stroke="#1A1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Vorige
          </div>
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Huidig
          </div>
        </div>
      ) : (
        /* Single photo or no comparison available */
        <div className="grid grid-cols-2 gap-4">
          {previousUrl && !currentUrl && (
            <div className="col-span-2">
              <div className="max-w-sm mx-auto space-y-2">
                <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-wider">Vorige</p>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#F5F5F3]">
                  <Image src={previousUrl} alt="Vorige" width={400} height={500} className="w-full h-full object-cover" unoptimized loading="lazy" />
                </div>
              </div>
            </div>
          )}
          {currentUrl && !previousUrl && (
            <div className="col-span-2">
              <div className="max-w-sm mx-auto space-y-2">
                <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-wider">Huidig</p>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#F5F5F3]">
                  <Image src={currentUrl} alt="Huidig" width={400} height={500} className="w-full h-full object-cover" unoptimized loading="lazy" />
                </div>
              </div>
            </div>
          )}
          {!currentUrl && !previousUrl && (
            <div className="col-span-2 text-center py-12 text-[#8E8E93]">Geen foto&apos;s beschikbaar</div>
          )}
        </div>
      )}

      {hasBothPhotos && (
        <p className="text-center text-[12px] text-[#8E8E93]">
          Sleep de slider om te vergelijken
        </p>
      )}
    </div>
  )
}
