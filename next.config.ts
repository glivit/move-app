import type { NextConfig } from "next"
import { withSerwist } from "@serwist/turbopack"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fkkfnrtogosbubtfrvza.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // Tree-shake unused exports from heavy packages
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@supabase/supabase-js'],
  },
  compress: true,
  poweredByHeader: false,
}

// ─── Serwist (Service Worker) — Next 16 / Turbopack variant ──────
//
// De SW wordt geserveerd door een Route Handler op
//   /serwist/[path] → /serwist/sw.js  +  /serwist/sw.js.map
// (zie src/app/serwist/[path]/route.ts).
//
// withSerwist voegt 'esbuild' + 'esbuild-wasm' toe aan serverExternalPackages
// zodat de route handler ze kan dynamisch laden zonder dat Next ze probeert
// mee te bundelen.
//
// Custom handlers (push, notification, badge) staan in src/app/sw.ts.
// Client-side registratie gebeurt in useServiceWorker met scope '/'.
// ────────────────────────────────────────────────────────────────
export default withSerwist(nextConfig)
