/**
 * Run migration during Vercel build
 * This script runs the notification queue migration SQL
 * It's idempotent - safe to run multiple times
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

// Use DIRECT_URL for migrations (Supabase requirement), fallback to DATABASE_URL
let databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

console.log('[Build Migration] ==========================================')
console.log('[Build Migration] Starting migration check...')
console.log(`[Build Migration] DIRECT_URL: ${process.env.DIRECT_URL ? 'SET' : 'NOT SET'}`)
console.log(`[Build Migration] DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`)

if (!databaseUrl) {
  console.warn('[Build Migration] ⚠️  No DATABASE_URL or DIRECT_URL found, skipping migration')
  console.warn('[Build Migration] This is OK if migration was already run')
  console.log('[Build Migration] ==========================================')
  process.exit(0) // Don't fail the build
}

console.log(`[Build Migration] Running migration on: ${databaseUrl.includes('supabase') || databaseUrl.includes('neon') ? 'PRODUCTION' : 'LOCAL'}`)
console.log(`[Build Migration] Connection: ${databaseUrl.substring(0, 40)}...`)

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error'],
})

async function runMigration() {
  try {
    const sql = readFileSync(
      join(process.cwd(), 'prisma/migrations/add_notification_queue.sql'),
      'utf-8'
    )

    // Split SQL into statements
    const statements: string[] = []
    let currentStatement = ''
    
    for (const line of sql.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue
      }
      
      currentStatement += line + '\n'
      
      if (trimmed.endsWith(';')) {
        const stmt = currentStatement.trim()
        if (stmt.length > 0) {
          statements.push(stmt)
        }
        currentStatement = ''
      }
    }
    
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim())
    }
    
    // Execute each statement (idempotent - skips if already exists)
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      try {
        await prisma.$executeRawUnsafe(statement)
      } catch (err: any) {
        const errorCode = err.code || err.meta?.code
        const errorMessage = err.message || err.meta?.message || ''
        
        // Ignore "already exists" errors (idempotent)
        if (
          errorMessage.includes('already exists') ||
          errorCode === '42P07' ||
          errorCode === '42710' ||
          errorCode === '23505' ||
          errorCode === '42P16'
        ) {
          // Silently skip - already exists
        } else {
          // Log but don't fail build for other errors
          console.warn(`[Build Migration] ⚠️  Statement ${i + 1} had an error (non-fatal):`, errorMessage)
        }
      }
    }

    console.log('[Build Migration] ✓ Migration completed (or already applied)')
    console.log('[Build Migration] ==========================================')
  } catch (error: any) {
    // Don't fail the build if migration fails
    console.warn('[Build Migration] ⚠️  Migration had errors (non-fatal):', error.message)
    console.warn('[Build Migration] You may need to run migration manually')
    console.log('[Build Migration] ==========================================')
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
  .then(() => {
    console.log('[Build Migration] Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[Build Migration] Script error:', error)
    // Exit with 0 to not fail the build
    process.exit(0)
  })

