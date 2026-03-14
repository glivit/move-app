/**
 * Simple analytics module for tracking pageviews and events
 * In development: logs to console
 * Ready to connect to Vercel Analytics, Plausible, or other services later
 */

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, unknown>
  timestamp: string
}

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Track a page view
 */
export function trackPageView(path: string): void {
  const event: AnalyticsEvent = {
    name: 'pageview',
    properties: {
      path,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
    timestamp: new Date().toISOString(),
  }

  if (isDevelopment) {
    console.log('[Analytics] Page View:', event)
  }

  // TODO: Send to analytics service
  // Example for Vercel Analytics:
  // import { analytics } from '@vercel/analytics/react'
  // analytics.pageView({ path })
  //
  // Example for Plausible:
  // if (window.plausible) {
  //   window.plausible('pageview', { props: { path } })
  // }
}

/**
 * Track a custom event
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    name,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  }

  if (isDevelopment) {
    console.log('[Analytics] Event:', event)
  }

  // TODO: Send to analytics service
  // Example for Vercel Analytics:
  // import { analytics } from '@vercel/analytics/react'
  // analytics.event(name, { ...properties })
  //
  // Example for Plausible:
  // if (window.plausible) {
  //   window.plausible(name, { props: properties })
  // }
}

/**
 * Track user interaction events (clicks, form submissions, etc.)
 */
export function trackUserInteraction(action: string, target?: string, metadata?: Record<string, unknown>): void {
  trackEvent('user_interaction', {
    action,
    target,
    ...metadata,
  })
}

/**
 * Track form submission
 */
export function trackFormSubmission(formName: string, success: boolean, metadata?: Record<string, unknown>): void {
  trackEvent('form_submission', {
    formName,
    success,
    ...metadata,
  })
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(featureName: string, metadata?: Record<string, unknown>): void {
  trackEvent('feature_usage', {
    featureName,
    ...metadata,
  })
}

/**
 * Track error events
 */
export function trackError(errorName: string, errorMessage?: string, metadata?: Record<string, unknown>): void {
  trackEvent('error', {
    errorName,
    errorMessage,
    ...metadata,
  })
}
