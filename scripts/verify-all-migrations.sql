-- Comprehensive migration verification script
-- Run this in Supabase SQL Editor to check if ALL migrations were applied

-- ============================================
-- MIGRATION 1: Notification Settings (202311201200)
-- ============================================
-- Check if notification preference columns exist in stablemates table
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'stablemates'
AND column_name IN (
    'notifyHorseRegistered',
    'notifyHorseDeclared',
    'notifyNewTraining',
    'notifyNewExpense',
    'notifyNewNote',
    'notifyNewRace'
)
ORDER BY column_name;

-- Expected: 6 rows (all notification columns)
-- If fewer than 6, migration 202311201200_add_notification_settings was not applied

-- ============================================
-- MIGRATION 2: Remove Note Category (20241124)
-- ============================================
-- Check if category column was removed from horse_notes
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'horse_notes'
AND column_name = 'category';

-- Expected: 0 rows (category should NOT exist)
-- If 1 row returned, migration 20241124_remove_note_category was not applied

-- ============================================
-- MIGRATION 3: Notification Queue (20251129185754)
-- ============================================
-- Check if notification_queue table exists
SELECT 
    table_name
FROM information_schema.tables
WHERE table_name = 'notification_queue';

-- Expected: 1 row (table should exist)
-- If 0 rows, migration 20251129185754_add_notification_queue was not applied

-- Check notification_queue indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notification_queue'
ORDER BY indexname;

-- Expected: 4 indexes:
-- - notification_queue_status_idx
-- - notification_queue_createdAt_idx
-- - notification_queue_horseId_idx
-- - notification_queue_stablemateId_idx

-- Check notification_queue enum types
SELECT 
    typname
FROM pg_type
WHERE typname IN ('NotificationQueueType', 'NotificationQueueStatus');

-- Expected: 2 rows (both enum types should exist)

-- ============================================
-- MIGRATION 4: Cascade Delete (20251129190612)
-- ============================================
-- Check if foreign key constraints have ON DELETE CASCADE
-- This checks the expenses table as an example
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('expenses', 'horse_notes', 'horse_illnesses', 'horse_banned_medicines', 'horse_training_plans')
AND kcu.column_name = 'addedById'
ORDER BY tc.table_name;

-- Expected: delete_rule should be 'CASCADE' for all addedById foreign keys
-- If any show 'NO ACTION' or 'RESTRICT', migration 20251129190612 was not fully applied

-- ============================================
-- MIGRATION 5: Composite Indexes (20251130000000)
-- ============================================
-- Check if composite indexes exist
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

-- Expected: 4 rows (all composite indexes should exist)
-- If fewer than 4, migration 20251130000000_add_composite_indexes was not applied

-- ============================================
-- SUMMARY QUERY
-- ============================================
-- Quick summary of what exists
SELECT 
    'Notification Settings Columns' as check_item,
    COUNT(*) as found_count,
    CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_name = 'stablemates'
AND column_name IN (
    'notifyHorseRegistered', 'notifyHorseDeclared', 'notifyNewTraining',
    'notifyNewExpense', 'notifyNewNote', 'notifyNewRace'
)

UNION ALL

SELECT 
    'Category Column Removed' as check_item,
    COUNT(*) as found_count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_name = 'horse_notes'
AND column_name = 'category'

UNION ALL

SELECT 
    'Notification Queue Table' as check_item,
    COUNT(*) as found_count,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.tables
WHERE table_name = 'notification_queue'

UNION ALL

SELECT 
    'Notification Queue Indexes' as check_item,
    COUNT(*) as found_count,
    CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_indexes
WHERE tablename = 'notification_queue'

UNION ALL

SELECT 
    'Composite Indexes' as check_item,
    COUNT(*) as found_count,
    CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_indexes
WHERE tablename IN ('horse_race_history', 'horse_gallops', 'horse_registrations', 'expenses')
AND indexname IN (
    'horse_race_history_horseId_raceDate_idx',
    'horse_gallops_horseId_gallopDate_idx',
    'horse_registrations_horseId_raceDate_idx',
    'expenses_horseId_createdAt_idx'
);

