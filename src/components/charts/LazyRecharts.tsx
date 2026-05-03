'use client'

/**
 * Lazy-loaded recharts wrappers.
 *
 * Recharts is ~336 kB minified. Voorheen werd hij statisch geïmporteerd op
 * `progress-report`, `stats` en `exercises/[id]` — dat resulteerde in 3×
 * gedupliceerde chunks (~1 MB) in de bundle (perf-report B1).
 *
 * Nu importeren die pagina's via deze module. `next/dynamic` met `ssr: false`
 * splitst recharts naar één gedeelde async-chunk die pas laadt wanneer een
 * chart-pagina open gaat.
 */

import dynamic from 'next/dynamic'

const loadingFallback = () => (
  <div
    aria-busy="true"
    aria-label="Grafiek laden"
    style={{
      width: '100%',
      height: 240,
      borderRadius: 14,
      background: 'rgba(28,30,24,0.04)',
    }}
  />
)

// Container — nodig om kinderen op viewport-grootte te schalen.
export const ResponsiveContainer = dynamic(
  () => import('recharts').then((m) => ({ default: m.ResponsiveContainer })),
  { ssr: false, loading: loadingFallback },
) as unknown as typeof import('recharts').ResponsiveContainer

// Charts
export const AreaChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.AreaChart })),
  { ssr: false },
) as unknown as typeof import('recharts').AreaChart

export const LineChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.LineChart })),
  { ssr: false },
) as unknown as typeof import('recharts').LineChart

export const BarChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.BarChart })),
  { ssr: false },
) as unknown as typeof import('recharts').BarChart

// Series
export const Area = dynamic(
  () => import('recharts').then((m) => ({ default: m.Area })),
  { ssr: false },
) as unknown as typeof import('recharts').Area

export const Line = dynamic(
  () => import('recharts').then((m) => ({ default: m.Line })),
  { ssr: false },
) as unknown as typeof import('recharts').Line

export const Bar = dynamic(
  () => import('recharts').then((m) => ({ default: m.Bar })),
  { ssr: false },
) as unknown as typeof import('recharts').Bar

// Axes / grid / labels
export const XAxis = dynamic(
  () => import('recharts').then((m) => ({ default: m.XAxis })),
  { ssr: false },
) as unknown as typeof import('recharts').XAxis

export const YAxis = dynamic(
  () => import('recharts').then((m) => ({ default: m.YAxis })),
  { ssr: false },
) as unknown as typeof import('recharts').YAxis

export const CartesianGrid = dynamic(
  () => import('recharts').then((m) => ({ default: m.CartesianGrid })),
  { ssr: false },
) as unknown as typeof import('recharts').CartesianGrid

export const Tooltip = dynamic(
  () => import('recharts').then((m) => ({ default: m.Tooltip })),
  { ssr: false },
) as unknown as typeof import('recharts').Tooltip

export const Legend = dynamic(
  () => import('recharts').then((m) => ({ default: m.Legend })),
  { ssr: false },
) as unknown as typeof import('recharts').Legend

export const ReferenceLine = dynamic(
  () => import('recharts').then((m) => ({ default: m.ReferenceLine })),
  { ssr: false },
) as unknown as typeof import('recharts').ReferenceLine
