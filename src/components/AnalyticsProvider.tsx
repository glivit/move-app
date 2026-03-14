'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

/**
 * Client component that tracks page views on route changes
 * Add this to your root layout to automatically track all page navigation
 */
export function AnalyticsProvider() {
  const pathname = usePathname()

  useEffect(() => {
    // Track page view when pathname changes
    trackPageView(pathname)
  }, [pathname])

  // This component doesn't render anything
  return null
}
