'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, Loader2 } from 'lucide-react'

interface NotificationSettings {
  workoutReminders: boolean
  checkinReminders: boolean
  coachMessages: boolean
  weeklyProgress: boolean
  prCelebrations: boolean
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<NotificationSettings>({
    workoutReminders: true,
    checkinReminders: true,
    coachMessages: true,
    weeklyProgress: true,
    prCelebrations: true,
  })
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    const load = async () => {
      // Check push notification permission
      if ('Notification' in window) {
        setPushEnabled(Notification.permission === 'granted')
      }

      // Load saved preferences from localStorage
      const saved = localStorage.getItem('move-notification-settings')
      if (saved) {
        try { setSettings(JSON.parse(saved)) } catch {}
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggleSetting = (key: keyof NotificationSettings) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    localStorage.setItem('move-notification-settings', JSON.stringify(updated))
  }

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setPushEnabled(permission === 'granted')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#FDFDFE]" />
      </div>
    )
  }

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors ${
        enabled ? 'bg-[#2FA65A]' : 'bg-[rgba(253,253,254,0.08)]'
      }`}
    >
      <div
        className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform ${
          enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#FDFDFE]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-editorial-h2 text-[#FDFDFE]">
          Meldingen
        </h1>
      </div>

      {/* Push Notification Toggle */}
      <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] divide-y divide-[rgba(253,253,254,0.08)]">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] text-[#FDFDFE] font-medium">Push meldingen</p>
            <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-0.5">
              {pushEnabled ? 'Meldingen zijn ingeschakeld' : 'Schakel push meldingen in'}
            </p>
          </div>
          {pushEnabled ? (
            <Toggle enabled={pushEnabled} onToggle={() => {}} />
          ) : (
            <button
              onClick={requestPushPermission}
              className="px-4 py-2 bg-[#FDFDFE] text-white text-[13px] font-semibold rounded-full"
            >
              Inschakelen
            </button>
          )}
        </div>
      </div>

      {/* Notification Categories */}
      <div>
        <p className="text-[13px] font-medium text-[rgba(253,253,254,0.55)] uppercase tracking-wide px-1 mb-2">Training</p>
        <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] divide-y divide-[rgba(253,253,254,0.08)]">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] text-[#FDFDFE]">Workout herinneringen</p>
              <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-0.5">Dagelijkse training herinnering</p>
            </div>
            <Toggle enabled={settings.workoutReminders} onToggle={() => toggleSetting('workoutReminders')} />
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] text-[#FDFDFE]">PR meldingen</p>
              <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-0.5">Vier je persoonlijke records</p>
            </div>
            <Toggle enabled={settings.prCelebrations} onToggle={() => toggleSetting('prCelebrations')} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-[rgba(253,253,254,0.55)] uppercase tracking-wide px-1 mb-2">Coach</p>
        <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] divide-y divide-[rgba(253,253,254,0.08)]">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] text-[#FDFDFE]">Berichten van coach</p>
              <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-0.5">Nieuwe berichten en feedback</p>
            </div>
            <Toggle enabled={settings.coachMessages} onToggle={() => toggleSetting('coachMessages')} />
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] text-[#FDFDFE]">Check-in herinneringen</p>
              <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-0.5">Wekelijkse check-in herinnering</p>
            </div>
            <Toggle enabled={settings.checkinReminders} onToggle={() => toggleSetting('checkinReminders')} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-[rgba(253,253,254,0.55)] uppercase tracking-wide px-1 mb-2">Voortgang</p>
        <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] divide-y divide-[rgba(253,253,254,0.08)]">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] text-[#FDFDFE]">Wekelijks overzicht</p>
              <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-0.5">Je wekelijkse voortgangsrapport</p>
            </div>
            <Toggle enabled={settings.weeklyProgress} onToggle={() => toggleSetting('weeklyProgress')} />
          </div>
        </div>
      </div>
    </div>
  )
}
