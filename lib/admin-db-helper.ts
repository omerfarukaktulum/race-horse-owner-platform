import { cookies } from 'next/headers'

/**
 * Get the active database URL for admin operations
 * Admin can switch between local and production databases
 * Regular users always use DATABASE_URL
 */
export function getAdminDatabaseUrl(): string {
  // Check cookie preference (works in both dev and production for admin)
  const cookieStore = cookies()
  const dbPreference = cookieStore.get('admin-db-preference')
  
  const preferenceValue = dbPreference?.value
  const hasProdDb = !!process.env.PROD_DATABASE_URL
  
  // If admin selected prod and PROD_DATABASE_URL is configured, use it
  if (preferenceValue === 'prod' && hasProdDb) {
    const prodUrl = process.env.PROD_DATABASE_URL!
    console.log('[Admin DB Helper] Using PROD_DATABASE_URL')
    return prodUrl
  }
  
  // Default to DATABASE_URL (local or default)
  const defaultUrl = process.env.DATABASE_URL || ''
  console.log('[Admin DB Helper] Using DATABASE_URL (default)')
  return defaultUrl
}

/**
 * Get the current database info for display
 */
export function getDatabaseInfo() {
  const databaseUrl = getAdminDatabaseUrl()
  
  // Check if it's Supabase (production)
  if (databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com')) {
    const match = databaseUrl.match(/postgres\.([^.]+)\.supabase\.co|pooler\.supabase\.com/)
    const projectRef = match ? match[1] : null
    return {
      type: 'production' as const,
      name: 'Supabase',
      projectRef,
      url: databaseUrl.replace(/:[^:@]+@/, ':****@'),
    }
  }
  
  // Check if it's local
  if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('postgresql://postgres:postgres@')) {
    return {
      type: 'local' as const,
      name: 'Local PostgreSQL',
      projectRef: null,
      url: databaseUrl.replace(/:[^:@]+@/, ':****@'),
    }
  }
  
  // Check for other cloud providers
  if (databaseUrl.includes('neon.tech')) {
    return {
      type: 'production' as const,
      name: 'Neon',
      projectRef: null,
      url: databaseUrl.replace(/:[^:@]+@/, ':****@'),
    }
  }
  
  // Unknown/other
  return {
    type: 'unknown' as const,
    name: 'Unknown',
    projectRef: null,
    url: databaseUrl ? databaseUrl.replace(/:[^:@]+@/, ':****@') : 'Not configured',
  }
}

