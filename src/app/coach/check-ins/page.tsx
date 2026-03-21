import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Card } from '@/components/ui/Card'
import { PackageBadge } from '@/components/ui/PackageBadge'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'

export default async function CheckInsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: pendingCheckins } = await supabase
    .from('checkins')
    .select('id, date, client_id, profiles!checkins_client_id_fkey(full_name, package)')
    .eq('coach_reviewed', false)
    .order('date', { ascending: false })

  const { data: reviewedCheckins } = await supabase
    .from('checkins')
    .select('id, date, client_id, coach_reviewed, profiles!checkins_client_id_fkey(full_name, package)')
    .eq('coach_reviewed', true)
    .order('date', { ascending: false })
    .limit(10)

  const pendingCount = pendingCheckins?.length || 0
  const reviewedCount = reviewedCheckins?.length || 0

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-semibold text-text-primary">
          Check-ins
        </h1>
        <p className="text-base text-client-text-secondary">
          {pendingCount === 0
            ? 'Alle check-ins zijn beoordeeld'
            : `${pendingCount} ${pendingCount === 1 ? 'check-in' : 'check-ins'} wachtend op review`}
        </p>
      </div>

      {/* Pending Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-100">
            <AlertCircle size={18} className="text-orange-600" strokeWidth={1.5} />
          </div>
          <h2 className="text-[17px] font-display font-semibold text-text-primary">
            Te reviewen
          </h2>
          {pendingCount > 0 && (
            <span className="ml-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-dark text-white">
              {pendingCount}
            </span>
          )}
        </div>

        {pendingCheckins && pendingCheckins.length > 0 ? (
          <div className="space-y-2">
            {pendingCheckins.map((checkin: any) => (
              <Link key={checkin.id} href={`/coach/check-ins/${checkin.id}`}>
                <Card className="flex items-center justify-between p-4 transition-all hover:shadow-md cursor-pointer bg-white rounded-2xl shadow-clean border border-client-border">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-50">
                      <AlertCircle size={20} className="text-orange-600" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary">
                          {checkin.profiles?.full_name || 'Cliënt'}
                        </span>
                        {checkin.profiles?.package && <PackageBadge tier={checkin.profiles.package} />}
                      </div>
                      <p className="text-[13px] mt-0.5 text-client-text-secondary">
                        {new Date(checkin.date).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-accent-dark flex-shrink-0" strokeWidth={1.5} />
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-white rounded-2xl shadow-clean border border-client-border">
            <p className="text-client-text-secondary">Geen check-ins wachtend op review</p>
          </Card>
        )}
      </div>

      {/* Recently Reviewed Section */}
      {reviewedCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
              <CheckCircle2 size={18} className="text-green-700" strokeWidth={1.5} />
            </div>
            <h2 className="text-[17px] font-display font-semibold text-text-primary">
              Recent beoordeeld
            </h2>
          </div>

          <div className="space-y-2">
            {(reviewedCheckins || []).map((checkin: any) => (
              <Link key={checkin.id} href={`/coach/check-ins/${checkin.id}`}>
                <Card className="flex items-center justify-between p-4 transition-all hover:shadow-md cursor-pointer opacity-75 hover:opacity-100 bg-white rounded-2xl shadow-clean border border-client-border">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-50">
                      <CheckCircle2 size={20} className="text-green-700" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">
                          {checkin.profiles?.full_name || 'Cliënt'}
                        </span>
                        {checkin.profiles?.package && <PackageBadge tier={checkin.profiles.package} />}
                      </div>
                      <p className="text-[13px] mt-0.5 text-client-text-secondary">
                        {new Date(checkin.date).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-accent-dark flex-shrink-0" strokeWidth={1.5} />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
