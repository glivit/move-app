export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { CheckInReviewForm } from '@/components/coach/CheckInReviewForm'
import { PackageBadge } from '@/components/ui/PackageBadge'
import { ArrowLeft, ImageOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CheckInReviewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: checkin } = await supabase
    .from('checkins')
    .select('*, profiles!checkins_client_id_fkey(full_name, package)')
    .eq('id', id)
    .single()

  if (!checkin) notFound()

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
  const clientName = (checkin as any).profiles?.full_name || 'Cliënt'
  const packageTier = (checkin as any).profiles?.package

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        <Link href="/coach/check-ins" className="p-2 rounded-lg transition-all flex-shrink-0 mt-1 bg-client-surface-muted hover:bg-gray-200">
          <ArrowLeft size={20} className="text-text-primary" strokeWidth={1.5} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-display font-semibold text-text-primary">
              {clientName}
            </h1>
            {packageTier && <PackageBadge tier={packageTier} size="md" />}
          </div>
          <p className="text-base mt-2 text-client-text-secondary">
            {new Date(checkin.date).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Photos Section */}
      {(checkin.photo_front_url || checkin.photo_back_url || checkin.photo_left_url || checkin.photo_right_url) && (
        <Card className="p-6 bg-white rounded-2xl shadow-clean border border-client-border">
          <h2 className="text-[17px] font-display font-semibold mb-6 text-text-primary">
            Foto's
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { url: checkin.photo_front_url, label: 'Voor' },
              { url: checkin.photo_back_url, label: 'Achter' },
              { url: checkin.photo_left_url, label: 'Links' },
              { url: checkin.photo_right_url, label: 'Rechts' },
            ].map((photo, idx) => (
              <div key={idx} className="space-y-2">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center bg-white border border-client-border">
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={`Photo ${photo.label}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ImageOff size={24} className="text-accent-dark" strokeWidth={1.5} />
                      <span className="text-[13px] text-client-text-secondary">
                        Geen foto
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[13px] font-medium text-center text-text-primary">
                  {photo.label}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Body Composition Section */}
      <Card className="p-6 bg-white rounded-2xl shadow-clean border border-client-border">
        <h2 className="text-[17px] font-display font-semibold mb-6 text-text-primary">
          Lichaamssamenstelling
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            label="Gewicht"
            value={checkin.weight_kg}
            previousValue={prev?.weight_kg}
            unit="kg"
            type="positive-down"
          />
          <MetricCard
            label="Vetpercentage"
            value={checkin.body_fat_pct}
            previousValue={prev?.body_fat_pct}
            unit="%"
            type="positive-down"
          />
          <MetricCard
            label="Spiermassa"
            value={checkin.muscle_mass_kg}
            previousValue={prev?.muscle_mass_kg}
            unit="kg"
            type="positive-up"
          />
          <MetricCard
            label="Visceraal vet"
            value={checkin.visceral_fat_level}
            previousValue={prev?.visceral_fat_level}
            unit=""
            type="positive-down"
          />
          <MetricCard
            label="Waterpercentage"
            value={checkin.body_water_pct}
            previousValue={prev?.body_water_pct}
            unit="%"
            type="positive-up"
          />
          <MetricCard
            label="BMI"
            value={checkin.bmi}
            previousValue={prev?.bmi}
            unit=""
            type="positive-down"
          />
        </div>
      </Card>

      {/* Measurements Section */}
      <Card className="p-6 bg-white rounded-2xl shadow-clean border border-client-border">
        <h2 className="text-[17px] font-display font-semibold mb-6 text-text-primary">
          Omtrekmaten
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Borst" value={checkin.chest_cm} previousValue={prev?.chest_cm} unit="cm" />
          <MetricCard
            label="Taille"
            value={checkin.waist_cm}
            previousValue={prev?.waist_cm}
            unit="cm"
            type="positive-down"
          />
          <MetricCard label="Heupen" value={checkin.hips_cm} previousValue={prev?.hips_cm} unit="cm" />
          <MetricCard
            label="L. Arm"
            value={checkin.left_arm_cm}
            previousValue={prev?.left_arm_cm}
            unit="cm"
            type="positive-up"
          />
          <MetricCard
            label="R. Arm"
            value={checkin.right_arm_cm}
            previousValue={prev?.right_arm_cm}
            unit="cm"
            type="positive-up"
          />
          <MetricCard
            label="L. Bovenbeen"
            value={checkin.left_thigh_cm}
            previousValue={prev?.left_thigh_cm}
            unit="cm"
          />
          <MetricCard
            label="R. Bovenbeen"
            value={checkin.right_thigh_cm}
            previousValue={prev?.right_thigh_cm}
            unit="cm"
          />
          <MetricCard label="L. Kuit" value={checkin.left_calf_cm} previousValue={prev?.left_calf_cm} unit="cm" />
          <MetricCard label="R. Kuit" value={checkin.right_calf_cm} previousValue={prev?.right_calf_cm} unit="cm" />
        </div>
      </Card>

      {/* Coach Review Form */}
      <CheckInReviewForm
        checkinId={checkin.id}
        existingNotes={checkin.coach_notes}
        isReviewed={checkin.coach_reviewed === true}
        reviewedDate={null}
      />
    </div>
  )
}
