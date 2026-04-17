'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react'

interface CheckinPhoto {
  id: string
  date: string
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

export function PhotoComparison() {
  const [checkins, setCheckins] = useState<CheckinPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [angle, setAngle] = useState<ViewAngle>('front')
  const [beforeIdx, setBeforeIdx] = useState(0)
  const [afterIdx, setAfterIdx] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('checkins')
          .select('id, date, photo_front_url, photo_back_url, photo_left_url, photo_right_url')
          .eq('client_id', user.id)
          .or('photo_front_url.neq.,photo_back_url.neq.,photo_left_url.neq.,photo_right_url.neq.')
          .order('date', { ascending: true })

        if (data && data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const withPhotos = (data as any[]).filter((c) =>
            c.photo_front_url || c.photo_back_url || c.photo_left_url || c.photo_right_url,
          )
          setCheckins(withPhotos)
          setBeforeIdx(0)
          setAfterIdx(Math.max(0, withPhotos.length - 1))
        }
      } catch (e) {
        console.error('Photo load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || checkins.length < 2) return null

  const before = checkins[beforeIdx]
  const after = checkins[afterIdx]

  const getUrl = (checkin: CheckinPhoto, a: ViewAngle) => {
    if (a === 'front') return checkin.photo_front_url
    if (a === 'back') return checkin.photo_back_url
    if (a === 'left') return checkin.photo_left_url
    return checkin.photo_right_url
  }

  const beforeUrl = getUrl(before, angle)
  const afterUrl = getUrl(after, angle)

  const availableAngles = (['front', 'back', 'left', 'right'] as ViewAngle[]).filter(a =>
    getUrl(before, a) && getUrl(after, a),
  )

  if (availableAngles.length === 0) return null
  if (!availableAngles.includes(angle)) return null

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(253,253,254,0.04)',
      }}
    >
      {/* Angle picker */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 6,
          padding: '12px 14px 10px',
        }}
      >
        {availableAngles.map(a => {
          const active = angle === a
          return (
            <button
              key={a}
              onClick={() => setAngle(a)}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: active ? '#FDFDFE' : 'rgba(253,253,254,0.08)',
                color: active ? '#1A1917' : 'rgba(253,253,254,0.62)',
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

      {/* Photos side by side */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
          background: 'rgba(253,253,254,0.10)',
        }}
      >
        {/* Before */}
        <div style={{ background: '#2A2E2B', position: 'relative' }}>
          {beforeUrl ? (
            <Image
              src={beforeUrl}
              alt="Before"
              width={400}
              height={500}
              style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover' }}
              unoptimized
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', aspectRatio: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={24} style={{ color: 'rgba(253,253,254,0.44)' }} />
            </div>
          )}
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.62), transparent)',
              padding: '24px 12px 10px',
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(253,253,254,0.62)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Before
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#FDFDFE', margin: 0 }}>
              {formatDate(before.date)}
            </p>
          </div>
          {beforeIdx > 0 && (
            <button
              onClick={() => setBeforeIdx(Math.max(0, beforeIdx - 1))}
              aria-label="Vorige"
              style={{
                position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)',
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(0,0,0,0.38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ChevronLeft size={14} style={{ color: '#FDFDFE' }} />
            </button>
          )}
          {beforeIdx < afterIdx - 1 && (
            <button
              onClick={() => setBeforeIdx(Math.min(afterIdx - 1, beforeIdx + 1))}
              aria-label="Volgende"
              style={{
                position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(0,0,0,0.38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ChevronRight size={14} style={{ color: '#FDFDFE' }} />
            </button>
          )}
        </div>

        {/* After */}
        <div style={{ background: '#2A2E2B', position: 'relative' }}>
          {afterUrl ? (
            <Image
              src={afterUrl}
              alt="After"
              width={400}
              height={500}
              style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover' }}
              unoptimized
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', aspectRatio: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={24} style={{ color: 'rgba(253,253,254,0.44)' }} />
            </div>
          )}
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.62), transparent)',
              padding: '24px 12px 10px',
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 500, color: '#C0FC01', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              After
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#FDFDFE', margin: 0 }}>
              {formatDate(after.date)}
            </p>
          </div>
          {afterIdx > beforeIdx + 1 && (
            <button
              onClick={() => setAfterIdx(Math.max(beforeIdx + 1, afterIdx - 1))}
              aria-label="Vorige"
              style={{
                position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)',
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(0,0,0,0.38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ChevronLeft size={14} style={{ color: '#FDFDFE' }} />
            </button>
          )}
          {afterIdx < checkins.length - 1 && (
            <button
              onClick={() => setAfterIdx(Math.min(checkins.length - 1, afterIdx + 1))}
              aria-label="Volgende"
              style={{
                position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(0,0,0,0.38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ChevronRight size={14} style={{ color: '#FDFDFE' }} />
            </button>
          )}
        </div>
      </div>

      {/* Time difference */}
      <div style={{ padding: '10px 14px 14px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.52)', letterSpacing: '0.02em' }}>
          {Math.round((new Date(after.date).getTime() - new Date(before.date).getTime()) / 86400000)} dagen verschil
        </span>
      </div>
    </div>
  )
}
