'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { CheckCircle2, Clock, ExternalLink, MessageSquare, TrendingUp, Apple, Dumbbell, Heart } from 'lucide-react'
import { ClientHealthSummary } from '@/components/coach/ClientHealthSummary'
import type { CheckIn, IntakeForm, Profile } from '@/types'

interface Props {
  profile: Profile
  latestCheckin: CheckIn | null
  checkinCount: number
  intakeForm: IntakeForm | null
}

const tabs = [
  { id: 'overview', label: 'Overzicht' },
  { id: 'program', label: 'Programma' },
  { id: 'nutrition', label: 'Voeding' },
  { id: 'progress', label: 'Voortgang' },
  { id: 'checkins', label: 'Check-ins' },
  { id: 'messages', label: 'Berichten' },
  { id: 'health', label: 'Gezondheid' },
]

export function ClientProfileTabs({
  profile,
  latestCheckin,
  checkinCount,
  intakeForm,
}: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loadingCheckins, setLoadingCheckins] = useState(false)

  useEffect(() => {
    if (activeTab === 'checkins' && checkins.length === 0) {
      setLoadingCheckins(true)
      const supabase = createClient()
      supabase
        .from('checkins')
        .select('id, date, weight_kg, body_fat_pct, muscle_mass_kg, coach_reviewed_at')
        .eq('client_id', profile.id)
        .order('date', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setCheckins(data as unknown as CheckIn[])
          setLoadingCheckins(false)
        })
    }
  }, [activeTab, profile.id, checkins.length])

  const startDate = profile.start_date ? new Date(profile.start_date) : null
  const today = new Date()
  const daysActive = startDate ? Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-[#F0F0ED] overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[14px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#8B6914] text-text-primary'
                  : 'border-transparent text-client-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overzicht Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Latest Metrics */}
            {latestCheckin ? (
              <div>
                <h3 className="text-[13px] text-client-text-secondary uppercase font-medium tracking-wide mb-3">
                  Laatste meting — {new Date(latestCheckin.date).toLocaleDateString('nl-BE')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {latestCheckin.weight_kg && (
                    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">
                        Gewicht
                      </p>
                      <p className="text-2xl font-bold text-text-primary mt-2">
                        {latestCheckin.weight_kg}
                        <span className="text-[12px] text-client-text-secondary ml-1 font-normal">kg</span>
                      </p>
                    </div>
                  )}
                  {latestCheckin.body_fat_pct && (
                    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">
                        Vetpercentage
                      </p>
                      <p className="text-2xl font-bold text-text-primary mt-2">
                        {latestCheckin.body_fat_pct}
                        <span className="text-[12px] text-client-text-secondary ml-1 font-normal">%</span>
                      </p>
                    </div>
                  )}
                  {latestCheckin.muscle_mass_kg && (
                    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">
                        Spiermassa
                      </p>
                      <p className="text-2xl font-bold text-text-primary mt-2">
                        {latestCheckin.muscle_mass_kg}
                        <span className="text-[12px] text-client-text-secondary ml-1 font-normal">kg</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
                <p className="text-[14px] text-client-text-secondary">Nog geen check-in data beschikbaar.</p>
              </div>
            )}

            {/* Intake Information */}
            {intakeForm && intakeForm.completed && (
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <h3 className="text-[15px] font-semibold text-text-primary mb-4">
                  Intake informatie
                </h3>
                <div className="space-y-4 text-[14px]">
                  {intakeForm.primary_goal && (
                    <div>
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Hoofddoel</p>
                      <p className="mt-1 text-text-primary">{intakeForm.primary_goal}</p>
                    </div>
                  )}
                  {intakeForm.training_experience && (
                    <div>
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Trainersondervinding</p>
                      <p className="mt-1 text-text-primary">{intakeForm.training_experience}</p>
                    </div>
                  )}
                  {intakeForm.injuries_limitations && (
                    <div>
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Blessures / beperkingen</p>
                      <p className="mt-1 text-text-primary">{intakeForm.injuries_limitations}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Days Active Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">
                    Dagen actief
                  </p>
                  <p className="text-2xl font-bold text-text-primary mt-2">{daysActive}</p>
                </div>
                <div>
                  <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">
                    Totaal check-ins
                  </p>
                  <p className="text-2xl font-bold text-text-primary mt-2">{checkinCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Programma Tab */}
        {activeTab === 'program' && (
          <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
            <Dumbbell strokeWidth={1.5} className="w-8 h-8 mx-auto mb-3 text-client-text-secondary" />
            <p className="text-[14px] text-client-text-secondary mb-4">
              Trainingsplan beheren
            </p>
            <Link
              href={`/coach/clients/${profile.id}/program`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8B6914] text-white rounded-xl text-[14px] font-semibold hover:bg-[#6F5612] transition-colors"
            >
              Programma toewijzen
              <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Voeding Tab */}
        {activeTab === 'nutrition' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <Apple strokeWidth={1.5} className="w-8 h-8 mx-auto mb-3 text-client-text-secondary" />
              <p className="text-[14px] text-client-text-secondary mb-4">
                Voedingsplan beheren
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/coach/clients/${profile.id}/nutrition`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8B6914] text-white rounded-xl text-[14px] font-semibold hover:bg-[#6F5612] transition-colors"
                >
                  Voedingsplan
                  <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
                </Link>
                <Link
                  href={`/coach/clients/${profile.id}/meal-plan`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-text-primary border border-[#F0F0ED] rounded-xl text-[14px] font-semibold hover:bg-[#FAFAFA] transition-colors"
                >
                  Maaltijdplan
                  <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Voortgang Tab */}
        {activeTab === 'progress' && (
          <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
            <TrendingUp strokeWidth={1.5} className="w-8 h-8 mx-auto mb-3 text-client-text-secondary" />
            <p className="text-[14px] text-client-text-secondary mb-4">
              Bekijk voortgang, grafieken en persoonlijke records
            </p>
            <Link
              href={`/coach/clients/${profile.id}/progress`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8B6914] text-white rounded-xl text-[14px] font-semibold hover:bg-[#6F5612] transition-colors"
            >
              Voortgang bekijken
              <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Check-ins Tab */}
        {activeTab === 'checkins' && (
          <div>
            {loadingCheckins ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 animate-pulse bg-client-surface-muted"
                  >
                    <div className="h-4 rounded w-1/3 mb-3 bg-[#F0F0ED]" />
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((j) => (
                        <div key={j}>
                          <div className="h-3 rounded w-16 mb-1 bg-[#F0F0ED]" />
                          <div className="h-4 rounded w-12 bg-[#F0F0ED]" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : checkins.length > 0 ? (
              <div className="space-y-3">
                {checkins.map((checkin) => {
                  const isReviewed = checkin.coach_reviewed
                  return (
                    <Link
                      key={checkin.id}
                      href={`/coach/check-ins/${checkin.id}`}
                      className="block p-4 rounded-2xl border border-[#F0F0ED] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-[14px] font-semibold text-text-primary">
                            {new Date(checkin.date).toLocaleDateString('nl-BE')}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[13px] text-client-text-secondary">
                            {checkin.weight_kg && (
                              <span>Gewicht: {checkin.weight_kg} kg</span>
                            )}
                            {checkin.body_fat_pct && (
                              <span>Vetpercentage: {checkin.body_fat_pct}%</span>
                            )}
                          </div>
                        </div>
                        {isReviewed ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34C759]/10">
                            <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 text-[#34C759]" />
                            <span className="text-[12px] font-medium text-[#34C759]">Bekeken</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF9500]/10">
                            <Clock strokeWidth={1.5} className="w-4 h-4 text-[#FF9500]" />
                            <span className="text-[12px] font-medium text-[#FF9500]">Te reviewen</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
                <p className="text-[14px] text-client-text-secondary">Geen check-ins beschikbaar.</p>
              </div>
            )}
          </div>
        )}

        {/* Berichten Tab */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
            <MessageSquare strokeWidth={1.5} className="w-8 h-8 mx-auto mb-3 text-client-text-secondary" />
            <p className="text-[14px] text-client-text-secondary mb-4">
              Direct berichten met deze cliënt
            </p>
            <Link
              href={`/coach/clients/${profile.id}/messages`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8B6914] text-white rounded-xl text-[14px] font-semibold hover:bg-[#6F5612] transition-colors"
            >
              Open berichten
              <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Gezondheid Tab */}
        {activeTab === 'health' && (
          <ClientHealthSummary clientId={profile.id} />
        )}
      </div>
    </div>
  )
}
