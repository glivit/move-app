'use client'

/**
 * Recharts re-exports — single source zodat pagina's de library niet
 * dupliceren.
 *
 * Eerdere versie had 13 separate `next/dynamic()` calls per component.
 * Bundler split die in afzonderlijke chunks die elk recharts internals
 * dupliceerden → 4× recharts in chunks ≈ 1.26 MB duplicate code.
 *
 * Nieuwe pattern: directe re-exports. `optimizePackageImports: ['recharts']`
 * in next.config.ts regelt tree-shaking; bundler dedupliceert recharts naar
 * één vendor-chunk die door alle chart-pagina's gedeeld wordt.
 *
 * Voor route-level lazy-loading: gebruik `next/dynamic` op de hele PAGE
 * component, niet per chart-component.
 */

export {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  BarChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
