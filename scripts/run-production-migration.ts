/**
 * Run notification queue migration in production
 * This script runs the SQL migration against the production database
 * 
 * Usage:
 *   PROD_DATABASE_URL="your-prod-url" npx tsx scripts/run-production-migration.ts
 * 
 * Or set PROD_DATABASE_URL in your environment
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

// Use PROD_DATABASE_URL if provided, otherwise fall back to DATABASE_URL
let databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('[Production Migration] Error: DATABASE_URL or PROD_DATABASE_URL must be set')
  console.error('[Production Migration] Please set PROD_DATABASE_URL environment variable')
  process.exit(1)
}

// Warn if using local database
if (!databaseUrl.includes('supabase') && !databaseUrl.includes('neon')) {
  console.warn('[Production Migration] ⚠️  WARNING: This does not look like a production database URL!')
  console.warn('[Production Migration] Make sure PROD_DATABASE_URL is set correctly')
  const confirm = process.env.FORCE_MIGRATION === 'true'
  if (!confirm) {
    console.error('[Production Migration] Set FORCE_MIGRATION=true to proceed anyway')
    process.exit(1)
  }
}

console.log(`[Production Migration] Using database: ${databaseUrl.includes('supabase') || databaseUrl.includes('neon') ? 'PRODUCTION' : 'LOCAL'}`)
console.log(`[Production Migration] Connection: ${databaseUrl.substring(0, 30)}...`)

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error', 'warn'],
})

async function runMigration() {
  try {
    console.log('[Production Migration] Reading SQL file...')
    const sql = readFileSync(
      join(process.cwd(), 'prisma/migrations/add_notification_queue.sql'),
      'utf-8'
    )

    console.log('[Production Migration] Executing SQL migration...')
    
    // Split SQL into statements (handle multi-line statements)
    const statements: string[] = []
    let currentStatement = ''
    
    for (const line of sql.split('\n')) {
      const trimmed = line.trim()
      // Skip comments
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue
      }
      
      currentStatement += line + '\n'
      
      // If line ends with semicolon, it's a complete statement
      if (trimmed.endsWith(';')) {
        const stmt = currentStatement.trim()
        if (stmt.length > 0) {
          statements.push(stmt)
        }
        currentStatement = ''
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim())
    }
    
    console.log(`[Production Migration] Found ${statements.length} statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const preview = statement.substring(0, 60).replace(/\n/g, ' ')
      
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log(`[Production Migration] ✓ [${i + 1}/${statements.length}] Executed: ${preview}...`)
      } catch (err: any) {
        // Ignore "already exists" errors
        const errorCode = err.code || err.meta?.code
        const errorMessage = err.message || err.meta?.message || ''
        
        if (
          errorMessage.includes('already exists') ||
          errorCode === '42P07' ||
          errorCode === '42710' ||
          errorCode === '23505' || // unique violation (constraint already exists)
          errorCode === '42P16' // duplicate object
        ) {
          console.log(`[Production Migration] ⚠ [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`)
        } else {
          console.error(`[Production Migration] ✗ [${i + 1}/${statements.length}] Error: ${preview}...`)
          console.error(`[Production Migration] Error code: ${errorCode}, message: ${errorMessage}`)
          throw err
        }
      }
    }

    console.log('[Production Migration] ✓ Migration completed successfully!')
    
    // Verify the table exists
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'notification_queue'`
    )
    
    if (result[0]?.count && Number(result[0].count) > 0) {
      console.log('[Production Migration] ✓ Verified: notification_queue table exists')
    } else {
      console.warn('[Production Migration] ⚠ Warning: Could not verify table existence')
    }
  } catch (error: any) {
    console.error('[Production Migration] ✗ Migration failed:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
  .then(() => {
    console.log('[Production Migration] Success!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[Production Migration] Error:', error)
    process.exit(1)
  })

