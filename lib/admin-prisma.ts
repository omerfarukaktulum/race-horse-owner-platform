import { PrismaClient } from '@prisma/client'
import { getAdminDatabaseUrl } from './admin-db-helper'

// Cache Prisma clients by database URL to avoid creating multiple instances
const prismaClients = new Map<string, PrismaClient>()

/**
 * Clear the Prisma client cache (useful when switching databases)
 */
export function clearAdminPrismaCache() {
  console.log(`[Admin Prisma] Clearing cache (${prismaClients.size} clients)`)
  // Disconnect all existing clients
  for (const [url, client] of prismaClients.entries()) {
    console.log(`[Admin Prisma] Disconnecting client for URL: ${url.substring(0, 30)}...`)
    client.$disconnect().catch((err) => {
      console.error(`[Admin Prisma] Error disconnecting client:`, err)
    })
  }
  prismaClients.clear()
  console.log('[Admin Prisma] ✅ Cache cleared - all clients disconnected and removed')
}

/**
 * Get or create a Prisma client with the admin-selected database URL
 * This allows admins to switch between local and production databases
 * Clients are cached per database URL to improve performance
 */
export function getAdminPrismaClient(): PrismaClient {
  const databaseUrl = getAdminDatabaseUrl()
  
  // Log which database we're using (without sensitive info)
  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('postgresql://postgres:postgres@')
  const isProd = databaseUrl.includes('supabase') || databaseUrl.includes('neon') || databaseUrl.includes('pooler.supabase.com')
  const dbType = isLocal ? 'LOCAL' : isProd ? 'PROD' : 'UNKNOWN'
  
  console.log(`[Admin Prisma] 🔍 Database URL analysis:`)
  console.log(`  - Type: ${dbType}`)
  console.log(`  - URL length: ${databaseUrl.length}`)
  console.log(`  - Is local: ${isLocal}`)
  console.log(`  - Is prod: ${isProd}`)
  console.log(`  - URL preview: ${databaseUrl.substring(0, 50)}...`)
  
  // Return cached client if exists
  if (prismaClients.has(databaseUrl)) {
    console.log('[Admin Prisma] ✅ Using cached client for this URL')
    return prismaClients.get(databaseUrl)!
  }
  
  console.log('[Admin Prisma] 🆕 Creating NEW Prisma client with URL')
  
  // Create new client with the selected database URL
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
  
  // Cache it
  prismaClients.set(databaseUrl, client)
  console.log(`[Admin Prisma] 💾 Cached client. Total cached clients: ${prismaClients.size}`)
  
  return client
}

/**
 * Get the default Prisma client (for non-admin routes)
 * Always uses DATABASE_URL from environment
 */
export function getDefaultPrismaClient(): PrismaClient {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }
  
  return globalForPrisma.prisma ?? new PrismaClient()
}

