import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'

// Lazy load non-critical components — code-split into separate chunks
const ServiceWorkerInit = dynamic(
  () => import('@/components/ServiceWorkerInit').then(m => m.ServiceWorkerInit)
)
const OfflineIndicator = dynamic(
  () => import('@/components/OfflineIndicator').then(m => m.OfflineIndicator)
)
const InstallPrompt = dynamic(
  () => import('@/components/InstallPrompt').then(m => m.InstallPrompt)
)

// v6 — Outfit everywhere. Weights: 200 (hero numbers) · 300 (titles) · 400 (body) · 500 (active/emphasis).
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MŌVE — Transform. Perform. Endure.',
  description: 'Premium coaching platform by MŌVE, Knokke',
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-touch-icon.png',
    icon: '/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MŌVE',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'MŌVE',
    description: 'Premium coaching platform by MŌVE, Knokke',
    type: 'website',
    url: 'https://move.coaching',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'MŌVE Logo',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#EDECE3',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE" className={outfit.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MŌVE" />
        <meta name="msapplication-TileColor" content="#EDECE3" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen antialiased"
        style={{
          fontFamily: 'var(--font-sans), Outfit, sans-serif',
          background: '#EDECE3',
          color: '#1C1E18',
        }}
      >
        <ServiceWorkerInit />
        <OfflineIndicator />
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}
