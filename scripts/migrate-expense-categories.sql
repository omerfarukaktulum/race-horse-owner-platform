-- Migration script to update expense categories and make horseId optional
-- Run this before applying the Prisma schema changes

-- Step 1: Update existing expense categories to new values
UPDATE expenses 
SET category = 'YARIS_KAYIT_DECLARE' 
WHERE category = 'YARIS_KAYIT';

UPDATE expenses 
SET category = 'YEM_SAMAN_OT_TALAS' 
WHERE category = 'YEM_SAMAN_OT';

UPDATE expenses 
SET category = 'ILAC' 
WHERE category = 'EKSTRA_ILAC';

-- For OZEL category, we'll convert them to a default category
-- You may want to review these manually
UPDATE expenses 
SET category = 'SEYIS' 
WHERE category = 'OZEL';

-- Step 2: Alter the enum type (PostgreSQL requires creating a new enum and migrating)
-- First, add new enum values
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'YARIS_KAYIT_DECLARE';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'YEM_SAMAN_OT_TALAS';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'SIGORTA';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'MONT';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'NAL_NALBANT';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'SARAC';

-- Step 3: Make horseId nullable
ALTER TABLE expenses ALTER COLUMN "horseId" DROP NOT NULL;

-- Note: Removing old enum values requires recreating the enum type
-- This is complex and may require downtime. Consider using --accept-data-loss
-- or manually removing old enum values after ensuring no data uses them.

