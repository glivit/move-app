/**
 * Lightweight error logging utility
 * In development: logs to console
 * Can be extended to send to external service (Sentry, etc.) later
 */

export interface ErrorContext {
  userId?: string
  path?: string
  action?: string
  severity?: 'error' | 'warning' | 'info'
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface ErrorLog {
  timestamp: string
  message: string
  stack?: string
  context?: ErrorContext
  severity: 'error' | 'warning' | 'info'
}

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Report an error with optional context
 */
export function reportError(error: Error | string, context?: ErrorContext): void {
  const message = typeof error === 'string' ? error : error.message
  const stack = error instanceof Error ? error.stack : undefined
  const severity: 'error' | 'warning' | 'info' = context?.severity || 'error'

  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message,
    stack,
    context,
    severity,
  }

  // Log to console in development
  if (isDevelopment) {
    const prefix = `[${severity.toUpperCase()}] ${message}`
    if (severity === 'error') {
      console.error(prefix, context || '', stack || '')
    } else if (severity === 'warning') {
      console.warn(prefix, context || '', stack || '')
    } else {
      console.log(prefix, context || '', stack || '')
    }
  }

  // TODO: Send to external service (Sentry, LogRocket, etc.)
  // Example:
  // if (!isDevelopment && externalLogger) {
  //   externalLogger.captureException(error, { tags: context })
  // }
}

/**
 * Report a warning
 */
export function reportWarning(message: string, context?: ErrorContext): void {
  reportError(message, { ...context, severity: 'warning' })
}

/**
 * Report an info message
 */
export function reportInfo(message: string, context?: ErrorContext): void {
  reportError(message, { ...context, severity: 'info' })
}

/**
 * Wrap an async function with error handling
 */
export async function withErrorHandler<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'An error occurred',
  context?: ErrorContext
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), {
      ...context,
      action: 'async_operation',
    })
    return null
  }
}

/**
 * Wrap a sync function with error handling
 */
export function withErrorHandlerSync<T>(
  fn: () => T,
  errorMessage: string = 'An error occurred',
  context?: ErrorContext
): T | null {
  try {
    return fn()
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), {
      ...context,
      action: 'sync_operation',
    })
    return null
  }
}
