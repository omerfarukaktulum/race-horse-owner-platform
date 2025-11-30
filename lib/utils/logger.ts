/**
 * Environment-aware logging utility
 * In production, only errors are logged
 * In development, all logs are shown
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Info logs - only shown in development
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args)
    }
  },

  /**
   * Warning logs - shown in all environments
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
    // TODO: In production, send to logging service (e.g., Sentry, LogRocket)
  },

  /**
   * Error logs - always shown, should be sent to error tracking in production
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
    // TODO: In production, send to error tracking service (e.g., Sentry)
  },

  /**
   * API request logs - only in development
   */
  api: (method: string, path: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[API ${method}]`, path, ...args)
    }
  },
}

