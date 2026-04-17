'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, Loader2, Receipt, ExternalLink } from 'lucide-react'

interface Invoice {
  id: string
  amount: number
  status: string
  date: string
  description: string
}

export default function InvoicesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ package: string | null; stripe_customer_id: string | null } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      const { data } = await supabase
        .from('profiles')
        .select('package, stripe_customer_id')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const getPackagePrice = (pkg: string | null | undefined) => {
    switch (pkg?.toLowerCase()) {
      case 'essential': return '297'
      case 'performance': return '497'
      case 'elite': return '797'
      default: return '—'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#FDFDFE]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#FDFDFE]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-editorial-h2 text-[#FDFDFE]">
          Facturen
        </h1>
      </div>

      {/* Current Package */}
      <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] text-[rgba(253,253,254,0.55)] uppercase tracking-wide font-medium">Huidig pakket</p>
            <p className="text-[20px] font-semibold text-[#FDFDFE] mt-1">
              {profile?.package?.charAt(0).toUpperCase()}{profile?.package?.slice(1) || 'Standaard'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-bold text-[#FDFDFE]">
              €{getPackagePrice(profile?.package)}
            </p>
            <p className="text-[13px] text-[rgba(253,253,254,0.55)]">/maand</p>
          </div>
        </div>
        <div className="h-px bg-[rgba(253,253,254,0.08)] mb-4" />
        <p className="text-[13px] text-[rgba(253,253,254,0.55)]">
          Facturatie wordt beheerd via Stripe. Neem contact op met je coach voor wijzigingen aan je pakket.
        </p>
      </div>

      {/* Billing Portal */}
      {profile?.stripe_customer_id && (
        <a
          href="/api/billing/portal"
          className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] p-5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
        >
          <div className="flex items-center gap-3">
            <ExternalLink strokeWidth={1.5} className="w-5 h-5 text-[#FDFDFE]" />
            <div>
              <p className="text-[15px] text-[#FDFDFE] font-medium">Stripe klantenportaal</p>
              <p className="text-[13px] text-[rgba(253,253,254,0.55)]">Beheer betalingen, facturen en betaalmethoden</p>
            </div>
          </div>
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5 text-[rgba(253,253,254,0.48)] rotate-180" />
        </a>
      )}

      {/* Empty State */}
      <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] p-8 text-center">
        <Receipt strokeWidth={1.5} className="w-10 h-10 text-[rgba(253,253,254,0.48)] mx-auto mb-3" />
        <p className="text-[15px] text-[rgba(253,253,254,0.55)] mb-1">Factuuroverzicht</p>
        <p className="text-[13px] text-[rgba(253,253,254,0.48)]">
          Facturen worden automatisch gegenereerd via Stripe en zijn beschikbaar in het klantenportaal.
        </p>
      </div>
    </div>
  )
}
