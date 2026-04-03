import type { NextConfig } from "next";

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
};

export default nextConfig;
