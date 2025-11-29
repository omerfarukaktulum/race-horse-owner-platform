-- Fix Missing Indexes
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Check what notification_queue indexes exist
-- ============================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notification_queue'
ORDER BY indexname;

-- ============================================
-- 2. Create missing notification_queue indexes
-- ============================================
-- These should be created (4 total):
CREATE INDEX IF NOT EXISTS "notification_queue_status_idx" ON "notification_queue"("status");
CREATE INDEX IF NOT EXISTS "notification_queue_createdAt_idx" ON "notification_queue"("createdAt");
CREATE INDEX IF NOT EXISTS "notification_queue_horseId_idx" ON "notification_queue"("horseId");
CREATE INDEX IF NOT EXISTS "notification_queue_stablemateId_idx" ON "notification_queue"("stablemateId");

-- Verify they were created
SELECT 
    indexname,
    CASE 
        WHEN indexname IN (
            'notification_queue_status_idx',
            'notification_queue_createdAt_idx',
            'notification_queue_horseId_idx',
            'notification_queue_stablemateId_idx'
        ) THEN '✅ EXISTS'
        ELSE '⚠️ OTHER'
    END as status
FROM pg_indexes
WHERE tablename = 'notification_queue'
ORDER BY indexname;

-- ============================================
-- 3. Create composite indexes (these are critical for performance!)
-- ============================================
CREATE INDEX IF NOT EXISTS "horse_race_history_horseId_raceDate_idx" 
ON "horse_race_history"("horseId", "raceDate" DESC);

CREATE INDEX IF NOT EXISTS "horse_gallops_horseId_gallopDate_idx" 
ON "horse_gallops"("horseId", "gallopDate" DESC);

CREATE INDEX IF NOT EXISTS "horse_registrations_horseId_raceDate_idx" 
ON "horse_registrations"("horseId", "raceDate" ASC);

CREATE INDEX IF NOT EXISTS "expenses_horseId_createdAt_idx" 
ON "expenses"("horseId", "createdAt" DESC);

-- Verify composite indexes were created
SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexname IN (
            'horse_race_history_horseId_raceDate_idx',
            'horse_gallops_horseId_gallopDate_idx',
            'horse_registrations_horseId_raceDate_idx',
            'expenses_horseId_createdAt_idx'
        ) THEN '✅ CREATED'
        ELSE '⚠️ OTHER'
    END as status
FROM pg_indexes
WHERE tablename IN ('horse_race_history', 'horse_gallops', 'horse_registrations', 'expenses')
AND indexname IN (
    'horse_race_history_horseId_raceDate_idx',
    'horse_gallops_horseId_gallopDate_idx',
    'horse_registrations_horseId_raceDate_idx',
    'expenses_horseId_createdAt_idx'
)
ORDER BY tablename, indexname;

