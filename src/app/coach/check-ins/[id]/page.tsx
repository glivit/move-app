import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { CheckInReviewForm } from '@/components/coach/CheckInReviewForm'
import { ArrowLeft, ImageOff, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

/**
 * Coach · Check-in detail (v3 Orion).
 * Canvas inherited from CoachLayout. Dark cards + accent deltas.
 */

interface Props {
  params: Promise<{ id: string }>
}

type DeltaKind = 'positive-down' | 'positive-up' | 'neutral'

export default async function CheckInReviewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: checkin } = await supabase
    .from('checkins')
    .select('*, profiles!checkins_client_id_fkey(full_name, package)')
    .eq('id', id)
    .single()

  if (!checkin) notFound()

  // Generate signed URLs for photos
  const photoFields = ['photo_front_url', 'photo_back_url', 'photo_left_url', 'photo_right_url'] as const
  const signedPhotoUrls: Record<string, string | null> = {}
  for (const field of photoFields) {
    const url = checkin[field]
    if (url) {
      const match = url.match(/\/storage\/v1\/object\/public\/checkin-photos\/(.+)$/)
      if (match) {
        const { data: signedData } = await supabase.storage
          .from('checkin-photos')
          .createSignedUrl(match[1], 3600)
        signedPhotoUrls[field] = signedData?.signedUrl || url
      } else {
        signedPhotoUrls[field] = url
      }
    } else {
      signedPhotoUrls[field] = null
    }
  }

  // Get previous check-in for comparison
  const { data: previousCheckin } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', checkin.client_id)
    .lt('date', checkin.date)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const prev = previousCheckin
  const clientName = (checkin as { profiles?: { full_name?: string } }).profiles?.full_name || 'Cliënt'

  const dateStr = new Date(checkin.date).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const hasAnyPhoto =
    checkin.photo_front_url ||
    checkin.photo_back_url ||
    checkin.photo_left_url ||
    checkin.photo_right_url

  return (
    <div className="pb-32">
      {/* ─── Header ─── */}
      <div className="flex items-start gap-3 pb-[22px] px-0.5">
        <Link
          href="/coach/check-ins"
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 transition-opacity active:opacity-70"
          style={{
            background: 'rgba(253,253,254,0.06)',
            color: '#FDFDFE',
          }}
          aria-label="Terug naar check-ins"
        >
          <ArrowLeft strokeWidth={1.75} className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1
            className="text-[30px] font-light tracking-[-0.025em] leading-[1.1] text-[#FDFDFE]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {clientName}
          </h1>
          <div className="mt-1.5 text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
            Check-in · {dateStr}
          </div>
        </div>
      </div>

      {/* ─── Photos ─── */}
      {hasAnyPhoto && (
        <>
          <SectionHeader label="Foto's" count={4} />
          <div className="bg-[#474B48] rounded-[18px] p-[14px] mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { url: signedPhotoUrls.photo_front_url, label: 'Voor' },
                { url: signedPhotoUrls.photo_back_url, label: 'Achter' },
                { url: signedPhotoUrls.photo_left_url, label: 'Links' },
                { url: signedPhotoUrls.photo_right_url, label: 'Rechts' },
              ].map((photo, idx) => (
                <div key={idx} className="space-y-2">
                  <div
                    className="relative w-full aspect-[3/4] rounded-[14px] overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(253,253,254,0.06)' }}
                  >
                    {photo.url ? (
                      <Image
                        src={photo.url}
                        alt={`Foto ${photo.label}`}
                        width={400}
                        height={500}
                        sizes="(max-width: 600px) 50vw, 200px"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <ImageOff
                          strokeWidth={1.5}
                          className="w-5 h-5 text-[rgba(253,253,254,0.44)]"
                        />
                        <span className="text-[10.5px] text-[rgba(253,253,254,0.55)] uppercase tracking-[0.1em]">
                          Geen foto
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10.5px] font-semibold text-center text-[rgba(253,253,254,0.72)] uppercase tracking-[0.12em] m-0">
                    {photo.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Body composition ─── */}
      <SectionHeader label="Lichaamssamenstelling" count={6} />
      <div className="bg-[#474B48] rounded-[18px] p-[14px] mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <MetricTile
            label="Gewicht"
            value={checkin.weight_kg}
            previousValue={prev?.weight_kg}
            unit="kg"
            kind="positive-down"
          />
          <MetricTile
            label="Vetpercentage"
            value={checkin.body_fat_pct}
            previousValue={prev?.body_fat_pct}
            unit="%"
            kind="positive-down"
          />
          <MetricTile
            label="Spiermassa"
            value={checkin.muscle_mass_kg}
            previousValue={prev?.muscle_mass_kg}
            unit="kg"
            kind="positive-up"
          />
          <MetricTile
            label="Visceraal vet"
            value={checkin.visceral_fat_level}
            previousValue={prev?.visceral_fat_level}
            unit=""
            kind="positive-down"
          />
          <MetricTile
            label="Water"
            value={checkin.body_water_pct}
            previousValue={prev?.body_water_pct}
            unit="%"
            kind="positive-up"
          />
          <MetricTile
            label="BMI"
            value={checkin.bmi}
            previousValue={prev?.bmi}
            unit=""
            kind="positive-down"
          />
        </div>
      </div>

      {/* ─── Measurements ─── */}
      <SectionHeader label="Omtrekmaten" count={9} />
      <div className="bg-[#474B48] rounded-[18px] p-[14px] mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <MetricTile label="Borst" value={checkin.chest_cm} previousValue={prev?.chest_cm} unit="cm" />
          <MetricTile
            label="Taille"
            value={checkin.waist_cm}
            previousValue={prev?.waist_cm}
            unit="cm"
            kind="positive-down"
          />
          <MetricTile label="Heupen" value={checkin.hips_cm} previousValue={prev?.hips_cm} unit="cm" />
          <MetricTile
            label="Arm links"
            value={checkin.left_arm_cm}
            previousValue={prev?.left_arm_cm}
            unit="cm"
            kind="positive-up"
          />
          <MetricTile
            label="Arm rechts"
            value={checkin.right_arm_cm}
            previousValue={prev?.right_arm_cm}
            unit="cm"
            kind="positive-up"
          />
          <MetricTile
            label="Been links"
            value={checkin.left_thigh_cm}
            previousValue={prev?.left_thigh_cm}
            unit="cm"
          />
          <MetricTile
            label="Been rechts"
            value={checkin.right_thigh_cm}
            previousValue={prev?.right_thigh_cm}
            unit="cm"
          />
          <MetricTile label="Kuit links" value={checkin.left_calf_cm} previousValue={prev?.left_calf_cm} unit="cm" />
          <MetricTile label="Kuit rechts" value={checkin.right_calf_cm} previousValue={prev?.right_calf_cm} unit="cm" />
        </div>
      </div>

      {/* ─── Review form ─── */}
      <SectionHeader label="Coach feedback" count={0} hideCount />
      <CheckInReviewForm
        checkinId={checkin.id}
        existingNotes={checkin.coach_notes}
        isReviewed={checkin.coach_reviewed === true}
        reviewedDate={null}
      />
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  hideCount = false,
}: {
  label: string
  count: number
  hideCount?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between mt-1 mb-[10px] mx-0.5 text-[10.5px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.36)]">
      <span>{label}</span>
      {!hideCount && <span className="tracking-[0.04em]">{count}</span>}
    </div>
  )
}

function MetricTile({
  label,
  value,
  previousValue,
  unit = '',
  kind = 'neutral',
}: {
  label: string
  value: number | string | null
  previousValue?: number | null
  unit?: string
  kind?: DeltaKind
}) {
  const numValue =
    value !== null && value !== undefined
      ? typeof value === 'number'
        ? value
        : parseFloat(value)
      : null
  const delta =
    numValue !== null && previousValue !== undefined && previousValue !== null
      ? +(numValue - previousValue).toFixed(1)
      : null

  const deltaColor = (() => {
    if (delta === null || delta === 0) return 'rgba(253,253,254,0.44)'
    if (kind === 'positive-down') return delta < 0 ? '#C0FC01' : '#E8A93C'
    if (kind === 'positive-up') return delta > 0 ? '#C0FC01' : '#E8A93C'
    return 'rgba(253,253,254,0.62)'
  })()

  return (
    <div
      className="rounded-[14px] px-[12px] py-[10px]"
      style={{ background: 'rgba(253,253,254,0.06)' }}
    >
      <div className="text-[10px] uppercase tracking-[0.12em] text-[rgba(253,253,254,0.44)] m-0">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className="text-[20px] font-light leading-[1.1] tabular-nums tracking-[-0.015em] text-[#FDFDFE]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {numValue !== null
            ? typeof value === 'number'
              ? value
              : numValue
            : '—'}
        </span>
        {unit && numValue !== null && (
          <span className="text-[11px] text-[rgba(253,253,254,0.55)]">{unit}</span>
        )}
      </div>
      {delta !== null && (
        <div
          className="flex items-center gap-0.5 mt-1.5 text-[10.5px] font-medium tabular-nums"
          style={{ color: deltaColor }}
        >
          {delta === 0 ? (
            <Minus strokeWidth={2} className="w-3 h-3" />
          ) : delta > 0 ? (
            <TrendingUp strokeWidth={2} className="w-3 h-3" />
          ) : (
            <TrendingDown strokeWidth={2} className="w-3 h-3" />
          )}
          <span>
            {delta > 0 ? '+' : ''}
            {delta} {unit}
          </span>
        </div>
      )}
    </div>
  )
}
