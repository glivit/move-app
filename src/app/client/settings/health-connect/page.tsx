'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Watch, Activity, Check, ExternalLink, Loader2, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Integration {
  id: string
  provider: string
  is_active: boolean
  last_sync_at: string | null
  created_at: string
}

const PROVIDERS = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: Heart,
    color: '#B55A4A',
    description: 'Stappen, slaap, hartslag, calorieën',
    available: true,
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: Watch,
    color: '#007DC3',
    description: 'Activiteit, slaap, stress, Body Battery',
    available: true,
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: Activity,
    color: '#00B0B9',
    description: 'Stappen, slaap, hartslag, SpO2',
    available: true,
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    icon: Activity,
    color: '#1DB954',
    description: 'HRV, recovery, slaap, strain',
    available: true,
  },
]

export default function HealthConnectPage() {
  const router = useRouter()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    loadIntegrations()
  }, [])

  async function loadIntegrations() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('health_integrations')
        .select('*')
        .eq('client_id', user.id)

      setIntegrations(data || [])
    } catch (e) {
      console.error('Error loading integrations:', e)
    } finally {
      setLoading(false)
    }
  }

  async function connectProvider(providerId: string) {
    setConnecting(providerId)
    try {
      // In production, this would open Terra/Vital widget
      // For now, create a placeholder integration
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if Terra API key is configured
      const terraApiKey = process.env.NEXT_PUBLIC_TERRA_API_KEY

      if (terraApiKey) {
        // TODO: Open Terra widget for OAuth flow
        // const widget = await TerraConnect.init({ apiKey: terraApiKey })
        // widget.open(providerId)
        alert('Terra API integratie wordt binnenkort geactiveerd. Neem contact op met je coach.')
      } else {
        // Demo mode: create integration record
        await supabase.from('health_integrations').upsert({
          client_id: user.id,
          provider: providerId,
          is_active: true,
          external_user_id: `demo-${user.id}`,
        }, { onConflict: 'client_id,provider' })

        await loadIntegrations()
      }
    } catch (e) {
      console.error('Error connecting:', e)
    } finally {
      setConnecting(null)
    }
  }

  async function disconnectProvider(providerId: string) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('health_integrations')
        .update({ is_active: false })
        .eq('client_id', user.id)
        .eq('provider', providerId)

      await loadIntegrations()
    } catch (e) {
      console.error('Error disconnecting:', e)
    }
  }

  function getIntegration(providerId: string): Integration | undefined {
    return integrations.find(i => i.provider === providerId && i.is_active)
  }

  function formatLastSync(dateStr: string | null): string {
    if (!dateStr) return 'Nooit gesynchroniseerd'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMin = Math.round((now.getTime() - date.getTime()) / 60000)
    if (diffMin < 1) return 'Zojuist'
    if (diffMin < 60) return `${diffMin} min geleden`
    if (diffMin < 1440) return `${Math.round(diffMin / 60)} uur geleden`
    return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] bg-[#FFFFFF] px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#A6ADA7] rounded-xl w-48" />
          <div className="h-24 bg-[#A6ADA7] rounded-2xl" />
          <div className="h-24 bg-[#A6ADA7] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] bg-[#FFFFFF] -mx-4 -mt-4 px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[rgba(253,253,254,0.55)] mb-6">
        <ArrowLeft size={18} /> Terug
      </button>

      <h1 className="text-[24px] font-semibold text-[#FDFDFE] mb-2">Gezondheidsdata</h1>
      <p className="text-[14px] text-[rgba(253,253,254,0.55)] mb-6">
        Koppel je wearable om automatisch stappen, slaap en hartslag te synchroniseren.
      </p>

      <div className="space-y-3">
        {PROVIDERS.map(provider => {
          const integration = getIntegration(provider.id)
          const isConnected = !!integration
          const Icon = provider.icon

          return (
            <div key={provider.id} className="bg-[#A6ADA7] rounded-2xl p-5 border border-[rgba(253,253,254,0.08)]">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${provider.color}15` }}
                >
                  <Icon size={24} style={{ color: provider.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#FDFDFE]">{provider.name}</h3>
                    {isConnected && (
                      <span className="px-2 py-0.5 rounded-full bg-[#2FA65A]/10 text-[#2FA65A] text-[10px] font-bold uppercase">
                        Gekoppeld
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[rgba(253,253,254,0.55)] mt-0.5">{provider.description}</p>
                  {isConnected && (
                    <p className="text-[11px] text-[rgba(253,253,254,0.48)] mt-1">
                      Laatste sync: {formatLastSync(integration.last_sync_at)}
                    </p>
                  )}
                </div>

                {isConnected ? (
                  <button
                    onClick={() => disconnectProvider(provider.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#B55A4A] hover:bg-red-50 transition-colors"
                  >
                    <Unlink size={14} />
                    Ontkoppel
                  </button>
                ) : (
                  <button
                    onClick={() => connectProvider(provider.id)}
                    disabled={connecting === provider.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#474B48] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {connecting === provider.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    Koppel
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-white/50 rounded-2xl">
        <p className="text-[12px] text-[rgba(253,253,254,0.55)] leading-relaxed">
          Je data wordt veilig gesynchroniseerd en alleen gedeeld met je coach.
          Je kunt de koppeling op elk moment verbreken. Handmatig ingevoerde data wordt niet overschreven.
        </p>
      </div>
    </div>
  )
}
