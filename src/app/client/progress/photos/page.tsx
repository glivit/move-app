'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Camera, Download, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PhotoDate {
  id: string
  date: string
  label: string
  weight_kg?: number | null
  body_fat_pct?: number | null
  photo_front_url: string | null
  photo_back_url: string | null
  photo_left_url: string | null
  photo_right_url: string | null
}

type ViewAngle = 'front' | 'back' | 'left' | 'right'

const ANGLE_LABELS: Record<ViewAngle, string> = {
  front: 'Voorkant',
  back: 'Achterkant',
  left: 'Links',
  right: 'Rechts',
}

function getPhotoUrl(item: PhotoDate, angle: ViewAngle): string | null {
  switch (angle) {
    case 'front': return item.photo_front_url
    case 'back': return item.photo_back_url
    case 'left': return item.photo_left_url
    case 'right': return item.photo_right_url
  }
}

export default function PhotoComparisonPage() {
  const router = useRouter()
  const [photoDates, setPhotoDates] = useState<PhotoDate[]>([])
  const [loading, setLoading] = useState(true)
  const [angle, setAngle] = useState<ViewAngle>('front')
  const [beforeIdx, setBeforeIdx] = useState(0)
  const [afterIdx, setAfterIdx] = useState(0)
  const [sliderPercent, setSliderPercent] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [selecting, setSelecting] = useState<'before' | 'after' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/progress-photos')
        if (res.ok) {
          const data = await res.json()
          const items = data.data || []
          setPhotoDates(items)
          if (items.length >= 2) {
            setBeforeIdx(0)
            setAfterIdx(items.length - 1)
          }
        }
      } catch (e) {
        console.error('Error loading photos:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100))
    setSliderPercent(pct)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true)
    updateSlider(e.clientX)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [updateSlider])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    updateSlider(e.clientX)
  }, [isDragging, updateSlider])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Export comparison as image
  async function exportComparison() {
    const before = photoDates[beforeIdx]
    const after = photoDates[afterIdx]
    const beforeUrl = getPhotoUrl(before, angle)
    const afterUrl = getPhotoUrl(after, angle)
    if (!beforeUrl || !afterUrl) return

    try {
      const [img1, img2] = await Promise.all([
        loadImage(beforeUrl),
        loadImage(afterUrl),
      ])

      const canvas = canvasRef.current || document.createElement('canvas')
      const gap = 4
      const labelHeight = 60
      canvas.width = img1.width + img2.width + gap
      canvas.height = Math.max(img1.height, img2.height) + labelHeight
      const ctx = canvas.getContext('2d')!

      // Background
      ctx.fillStyle = '#1A1917'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Images
      ctx.drawImage(img1, 0, 0)
      ctx.drawImage(img2, img1.width + gap, 0)

      // Labels
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`Before — ${formatDate(before.date)}`, img1.width / 2, Math.max(img1.height, img2.height) + 40)
      ctx.fillText(`After — ${formatDate(after.date)}`, img1.width + gap + img2.width / 2, Math.max(img1.height, img2.height) + 40)

      // Download
      const link = document.createElement('a')
      link.download = `move-progress-${before.date}-vs-${after.date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  function formatDate(d: string): string {
    if (d === 'Intake') return 'Intake'
    return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#EEEBE3]">
        <div className="animate-pulse space-y-3 text-center">
          <Camera size={48} className="text-[#C5C2BC] mx-auto" />
          <p className="text-[#A09D96] text-[14px]">Foto's laden...</p>
        </div>
      </div>
    )
  }

  if (photoDates.length < 2) {
    return (
      <div className="min-h-[80vh] bg-[#EEEBE3] px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#A09D96] mb-6">
          <ArrowLeft size={18} /> Terug
        </button>
        <div className="text-center py-16">
          <Camera size={48} className="text-[#C5C2BC] mx-auto mb-3" />
          <p className="font-semibold text-[#1A1917] text-lg">Niet genoeg foto's</p>
          <p className="text-[14px] text-[#A09D96] mt-2">
            Je hebt minimaal 2 check-ins met foto's nodig om te vergelijken.
          </p>
        </div>
      </div>
    )
  }

  const before = photoDates[beforeIdx]
  const after = photoDates[afterIdx]
  const beforeUrl = getPhotoUrl(before, angle)
  const afterUrl = getPhotoUrl(after, angle)
  const hasBoth = !!beforeUrl && !!afterUrl

  // Available angles for the current pair
  const availableAngles = (['front', 'back', 'left', 'right'] as ViewAngle[]).filter(
    a => getPhotoUrl(before, a) && getPhotoUrl(after, a)
  )

  const daysDiff = Math.round(
    (new Date(after.date === 'Intake' ? after.date : after.date).getTime() - new Date(before.date === 'Intake' ? before.date : before.date).getTime()) / 86400000
  )

  return (
    <div className="min-h-[80vh] bg-[#1A1917] -mx-4 -mt-4">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1917]">
        <button onClick={() => router.back()} className="text-white/70 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-semibold text-[16px]">Foto vergelijking</h1>
        <div className="flex gap-2">
          <button onClick={exportComparison} className="text-white/70 hover:text-white" title="Exporteer">
            <Download size={20} />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="text-white/70 hover:text-white" title="Fullscreen">
            <Maximize2 size={20} />
          </button>
        </div>
      </div>

      {/* Angle selector */}
      <div className="flex justify-center gap-2 px-4 py-2">
        {availableAngles.map(a => (
          <button
            key={a}
            onClick={() => setAngle(a)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.04em] transition-colors ${
              angle === a
                ? 'bg-white text-[#1A1917]'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {ANGLE_LABELS[a]}
          </button>
        ))}
      </div>

      {/* Comparison area */}
      {hasBoth ? (
        <div
          ref={containerRef}
          className="relative aspect-[3/4] max-h-[60vh] mx-4 mt-2 rounded-2xl overflow-hidden cursor-col-resize select-none touch-none bg-[#2A2825]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Before (full) */}
          <img
            src={beforeUrl!}
            alt="Before"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />

          {/* After (clipped from right) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPercent}%)` }}
          >
            <img
              src={afterUrl!}
              alt="After"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          </div>

          {/* Slider handle */}
          <div className="absolute top-0 bottom-0 z-10" style={{ left: `${sliderPercent}%` }}>
            <div className="absolute inset-y-0 -translate-x-1/2 w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
              <div className="flex items-center gap-0.5">
                <ChevronLeft size={12} strokeWidth={2.5} className="text-[#1A1917]" />
                <ChevronRight size={12} strokeWidth={2.5} className="text-[#1A1917]" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            Before
          </div>
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            After
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-2 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
          <div className="relative aspect-[3/4] bg-[#2A2825]">
            {beforeUrl ? (
              <img src={beforeUrl} alt="Before" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full"><Camera size={24} className="text-[#6B6862]" /></div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-2 pt-6">
              <p className="text-[10px] text-white/70 uppercase font-bold">Before</p>
              <p className="text-[12px] text-white font-semibold">{formatDate(before.date)}</p>
            </div>
          </div>
          <div className="relative aspect-[3/4] bg-[#2A2825]">
            {afterUrl ? (
              <img src={afterUrl} alt="After" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full"><Camera size={24} className="text-[#6B6862]" /></div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-2 pt-6">
              <p className="text-[10px] text-white/70 uppercase font-bold">After</p>
              <p className="text-[12px] text-white font-semibold">{formatDate(after.date)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex justify-center gap-6 px-4 py-3">
        <div className="text-center">
          <p className="text-white/50 text-[10px] uppercase font-bold tracking-wide">Periode</p>
          <p className="text-white text-[14px] font-semibold">{isNaN(daysDiff) ? '—' : `${daysDiff} dagen`}</p>
        </div>
        {before.weight_kg && after.weight_kg && (
          <div className="text-center">
            <p className="text-white/50 text-[10px] uppercase font-bold tracking-wide">Gewicht</p>
            <p className="text-white text-[14px] font-semibold">
              {before.weight_kg}kg → {after.weight_kg}kg
              <span className={`ml-1 text-[12px] ${after.weight_kg < before.weight_kg ? 'text-[#34C759]' : 'text-[#FF6B6B]'}`}>
                ({after.weight_kg > before.weight_kg ? '+' : ''}{(after.weight_kg - before.weight_kg).toFixed(1)})
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-4 pb-6">
        <div className="bg-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/50 text-[11px] uppercase font-bold tracking-wide">Tijdlijn</p>
            <p className="text-white/30 text-[11px]">
              {formatDate(before.date)} vs {formatDate(after.date)}
            </p>
          </div>

          {/* Timeline dots */}
          <div className="relative h-12">
            <div className="absolute top-1/2 left-2 right-2 h-[2px] bg-white/10 -translate-y-1/2" />

            <div className="flex items-center justify-between h-full px-2">
              {photoDates.map((pd, idx) => {
                const isBefore = idx === beforeIdx
                const isAfter = idx === afterIdx
                const isBetween = idx > beforeIdx && idx < afterIdx

                return (
                  <button
                    key={pd.id}
                    onClick={() => {
                      if (selecting === 'before') {
                        if (idx < afterIdx) setBeforeIdx(idx)
                        setSelecting(null)
                      } else if (selecting === 'after') {
                        if (idx > beforeIdx) setAfterIdx(idx)
                        setSelecting(null)
                      } else {
                        // Quick select: if tapped, use closest role
                        if (idx < beforeIdx + (afterIdx - beforeIdx) / 2) {
                          if (idx < afterIdx) setBeforeIdx(idx)
                        } else {
                          if (idx > beforeIdx) setAfterIdx(idx)
                        }
                      }
                    }}
                    className="relative z-10 group flex flex-col items-center"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                      isBefore ? 'bg-white border-white scale-125' :
                      isAfter ? 'bg-[var(--color-pop,#FF6B35)] border-[var(--color-pop,#FF6B35)] scale-125' :
                      isBetween ? 'bg-white/30 border-white/30' :
                      'bg-white/10 border-white/10 hover:bg-white/30'
                    }`} />
                    {(isBefore || isAfter) && (
                      <span className={`absolute -bottom-5 text-[9px] font-bold whitespace-nowrap ${
                        isBefore ? 'text-white' : 'text-[var(--color-pop,#FF6B35)]'
                      }`}>
                        {pd.label || formatDate(pd.date)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selection buttons */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setSelecting(selecting === 'before' ? null : 'before')}
              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
                selecting === 'before' ? 'bg-white text-[#1A1917]' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Before: {formatDate(before.date)}
            </button>
            <button
              onClick={() => setSelecting(selecting === 'after' ? null : 'after')}
              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
                selecting === 'after' ? 'bg-[var(--color-pop,#FF6B35)] text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              After: {formatDate(after.date)}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Fullscreen overlay */}
      {fullscreen && hasBoth && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <X size={20} className="text-white" />
          </button>
          <div className="w-full h-full grid grid-cols-2 gap-[2px]">
            <img src={beforeUrl!} alt="Before" className="w-full h-full object-contain" />
            <img src={afterUrl!} alt="After" className="w-full h-full object-contain" />
          </div>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8">
            <p className="text-white text-[14px] font-semibold">Before — {formatDate(before.date)}</p>
            <p className="text-white text-[14px] font-semibold">After — {formatDate(after.date)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
