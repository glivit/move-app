'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import NextImage from 'next/image'
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

      // Background — v6 canvas
      ctx.fillStyle = '#474B48'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Images
      ctx.drawImage(img1, 0, 0)
      ctx.drawImage(img2, img1.width + gap, 0)

      // Labels
      ctx.fillStyle = '#FDFDFE'
      ctx.font = '500 24px Outfit, system-ui'
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
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <Camera size={40} style={{ color: 'rgba(253,253,254,0.44)' }} />
        <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.62)' }}>Foto&rsquo;s laden&hellip;</p>
      </div>
    )
  }

  if (photoDates.length < 2) {
    return (
      <div className="pb-28">
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'rgba(253,253,254,0.62)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            marginBottom: 18,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ArrowLeft size={16} /> Terug
        </button>
        <div
          className="v6-card"
          style={{ padding: '40px 22px', textAlign: 'center' }}
        >
          <Camera size={44} style={{ color: 'rgba(253,253,254,0.44)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 18, fontWeight: 300, color: '#FDFDFE', letterSpacing: '-0.012em', margin: 0 }}>
            Niet genoeg foto&rsquo;s
          </p>
          <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.62)', marginTop: 8, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
            Je hebt minimaal 2 check-ins met foto&rsquo;s nodig om te vergelijken.
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

  const availableAngles = (['front', 'back', 'left', 'right'] as ViewAngle[]).filter(
    a => getPhotoUrl(before, a) && getPhotoUrl(after, a),
  )

  const daysDiff = Math.round(
    (new Date(after.date).getTime() - new Date(before.date).getTime()) / 86400000,
  )

  return (
    <div className="pb-28">
      {/* Back + action row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Terug"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'rgba(253,253,254,0.62)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ArrowLeft size={16} /> Terug
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportComparison}
            aria-label="Exporteer"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(253,253,254,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Download size={16} style={{ color: '#FDFDFE' }} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            aria-label="Volledig scherm"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(253,253,254,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Maximize2 size={16} style={{ color: '#FDFDFE' }} />
          </button>
        </div>
      </div>

      {/* Vergelijking — dark card */}
      <div className="v6-card-dark mb-4" style={{ padding: 14 }}>
        {/* Angle selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {availableAngles.map(a => {
            const active = angle === a
            return (
              <button
                key={a}
                onClick={() => setAngle(a)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: active ? '#FDFDFE' : 'rgba(253,253,254,0.08)',
                  color: active ? '#FDFDFE' : 'rgba(253,253,254,0.62)',
                  border: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {ANGLE_LABELS[a]}
              </button>
            )
          })}
        </div>

        {/* Comparison area */}
        {hasBoth ? (
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              aspectRatio: '3 / 4',
              maxHeight: '58vh',
              borderRadius: 18,
              overflow: 'hidden',
              cursor: 'col-resize',
              userSelect: 'none',
              touchAction: 'none',
              background: '#474B48',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <NextImage
              src={beforeUrl!}
              alt="Before"
              width={400}
              height={500}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              draggable={false}
              unoptimized
              loading="lazy"
            />

            <div
              style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 0 0 ${sliderPercent}%)` }}
            >
              <NextImage
                src={afterUrl!}
                alt="After"
                width={400}
                height={500}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                unoptimized
                loading="lazy"
                draggable={false}
              />
            </div>

            {/* Slider handle */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sliderPercent}%`, zIndex: 10 }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0, bottom: 0,
                  transform: 'translateX(-50%)',
                  width: 2,
                  background: '#FDFDFE',
                  boxShadow: '0 0 12px rgba(0,0,0,0.5)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 42, height: 42,
                  borderRadius: '50%',
                  background: '#FDFDFE',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 1,
                }}
              >
                <ChevronLeft size={12} strokeWidth={2.5} style={{ color: '#FDFDFE' }} />
                <ChevronRight size={12} strokeWidth={2.5} style={{ color: '#FDFDFE' }} />
              </div>
            </div>

            {/* Labels */}
            <div
              style={{
                position: 'absolute', top: 10, left: 10,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                color: '#FDFDFE',
                fontSize: 10,
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: 999,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Before
            </div>
            <div
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                color: '#C0FC01',
                fontSize: 10,
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: 999,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              After
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', aspectRatio: '3 / 4', background: '#474B48' }}>
              {beforeUrl ? (
                <NextImage src={beforeUrl} alt="Before" width={400} height={500} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized loading="lazy" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Camera size={24} style={{ color: 'rgba(253,253,254,0.44)' }} />
                </div>
              )}
              <div
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                  padding: '24px 10px 10px',
                }}
              >
                <p style={{ fontSize: 10, color: 'rgba(253,253,254,0.62)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, margin: 0 }}>Before</p>
                <p style={{ fontSize: 12, color: '#FDFDFE', fontWeight: 500, margin: 0 }}>{formatDate(before.date)}</p>
              </div>
            </div>
            <div style={{ position: 'relative', aspectRatio: '3 / 4', background: '#474B48' }}>
              {afterUrl ? (
                <NextImage src={afterUrl} alt="After" width={400} height={500} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized loading="lazy" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Camera size={24} style={{ color: 'rgba(253,253,254,0.44)' }} />
                </div>
              )}
              <div
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                  padding: '24px 10px 10px',
                }}
              >
                <p style={{ fontSize: 10, color: '#C0FC01', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, margin: 0 }}>After</p>
                <p style={{ fontSize: 12, color: '#FDFDFE', fontWeight: 500, margin: 0 }}>{formatDate(after.date)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, padding: '14px 0 4px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: 'rgba(253,253,254,0.44)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.1em', margin: 0 }}>
              Periode
            </p>
            <p style={{ fontSize: 14, color: '#FDFDFE', fontWeight: 500, margin: 0, marginTop: 4 }}>
              {isNaN(daysDiff) ? '—' : `${daysDiff} dagen`}
            </p>
          </div>
          {before.weight_kg && after.weight_kg && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 9, color: 'rgba(253,253,254,0.44)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.1em', margin: 0 }}>
                Gewicht
              </p>
              <p style={{ fontSize: 14, color: '#FDFDFE', fontWeight: 500, margin: 0, marginTop: 4 }}>
                {before.weight_kg}kg → {after.weight_kg}kg
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 12,
                    color: after.weight_kg < before.weight_kg ? '#2FA65A' : 'rgba(253,253,254,0.62)',
                  }}
                >
                  ({after.weight_kg > before.weight_kg ? '+' : ''}{(after.weight_kg - before.weight_kg).toFixed(1)})
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline — eigen card */}
      <div className="v6-card-dark mb-4" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p className="text-label" style={{ color: 'rgba(253,253,254,0.62)' }}>
            Tijdlijn
          </p>
          <p style={{ fontSize: 11, color: 'rgba(253,253,254,0.38)', letterSpacing: '0.02em' }}>
            {formatDate(before.date)} · {formatDate(after.date)}
          </p>
        </div>

        <div style={{ position: 'relative', height: 44, marginBottom: 8 }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 8, right: 8,
              height: 2,
              background: 'rgba(253,253,254,0.10)',
              transform: 'translateY(-50%)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 8px' }}>
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
                      if (idx < beforeIdx + (afterIdx - beforeIdx) / 2) {
                        if (idx < afterIdx) setBeforeIdx(idx)
                      } else {
                        if (idx > beforeIdx) setAfterIdx(idx)
                      }
                    }
                  }}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  aria-label={`Selecteer ${formatDate(pd.date)}`}
                >
                  <div
                    style={{
                      width: 14, height: 14,
                      borderRadius: '50%',
                      background:
                        isBefore ? '#FDFDFE' :
                        isAfter ? '#C0FC01' :
                        isBetween ? 'rgba(253,253,254,0.30)' :
                        'rgba(253,253,254,0.10)',
                      transform: (isBefore || isAfter) ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 180ms',
                    }}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => setSelecting(selecting === 'before' ? null : 'before')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.02em',
              background: selecting === 'before' ? '#FDFDFE' : 'rgba(253,253,254,0.08)',
              color: selecting === 'before' ? '#FDFDFE' : '#FDFDFE',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Before · {formatDate(before.date)}
          </button>
          <button
            onClick={() => setSelecting(selecting === 'after' ? null : 'after')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.02em',
              background: selecting === 'after' ? '#C0FC01' : 'rgba(253,253,254,0.08)',
              color: selecting === 'after' ? '#FDFDFE' : '#FDFDFE',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            After · {formatDate(after.date)}
          </button>
        </div>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Fullscreen overlay */}
      {fullscreen && hasBoth && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: '#FDFDFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            aria-label="Sluiten"
            style={{
              position: 'absolute',
              top: 16, right: 16,
              zIndex: 1,
              width: 40, height: 40,
              borderRadius: '50%',
              background: 'rgba(253,253,254,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={18} style={{ color: '#FDFDFE' }} />
          </button>
          <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <NextImage src={beforeUrl!} alt="Before" width={800} height={1000} style={{ width: '100%', height: '100%', objectFit: 'contain' }} unoptimized loading="lazy" />
            <NextImage src={afterUrl!} alt="After" width={800} height={1000} style={{ width: '100%', height: '100%', objectFit: 'contain' }} unoptimized loading="lazy" />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 0, right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 32,
            }}
          >
            <p style={{ fontSize: 13, color: '#FDFDFE', fontWeight: 500, margin: 0 }}>
              Before — {formatDate(before.date)}
            </p>
            <p style={{ fontSize: 13, color: '#C0FC01', fontWeight: 500, margin: 0 }}>
              After — {formatDate(after.date)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
