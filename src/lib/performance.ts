/**
 * Performance metrics monitoring using browser's Performance API
 * Tracks Web Vitals: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)
 * In development: logs metrics to console
 * Can be extended to send to external service later
 */

export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: string
}

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Get rating for LCP (Largest Contentful Paint)
 * Good: <= 2.5s, Needs Improvement: <= 4s, Poor: > 4s
 */
function getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 2500) return 'good'
  if (value <= 4000) return 'needs-improvement'
  return 'poor'
}

/**
 * Get rating for FID (First Input Delay)
 * Good: <= 100ms, Needs Improvement: <= 300ms, Poor: > 300ms
 */
function getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 100) return 'good'
  if (value <= 300) return 'needs-improvement'
  return 'poor'
}

/**
 * Get rating for CLS (Cumulative Layout Shift)
 * Good: <= 0.1, Needs Improvement: <= 0.25, Poor: > 0.25
 */
function getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
  if (value <= 0.1) return 'good'
  if (value <= 0.25) return 'needs-improvement'
  return 'poor'
}

/**
 * Report a performance metric
 */
export function reportMetric(metric: PerformanceMetric): void {
  if (isDevelopment) {
    console.log(`[Performance] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`, metric)
  }

  // TODO: Send to analytics service
  // Example for Vercel Analytics:
  // import { analytics } from '@vercel/analytics/react'
  // analytics.web({
  //   name: metric.name,
  //   value: metric.value,
  // })
}

/**
 * Measure Largest Contentful Paint (LCP)
 */
export function measureLCP(callback?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]

      const metric: PerformanceMetric = {
        name: 'LCP',
        value: lastEntry.startTime + lastEntry.duration,
        rating: getLCPRating(lastEntry.startTime + lastEntry.duration),
        timestamp: new Date().toISOString(),
      }

      reportMetric(metric)
      if (callback) callback(metric)
    })

    observer.observe({ entryTypes: ['largest-contentful-paint'] })
  } catch (error) {
    if (isDevelopment) {
      console.warn('[Performance] Failed to measure LCP:', error)
    }
  }
}

/**
 * Measure First Input Delay (FID) using the Interaction to Next Paint API as fallback
 */
export function measureFID(callback?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const firstEntry = entries[0]

      const entry = firstEntry as any
      const fidValue = (entry.processingStart || 0) - entry.startTime
      const metric: PerformanceMetric = {
        name: 'FID',
        value: fidValue,
        rating: getFIDRating(fidValue),
        timestamp: new Date().toISOString(),
      }

      reportMetric(metric)
      if (callback) callback(metric)
    })

    observer.observe({ entryTypes: ['first-input'] })
  } catch (error) {
    if (isDevelopment) {
      console.warn('[Performance] Failed to measure FID:', error)
    }
  }
}

/**
 * Measure Cumulative Layout Shift (CLS)
 */
export function measureCLS(callback?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  try {
    let clsValue = 0

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }

      const metric: PerformanceMetric = {
        name: 'CLS',
        value: clsValue,
        rating: getCLSRating(clsValue),
        timestamp: new Date().toISOString(),
      }

      reportMetric(metric)
      if (callback) callback(metric)
    })

    observer.observe({ entryTypes: ['layout-shift'] })
  } catch (error) {
    if (isDevelopment) {
      console.warn('[Performance] Failed to measure CLS:', error)
    }
  }
}

/**
 * Measure all Web Vitals
 */
export function measureWebVitals(): void {
  measureLCP()
  measureFID()
  measureCLS()
}

/**
 * Get page load time
 */
export function getPageLoadTime(): number | null {
  if (typeof window === 'undefined' || !window.performance) {
    return null
  }

  try {
    const perfData = window.performance.timing
    return perfData.loadEventEnd - perfData.navigationStart
  } catch {
    return null
  }
}

/**
 * Get navigation timing details
 */
export function getNavigationTiming() {
  if (typeof window === 'undefined' || !window.performance) {
    return null
  }

  try {
    const perfData = window.performance.timing

    return {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ttfb: perfData.responseStart - perfData.requestStart,
      download: perfData.responseEnd - perfData.responseStart,
      domInteractive: perfData.domInteractive - perfData.navigationStart,
      domComplete: perfData.domComplete - perfData.navigationStart,
      loadComplete: perfData.loadEventEnd - perfData.navigationStart,
    }
  } catch {
    return null
  }
}
