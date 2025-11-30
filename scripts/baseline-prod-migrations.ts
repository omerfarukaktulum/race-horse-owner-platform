/**
 * Baseline Production Migrations
 * 
 * This script marks existing migrations as applied without running them.
 * Use this when the database already has the schema but Prisma doesn't know
 * which migrations have been applied.
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const migrations = [
  '202311201200_add_notification_settings',
  '20241124_remove_note_category',
  '20251129185754_add_notification_queue',
  '20251129190612_add_cascade_delete_to_added_by_relations',
  '20251130000000_add_composite_indexes',
]

async function baselineMigrations() {
  const directUrl = process.env.PROD_DIRECT_DATABASE_URL || process.env.DIRECT_URL

  if (!directUrl) {
    console.error('❌ ERROR: PROD_DIRECT_DATABASE_URL or DIRECT_URL must be set')
    process.exit(1)
  }

  console.log('📋 Baselining production migrations...')
  console.log(`Using: ${directUrl.replace(/:[^:@]+@/, ':****@')}`)
  console.log('')

  for (const migration of migrations) {
    try {
      console.log(`✓ Marking ${migration} as applied...`)
      execSync(
        `npx prisma migrate resolve --applied ${migration}`,
        {
          env: {
            ...process.env,
            DIRECT_URL: directUrl,
            DATABASE_URL: process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || directUrl,
          },
          stdio: 'inherit',
        }
      )
      console.log(`  ✅ ${migration} baselined`)
    } catch (error) {
      console.error(`  ❌ Failed to baseline ${migration}:`, error)
      process.exit(1)
    }
  }

  console.log('')
  console.log('✅ All migrations have been baselined!')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Run: npx prisma migrate deploy')
  console.log('  2. This will apply any new migrations that come after these')
}

baselineMigrations().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

