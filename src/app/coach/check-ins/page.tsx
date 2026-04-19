import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ChevronRight, CheckCircle2, Clock, ClipboardCheck } from 'lucide-react'

/**
 * Coach · Check-ins (v3 Orion).
 * Canvas inherited from CoachLayout. Dark #474B48 cards + accent badges.
 */

interface CheckInRow {
  id: string
  date: string
  client_id: string
  coach_reviewed?: boolean
  profiles: {
    full_name: string | null
    package: string | null
  } | null
}

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

  const pending = (pendingCheckins || []) as unknown as CheckInRow[]
  const reviewed = (reviewedCheckins || []) as unknown as CheckInRow[]
  const pendingCount = pending.length
  const reviewedCount = reviewed.length

  return (
    <div className="pb-32">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between pb-[22px] px-0.5 gap-3">
        <div className="min-w-0">
          <h1
            className="text-[30px] font-light tracking-[-0.025em] leading-[1.1] text-[#FDFDFE]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Check-ins
          </h1>
          <div className="mt-1.5 text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
            {pendingCount === 0
              ? 'Alle check-ins zijn beoordeeld'
              : `${pendingCount} ${pendingCount === 1 ? 'check-in' : 'check-ins'} wachten op review`}
          </div>
        </div>
      </div>

      {/* ─── Stat tiles ─── */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <StatTile
          label="Te reviewen"
          value={pendingCount}
          accent={pendingCount > 0 ? '#E8A93C' : undefined}
        />
        <StatTile label="Recent beoordeeld" value={reviewedCount} />
      </div>

      {/* ─── Pending section ─── */}
      <SectionHeader label="Te reviewen" count={pendingCount} />
      {pending.length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {pending.map((ci) => (
            <CheckInRowCard key={ci.id} ci={ci} status="pending" />
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="Niets te reviewen"
          subtitle="Goed bezig. Alle check-ins van je cliënten zijn beoordeeld."
        />
      )}

      {/* ─── Recently reviewed section ─── */}
      {reviewedCount > 0 && (
        <>
          <SectionHeader label="Recent beoordeeld" count={reviewedCount} />
          <div className="flex flex-col gap-2">
            {reviewed.map((ci) => (
              <CheckInRowCard key={ci.id} ci={ci} status="reviewed" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div
      className="rounded-[18px] px-[14px] py-[12px]"
      style={{ background: '#474B48' }}
    >
      <div
        className="text-[10.5px] uppercase tracking-[0.14em]"
        style={{ color: accent || 'rgba(253,253,254,0.44)' }}
      >
        {label}
      </div>
      <div
        className="text-[24px] font-light leading-[1.1] mt-1 tracking-[-0.02em]"
        style={{
          color: '#FDFDFE',
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mt-1 mb-[10px] mx-0.5 text-[10.5px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.36)]">
      <span>{label}</span>
      <span className="tracking-[0.04em]">{count}</span>
    </div>
  )
}

function CheckInRowCard({
  ci,
  status,
}: {
  ci: CheckInRow
  status: 'pending' | 'reviewed'
}) {
  const name = ci.profiles?.full_name || 'Cliënt'
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const dateStr = new Date(ci.date).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const bg = status === 'pending' ? '#474B48' : 'rgba(71,75,72,0.55)'

  return (
    <Link
      href={`/coach/check-ins/${ci.id}`}
      className="block rounded-[18px] px-[14px] py-[12px] transition-colors active:opacity-80"
      style={{ background: bg }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
          style={{ background: 'rgba(253,253,254,0.14)', color: '#FDFDFE' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[14.5px] font-medium text-[#FDFDFE] truncate m-0 tracking-[-0.005em]">
              {name}
            </p>
            {status === 'pending' && (
              <span
                className="w-[6px] h-[6px] rounded-full bg-[#E8A93C] shrink-0"
                title="Nog niet beoordeeld"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[12px]">
            {status === 'pending' ? (
              <span className="flex items-center gap-1 text-[#E8A93C] font-medium">
                <Clock strokeWidth={1.75} className="w-3 h-3" />
                In afwachting
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#C0FC01] font-medium">
                <CheckCircle2 strokeWidth={1.75} className="w-3 h-3" />
                Beoordeeld
              </span>
            )}
            <span className="text-[rgba(253,253,254,0.30)]">·</span>
            <span className="text-[rgba(253,253,254,0.62)]">{dateStr}</span>
          </div>
        </div>
        <ChevronRight
          strokeWidth={1.75}
          className="w-4 h-4 text-[rgba(253,253,254,0.40)] shrink-0"
        />
      </div>
    </Link>
  )
}

function EmptyPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-[rgba(71,75,72,0.55)] rounded-[18px] px-6 py-10 text-center mb-6">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(253,253,254,0.08)' }}
      >
        <ClipboardCheck
          strokeWidth={1.5}
          className="w-5 h-5 text-[rgba(253,253,254,0.62)]"
        />
      </div>
      <p className="text-[14px] text-[#FDFDFE] font-medium m-0 mb-1 tracking-[-0.005em]">
        {title}
      </p>
      <p className="text-[12.5px] text-[rgba(253,253,254,0.62)] m-0 leading-[1.45]">
        {subtitle}
      </p>
    </div>
  )
}
