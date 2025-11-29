-- Diagnostic script to identify why migrations aren't working
-- Run this in Supabase SQL Editor to check for issues

-- ============================================
-- 1. Check if tables exist that we need to reference
-- ============================================
SELECT 
    'Required Tables Check' as check_type,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables
WHERE table_name IN ('horses', 'stablemates', 'trainer_profiles', 'users', 
                      'expenses', 'horse_notes', 'horse_illnesses', 
                      'horse_banned_medicines', 'horse_training_plans',
                      'horse_race_history', 'horse_gallops', 'horse_registrations')
ORDER BY table_name;

-- ============================================
-- 2. Check current user permissions
-- ============================================
SELECT 
    current_user as database_user,
    current_database() as database_name,
    has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
    has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect;

-- ============================================
-- 3. Check if enum types already exist
-- ============================================
SELECT 
    typname as enum_name
FROM pg_type
WHERE typname IN ('NotificationQueueType', 'NotificationQueueStatus');

-- ============================================
-- 4. Check if notification_queue table exists (even partially)
-- ============================================
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'notification_queue'
ORDER BY ordinal_position;

-- ============================================
-- 5. Check existing indexes on key tables
-- ============================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('horse_race_history', 'horse_gallops', 'horse_registrations', 'expenses')
ORDER BY tablename, indexname;

-- ============================================
-- 6. Check foreign key constraints on addedById columns
-- ============================================
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('expenses', 'horse_notes', 'horse_illnesses', 
                      'horse_banned_medicines', 'horse_training_plans')
AND kcu.column_name = 'addedById'
ORDER BY tc.table_name;

