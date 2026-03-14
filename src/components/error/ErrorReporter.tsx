'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/error-logger'

/**
 * Client component that catches and reports unhandled errors
 * Wraps the entire app to capture global error events
 */
export function ErrorReporter() {
  useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      reportError(event.error || event.message, {
        action: 'unhandled_error',
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      })
    }

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          action: 'unhandled_promise_rejection',
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }
      )
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // This component doesn't render anything
  return null
}
