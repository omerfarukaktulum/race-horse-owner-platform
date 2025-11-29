-- Script to verify migrations have been executed in production
-- Run this in Supabase SQL Editor

-- Note: If _prisma_migrations table doesn't exist, you might be using db push instead of migrations
-- In that case, skip step 1 and go directly to step 2 to verify indexes

-- 1. Check which migrations have been executed (only if using prisma migrate)
-- If this fails, you're likely using db push - that's okay, just check indexes below
SELECT 
    migration_name,
    applied_steps_count,
    started_at,
    finished_at
FROM _prisma_migrations
ORDER BY started_at DESC;

-- 2. Verify composite indexes exist (from 20251130000000_add_composite_indexes migration)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'horse_race_history',
    'horse_gallops',
    'horse_registrations',
    'expenses'
)
AND indexname IN (
    'horse_race_history_horseId_raceDate_idx',
    'horse_gallops_horseId_gallopDate_idx',
    'horse_registrations_horseId_raceDate_idx',
    'expenses_horseId_createdAt_idx'
)
ORDER BY tablename, indexname;

-- 3. Check all indexes on key tables (to see what indexes exist)
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'horse_race_history',
    'horse_gallops',
    'horse_registrations',
    'expenses',
    'notification_queue'
)
ORDER BY tablename, indexname;

-- 4. Verify notification_queue indexes (from 20251129185754_add_notification_queue migration)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notification_queue'
ORDER BY indexname;

-- 5. Count total migrations executed
SELECT COUNT(*) as total_migrations FROM _prisma_migrations;

