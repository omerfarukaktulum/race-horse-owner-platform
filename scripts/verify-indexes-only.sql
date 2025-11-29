-- Simple script to verify indexes exist in production
-- Run this in Supabase SQL Editor (works even if _prisma_migrations table doesn't exist)

-- 1. Check if composite indexes exist (most important for performance)
SELECT 
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

-- Expected result: Should return 4 rows (one for each composite index)
-- If you get fewer rows, some indexes are missing

-- 2. Check all indexes on key tables (to see what exists)
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

-- 3. Quick count check - how many indexes exist on each table?
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN (
    'horse_race_history',
    'horse_gallops',
    'horse_registrations',
    'expenses'
)
GROUP BY tablename
ORDER BY tablename;

-- Expected counts (approximate):
-- horse_race_history: ~3 indexes (horseId, raceDate, composite)
-- horse_gallops: ~3 indexes (horseId, gallopDate, composite)
-- horse_registrations: ~3 indexes (horseId, raceDate, composite)
-- expenses: ~5+ indexes (horseId, addedById, date, category, composite)

