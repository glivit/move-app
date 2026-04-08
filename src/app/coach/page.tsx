import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ClientStatusGrid } from '@/components/coach/ClientStatusGrid'
import { AIDraftsPanel } from '@/components/coach/AIDraftsPanel'
import Link from 'next/link'
import {
  FileText,
  Dumbbell,
  UtensilsCrossed,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function formatDateDutch(date: Date) {
  return date.toLocaleDateString('nl-BE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function CoachDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-[#EEEBE3] px-5 py-10 flex items-center justify-center">
        <p className="text-[#6B6862]">Niet ingelogd</p>
      </div>
    )
  }

  const greeting = getGreeting()
  const dateFormatted = formatDateDutch(new Date())

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-[40px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
          {greeting}, Glenn
        </h1>
        <p className="mt-2.5 text-[15px] text-[#A09D96] tracking-[-0.01em]">{dateFormatted}</p>
      </div>

      {/* AI Drafts — pending messages to review */}
      <AIDraftsPanel />

      {/* Client Overview — full width cards */}
      <ClientStatusGrid />

      {/* Quick Actions */}
      <div>
        <h2 className="text-[22px] font-semibold text-[#1A1917] mb-6 tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
          Snelle acties
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { href: '/coach/programs/new', icon: FileText, label: 'Programma maken', desc: 'Nieuw trainingsprogramma' },
            { href: '/coach/exercises', icon: Dumbbell, label: 'Oefeningen', desc: 'Oefeningenbibliotheek' },
            { href: '/coach/nutrition/new', icon: UtensilsCrossed, label: 'Voedingsplan', desc: 'Plan opstellen' },
            { href: '/coach/messages', icon: MessageSquare, label: 'Berichten', desc: 'Communicatie met cliënten' },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="card-tactile p-5 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EDEAE4] to-[#E5E1D9] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                      <action.icon className="w-[22px] h-[22px] text-[#1A1917]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-[15px] font-medium text-[#1A1917] block">{action.label}</span>
                      <span className="text-[12px] text-[#A09D96] mt-0.5 block">{action.desc}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#C5C2BC] group-hover:text-[#1A1917] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-[280ms]" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
