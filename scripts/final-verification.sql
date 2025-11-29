-- Final Verification - All Migrations
-- Run this to confirm everything is in place

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
AND indexname IN (
    'notification_queue_status_idx',
    'notification_queue_createdAt_idx',
    'notification_queue_horseId_idx',
    'notification_queue_stablemateId_idx'
)

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

