export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ClientProfileTabs } from '@/components/coach/ClientProfileTabs'
import { PackageBadge } from '@/components/ui/PackageBadge'
import { ReportButton } from '@/components/coach/ReportButton'
import { SendNotificationButton } from '@/components/coach/SendNotificationButton'
import { ResendInviteButton } from '@/components/coach/ResendInviteButton'
import { ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: latestCheckin } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const { count: checkinCount } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)

  const { data: intakeForm } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('client_id', id)
    .single()

  // Count completed workouts
  const { count: workoutCount } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
    .not('completed_at', 'is', null)

  // Calculate days active
  const startDate = profile.start_date ? new Date(profile.start_date) : null
  const today = new Date()
  const daysActive = startDate ? Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

  // Get initials for avatar
  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        {/* Back Button */}
        <Link
          href="/coach/clients"
          className="inline-flex items-center gap-1 text-[#8E8E93] hover:text-[#8E8E93] transition-colors mb-6"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar cliënten</span>
        </Link>

        {/* Client Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FAFAFA' }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-xl font-semibold" style={{ color: '#1A1917' }}>
                {initials}
              </span>
            )}
          </div>

          {/* Client Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-display font-semibold" style={{ color: '#1A1A18' }}>
              {profile.full_name}
            </h1>

            {/* Email and Badge */}
            <div className="flex items-center gap-3 mt-3">
              {profile.email && (
                <span className="text-sm" style={{ color: '#8E8E93' }}>
                  {profile.email}
                </span>
              )}
              {profile.package && <PackageBadge tier={profile.package} />}
            </div>

            {/* Start Date */}
            {profile.start_date && (
              <div className="flex items-center gap-1 mt-2">
                <Calendar strokeWidth={1.5} className="w-4 h-4" style={{ color: '#8E8E93' }} />
                <span className="text-sm" style={{ color: '#8E8E93' }}>
                  Lid sinds {new Date(profile.start_date).toLocaleDateString('nl-BE')}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ResendInviteButton clientId={id} clientName={profile.full_name} />
            <SendNotificationButton clientId={id} clientName={profile.full_name} />
            <ReportButton clientId={id} clientName={profile.full_name} />
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-8">
          {/* Last Check-in */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            <p className="text-xs font-medium" style={{ color: '#8E8E93' }}>
              LAATSTE CHECK-IN
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: '#1A1A18' }}>
              {latestCheckin ? new Date(latestCheckin.date).toLocaleDateString('nl-BE') : '—'}
            </p>
          </div>

          {/* Total Check-ins */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            <p className="text-xs font-medium" style={{ color: '#8E8E93' }}>
              TOTAAL CHECK-INS
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: '#1A1A18' }}>
              {checkinCount || 0}
            </p>
          </div>

          {/* Workouts Completed */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            <p className="text-xs font-medium" style={{ color: '#8E8E93' }}>
              WORKOUTS
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: '#1A1A18' }}>
              {workoutCount || 0}
            </p>
          </div>

          {/* Days Active */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            <p className="text-xs font-medium" style={{ color: '#8E8E93' }}>
              DAGEN ACTIEF
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: '#1A1A18' }}>
              {daysActive}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ClientProfileTabs
        profile={profile}
        latestCheckin={latestCheckin}
        checkinCount={checkinCount || 0}
        intakeForm={intakeForm}
      />
    </div>
  )
}
