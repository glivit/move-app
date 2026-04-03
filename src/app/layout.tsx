import type { Metadata, Viewport } from 'next'
import { Manrope, DM_Sans, DM_Mono } from 'next/font/google'
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { InstallPrompt } from '@/components/InstallPrompt'
import './globals.css'

// Force dynamic rendering — required because middleware uses auth/cookies
export const dynamic = 'force-dynamic'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
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
  themeColor: '#1A1917',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE" className={`${manrope.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MŌVE" />
        <meta name="msapplication-TileColor" content="#1A1917" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-bg text-text-primary font-body antialiased">
        <ServiceWorkerInit />
        <OfflineIndicator />
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}
