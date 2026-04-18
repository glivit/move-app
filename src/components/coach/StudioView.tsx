'use client'

import Link from 'next/link'
import type { CoachStudioData, TemplateRow, NutritionTemplateRow } from '@/lib/coach-studio-data'

interface Props {
  data: CoachStudioData
  coachId: string
}

/**
 * Coach · Studio (v3 Orion).
 * Library + coaching-stats + account, pixel-matched to the coach-studio.html mockup.
 */
export function StudioView({ data, coachId }: Props) {
  void coachId

  const headerSub = `${data.activeClients} ${data.activeClients === 1 ? 'klant' : 'klanten'} actief · ${data.templateCount} templates`
  const insightSub = `${data.activeClients} actieve klanten${data.trialClients > 0 ? ` · ${data.trialClients} trial` : ''}`

  return (
    <div className="min-h-screen bg-[#8E9890] text-[#FDFDFE] pb-[110px]">
      <div className="mx-auto max-w-[420px] px-[22px]">
        {/* Header */}
        <div className="pt-[14px] pb-[22px] px-[2px]">
          <div className="text-[30px] leading-[1.1] font-light tracking-[-0.025em] text-[#FDFDFE]">
            Studio
          </div>
          <div className="mt-[6px] text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
            {headerSub}
          </div>
        </div>

        {/* Primary CTA: nieuwe klant uitnodigen */}
        <Link
          href="/coach/clients/new"
          className="relative mb-[10px] grid grid-cols-[54px_1fr_auto] items-center gap-4 overflow-hidden rounded-[22px] bg-[#474B48] px-[22px] py-[20px] hover:bg-[#4d524e] transition-colors"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-[140px] w-[140px]"
            style={{
              background:
                'radial-gradient(circle, rgba(192,252,1,0.10), transparent 70%)',
            }}
          />
          <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-[#C0FC01] text-[26px] font-light leading-none text-[#0A0E0B]">
            +
          </span>
          <span>
            <span className="block text-[17px] font-medium tracking-[-0.01em] text-[#FDFDFE]">
              Nieuwe klant uitnodigen
            </span>
            <span className="mt-[3px] block text-[12.5px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
              Stuur een link · intake in 4 vragen
            </span>
          </span>
          <span className="text-[18px] leading-none text-[rgba(253,253,254,0.62)]">›</span>
        </Link>

        {/* BIBLIOTHEEK */}
        <SectionLabel>Bibliotheek</SectionLabel>

        {/* Programma's */}
        <LibraryCard
          title="Programma's"
          total={data.programTemplatesTotal}
          rows={data.programTemplates}
          rowHref={(row) => `/coach/programs/${row.id}`}
          viewAllHref="/coach/programs"
          newHref="/coach/programs/new"
          emptyLabel="Nog geen programma's · maak je eerste template"
        />

        {/* Voedingssjablonen */}
        <NutritionLibraryCard
          title="Voedingssjablonen"
          total={data.nutritionTemplatesTotal}
          rows={data.nutritionTemplates}
          viewAllHref="/coach/nutrition"
          newHref="/coach/nutrition/new"
          emptyLabel="Nog geen voedingssjablonen · maak een eerste plan"
        />

        {/* Oefeningen-database · compacte row */}
        <Link
          href="/coach/exercises"
          className="mb-[10px] grid grid-cols-[1fr_auto_14px] items-center gap-3 rounded-[18px] bg-[#474B48] px-[20px] py-[16px] hover:bg-[#4d524e] transition-colors"
        >
          <span>
            <span className="block text-[15px] font-medium tracking-[-0.005em] text-[#FDFDFE]">
              Oefeningen-database
            </span>
            <span className="mt-[3px] block text-[12px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
              Video-demos · alternatieven · muscle-tags
            </span>
          </span>
          <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.06em] text-[rgba(253,253,254,0.40)]">
            {data.exerciseCount}
          </span>
          <span className="text-[15px] leading-none text-[rgba(253,253,254,0.40)]">›</span>
        </Link>

        {/* DEZE WEEK · insight */}
        <SectionLabel>Deze week</SectionLabel>

        <div className="mb-[10px] rounded-[22px] bg-[#474B48] px-[22px] py-[20px]">
          <div className="text-[15px] font-medium tracking-[-0.005em] text-[#FDFDFE]">
            Jouw coaching
          </div>
          <div className="mt-[3px] mb-[16px] text-[12px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
            {insightSub}
          </div>
          <div className="grid grid-cols-3 gap-[10px]">
            <StatTile
              value={`${data.thisWeek.sessionsDone}`}
              small={`/${data.thisWeek.sessionsPlanned || 0}`}
              label="Sessies"
              delta={
                data.thisWeek.sessionsPlanned > 0
                  ? `${data.thisWeek.sessionsPct}% gelogd`
                  : 'nog geen sessies'
              }
              deltaWarn={false}
            />
            <StatTile
              value={`${data.thisWeek.checkinsDone}`}
              small={`/${data.thisWeek.checkinsPlanned || 0}`}
              label="Check-ins"
              delta={
                data.thisWeek.checkinsOpen > 0
                  ? `${data.thisWeek.checkinsOpen} open`
                  : data.thisWeek.checkinsPlanned > 0
                    ? 'allemaal gelezen'
                    : 'geen check-ins'
              }
              deltaWarn={data.thisWeek.checkinsOpen > 0}
            />
            <StatTile
              value={data.thisWeek.newClientsWeek > 0 ? `+${data.thisWeek.newClientsWeek}` : '0'}
              small={null}
              label="Nieuw"
              delta="deze week"
              deltaWarn={false}
            />
          </div>
        </div>

        {/* ACCOUNT */}
        <SectionLabel>Account</SectionLabel>

        <div className="mb-[10px] overflow-hidden rounded-[18px] bg-[#474B48]">
          <SetRow
            href="/coach/profile"
            label="Profiel"
            value={data.coach.fullName}
            icon={<IconProfile />}
          />
          <SetRow
            href="/coach/billing"
            label="Facturatie"
            value={data.coach.tierLabel}
            icon={<IconBilling />}
          />
          <SetRow
            href="/coach/ai-settings"
            label="Integraties"
            value={data.coach.integrationsLabel}
            icon={<IconIntegrations />}
          />
          <SetRow
            href="/coach/schedule"
            label="Beschikbaarheid"
            value={data.coach.availabilityLabel}
            icon={<IconClock />}
          />
          <SetRow
            href="/coach/resources"
            label="Hulp & support"
            value=""
            icon={<IconHelp />}
            last
          />
        </div>

        {/* Footer signature */}
        <div className="py-[18px] text-center text-[11px] tracking-[0.12em] text-[rgba(253,253,254,0.40)]">
          MŌVE · v1.0 · coach
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-[26px] mb-[10px] flex items-baseline justify-between px-[2px] text-[11px] uppercase tracking-[0.18em] text-[rgba(253,253,254,0.40)] first-of-type:mt-[8px]">
      <span>{children}</span>
    </div>
  )
}

function LibraryCard({
  title,
  total,
  rows,
  rowHref,
  viewAllHref,
  newHref,
  emptyLabel,
}: {
  title: string
  total: number
  rows: TemplateRow[]
  rowHref: (row: TemplateRow) => string
  viewAllHref: string
  newHref: string
  emptyLabel: string
}) {
  return (
    <div className="mb-[10px] rounded-[22px] bg-[#474B48] pt-[18px] pb-[8px] px-[4px]">
      <div className="flex items-baseline justify-between border-b border-[rgba(253,253,254,0.08)] px-[18px] pb-[14px]">
        <span className="text-[16px] font-medium tracking-[-0.005em] text-[#FDFDFE]">{title}</span>
        <span className="text-[12px] tracking-[0.02em] text-[rgba(253,253,254,0.62)]">
          <strong className="font-medium text-[#FDFDFE]">{total}</strong>{' '}
          {total === 1 ? 'template' : 'templates'}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="px-[18px] py-[20px] text-[12.5px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
          {emptyLabel}
        </div>
      ) : (
        rows.map((row, i) => (
          <Link
            key={row.id}
            href={rowHref(row)}
            className={`grid grid-cols-[1fr_auto_14px] items-center gap-3 px-[18px] py-[12px] hover:bg-[rgba(253,253,254,0.03)] transition-colors ${
              i < rows.length - 1 ? 'border-b border-[rgba(253,253,254,0.08)]' : ''
            }`}
          >
            <span className="min-w-0">
              <span className="block text-[14px] font-medium leading-[1.2] tracking-[-0.005em] text-[#FDFDFE]">
                {row.name}
              </span>
              <span className="mt-[3px] block text-[11.5px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
                {row.meta}
              </span>
            </span>
            <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.06em] text-[rgba(253,253,254,0.40)]">
              {row.usageLabel}
            </span>
            <span className="text-[15px] leading-none text-[rgba(253,253,254,0.40)]">›</span>
          </Link>
        ))
      )}
      <div className="flex items-center justify-between px-[18px] pt-[8px] pb-[12px]">
        {total > rows.length ? (
          <Link
            href={viewAllHref}
            className="py-[6px] text-[12.5px] font-medium tracking-[0.01em] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE]"
          >
            Bekijk alle {total} ›
          </Link>
        ) : (
          <Link
            href={viewAllHref}
            className="py-[6px] text-[12.5px] font-medium tracking-[0.01em] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE]"
          >
            Alles bekijken ›
          </Link>
        )}
        <Link
          href={newHref}
          className="rounded-full bg-[rgba(253,253,254,0.06)] px-[14px] py-[6px] text-[12px] font-medium tracking-[0.01em] text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.10)]"
        >
          + Nieuw
        </Link>
      </div>
    </div>
  )
}

function NutritionLibraryCard({
  title,
  total,
  rows,
  viewAllHref,
  newHref,
  emptyLabel,
}: {
  title: string
  total: number
  rows: NutritionTemplateRow[]
  viewAllHref: string
  newHref: string
  emptyLabel: string
}) {
  return (
    <div className="mb-[10px] rounded-[22px] bg-[#474B48] pt-[18px] pb-[8px] px-[4px]">
      <div className="flex items-baseline justify-between border-b border-[rgba(253,253,254,0.08)] px-[18px] pb-[14px]">
        <span className="text-[16px] font-medium tracking-[-0.005em] text-[#FDFDFE]">{title}</span>
        <span className="text-[12px] tracking-[0.02em] text-[rgba(253,253,254,0.62)]">
          <strong className="font-medium text-[#FDFDFE]">{total}</strong>{' '}
          {total === 1 ? 'template' : 'templates'}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="px-[18px] py-[20px] text-[12.5px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
          {emptyLabel}
        </div>
      ) : (
        rows.map((row, i) => (
          <Link
            key={row.id}
            href={`/coach/nutrition?template=${encodeURIComponent(row.name)}`}
            className={`grid grid-cols-[1fr_auto_14px] items-center gap-3 px-[18px] py-[12px] hover:bg-[rgba(253,253,254,0.03)] transition-colors ${
              i < rows.length - 1 ? 'border-b border-[rgba(253,253,254,0.08)]' : ''
            }`}
          >
            <span className="min-w-0">
              <span className="block text-[14px] font-medium leading-[1.2] tracking-[-0.005em] text-[#FDFDFE]">
                {row.name}
              </span>
              <span className="mt-[3px] block text-[11.5px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
                {row.meta}
              </span>
            </span>
            <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.06em] text-[rgba(253,253,254,0.40)]">
              {row.usageLabel}
            </span>
            <span className="text-[15px] leading-none text-[rgba(253,253,254,0.40)]">›</span>
          </Link>
        ))
      )}
      <div className="flex items-center justify-between px-[18px] pt-[8px] pb-[12px]">
        {total > rows.length ? (
          <Link
            href={viewAllHref}
            className="py-[6px] text-[12.5px] font-medium tracking-[0.01em] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE]"
          >
            Bekijk alle {total} ›
          </Link>
        ) : (
          <Link
            href={viewAllHref}
            className="py-[6px] text-[12.5px] font-medium tracking-[0.01em] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE]"
          >
            Alles bekijken ›
          </Link>
        )}
        <Link
          href={newHref}
          className="rounded-full bg-[rgba(253,253,254,0.06)] px-[14px] py-[6px] text-[12px] font-medium tracking-[0.01em] text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.10)]"
        >
          + Nieuw
        </Link>
      </div>
    </div>
  )
}

function StatTile({
  value,
  small,
  label,
  delta,
  deltaWarn,
}: {
  value: string
  small: string | null
  label: string
  delta: string
  deltaWarn: boolean
}) {
  return (
    <div className="rounded-[12px] bg-[rgba(253,253,254,0.04)] px-[10px] py-[12px]">
      <div className="text-[24px] font-light leading-none tracking-[-0.025em] text-[#FDFDFE]">
        {value}
        {small && (
          <small className="ml-[2px] text-[11px] font-normal tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
            {small}
          </small>
        )}
      </div>
      <div className="mt-[6px] text-[10px] uppercase tracking-[0.12em] text-[rgba(253,253,254,0.40)]">
        {label}
      </div>
      <div
        className={`mt-[4px] text-[10.5px] tracking-[0.02em] ${
          deltaWarn ? 'text-[#E8A93C]' : 'text-[#C0FC01]'
        }`}
      >
        {delta}
      </div>
    </div>
  )
}

function SetRow({
  href,
  label,
  value,
  icon,
  last,
}: {
  href: string
  label: string
  value: string
  icon: React.ReactNode
  last?: boolean
}) {
  return (
    <Link
      href={href}
      className={`grid grid-cols-[30px_1fr_auto_14px] items-center gap-[14px] px-[18px] py-[14px] hover:bg-[rgba(253,253,254,0.03)] transition-colors ${
        last ? '' : 'border-b border-[rgba(253,253,254,0.08)]'
      }`}
    >
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[rgba(253,253,254,0.06)] text-[#FDFDFE]">
        {icon}
      </span>
      <span className="text-[14px] tracking-[-0.005em] text-[#FDFDFE]">{label}</span>
      <span className="whitespace-nowrap text-[12px] tracking-[0.01em] text-[rgba(253,253,254,0.62)]">
        {value}
      </span>
      <span className="text-[15px] leading-none text-[rgba(253,253,254,0.40)]">›</span>
    </Link>
  )
}

// ─── Icons ──────────────────────────────────────────────────────

function IconProfile() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

function IconBilling() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function IconIntegrations() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 2v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function IconHelp() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
  )
}
