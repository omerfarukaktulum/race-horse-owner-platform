-- ============================================
-- Truncate Database Script
-- ============================================
-- This script truncates all tables in the database
-- Use with caution! All data will be permanently deleted.
-- ============================================

-- Disable triggers and constraints temporarily
SET session_replication_role = 'replica';

-- Truncate tables in order (respecting foreign key dependencies)
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE horses CASCADE;
TRUNCATE TABLE stablemates CASCADE;
TRUNCATE TABLE racecourses CASCADE;
TRUNCATE TABLE farms CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE owner_profiles CASCADE;
TRUNCATE TABLE trainer_profiles CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-enable triggers and constraints
SET session_replication_role = 'origin';

-- Display completion message
SELECT 'Database truncated successfully! All tables are now empty.' AS status;

