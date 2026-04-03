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
          // Filter to only checkins that have at least one photo
          const withPhotos = data.filter((c: any) =>
            c.photo_front_url || c.photo_back_url || c.photo_left_url || c.photo_right_url
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

  // Find angles that have photos in both before and after
  const availableAngles = (['front', 'back', 'left', 'right'] as ViewAngle[]).filter(a =>
    getUrl(before, a) && getUrl(after, a)
  )

  if (availableAngles.length === 0) return null

  // If current angle isn't available, switch to first available
  if (!availableAngles.includes(angle)) {
    // Will trigger re-render
    return null
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={16} strokeWidth={1.5} className="text-[var(--color-pop)]" />
          <span className="text-label">Before / After</span>
        </div>

        {/* Angle picker */}
        <div className="flex gap-1">
          {availableAngles.map(a => (
            <button
              key={a}
              onClick={() => setAngle(a)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.04em] transition-colors ${
                angle === a
                  ? 'bg-[#1A1917] text-white'
                  : 'bg-[#F5F2EC] text-[#A09D96] hover:bg-[#EDEAE4]'
              }`}
            >
              {ANGLE_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Photos side by side */}
      <div className="grid grid-cols-2 gap-[2px] bg-[#E5E1D9]">
        {/* Before */}
        <div className="bg-[#1A1917] relative">
          {beforeUrl ? (
            <Image
              src={beforeUrl}
              alt="Before"
              width={400}
              height={500}
              className="w-full aspect-[3/4] object-cover"
              unoptimized
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-[3/4] flex items-center justify-center">
              <Camera size={24} className="text-[#6B6862]" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.06em]">Before</p>
            <p className="text-[12px] font-semibold text-white">{formatDate(before.date)}</p>
          </div>
          {/* Nav arrows */}
          {beforeIdx > 0 && (
            <button
              onClick={() => setBeforeIdx(Math.max(0, beforeIdx - 1))}
              className="absolute top-1/2 left-1 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center"
            >
              <ChevronLeft size={14} className="text-white" />
            </button>
          )}
          {beforeIdx < afterIdx - 1 && (
            <button
              onClick={() => setBeforeIdx(Math.min(afterIdx - 1, beforeIdx + 1))}
              className="absolute top-1/2 right-1 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center"
            >
              <ChevronRight size={14} className="text-white" />
            </button>
          )}
        </div>

        {/* After */}
        <div className="bg-[#1A1917] relative">
          {afterUrl ? (
            <Image
              src={afterUrl}
              alt="After"
              width={400}
              height={500}
              className="w-full aspect-[3/4] object-cover"
              unoptimized
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-[3/4] flex items-center justify-center">
              <Camera size={24} className="text-[#6B6862]" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.06em]">After</p>
            <p className="text-[12px] font-semibold text-white">{formatDate(after.date)}</p>
          </div>
          {afterIdx > beforeIdx + 1 && (
            <button
              onClick={() => setAfterIdx(Math.max(beforeIdx + 1, afterIdx - 1))}
              className="absolute top-1/2 left-1 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center"
            >
              <ChevronLeft size={14} className="text-white" />
            </button>
          )}
          {afterIdx < checkins.length - 1 && (
            <button
              onClick={() => setAfterIdx(Math.min(checkins.length - 1, afterIdx + 1))}
              className="absolute top-1/2 right-1 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center"
            >
              <ChevronRight size={14} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Time difference */}
      <div className="px-5 py-3 text-center">
        <span className="text-[12px] text-[#A09D96]">
          {Math.round((new Date(after.date).getTime() - new Date(before.date).getTime()) / 86400000)} dagen verschil
        </span>
      </div>
    </div>
  )
}
