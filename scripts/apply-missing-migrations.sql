-- Script to manually apply missing migrations
-- Run this in Supabase SQL Editor if migrations are missing
-- ⚠️ Only run sections for migrations that are actually missing!

-- ============================================
-- MIGRATION 1: Notification Settings (202311201200)
-- ============================================
-- Only run if notification columns are missing
ALTER TABLE "stablemates"
ADD COLUMN IF NOT EXISTS "notifyHorseRegistered" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyHorseDeclared" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyNewTraining" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyNewExpense" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyNewNote" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyNewRace" BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- MIGRATION 2: Remove Note Category (20241124)
-- ============================================
-- Only run if category column still exists
-- First check: SELECT column_name FROM information_schema.columns WHERE table_name = 'horse_notes' AND column_name = 'category';
-- If it returns a row, then run:
-- DROP INDEX IF EXISTS "horse_notes_category_idx";
-- ALTER TABLE "horse_notes" DROP COLUMN IF EXISTS "category";

-- ============================================
-- MIGRATION 3: Notification Queue (20251129185754)
-- ============================================
-- Only run if notification_queue table doesn't exist

-- Create enum types
DO $$ BEGIN
    CREATE TYPE "NotificationQueueType" AS ENUM ('horseRegistered', 'horseDeclared', 'newTraining', 'newRace');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS "notification_queue" (
    "id" TEXT NOT NULL,
    "type" "NotificationQueueType" NOT NULL,
    "horseId" TEXT NOT NULL,
    "stablemateId" TEXT NOT NULL,
    "trainerId" TEXT,
    "data" JSONB NOT NULL,
    "status" "NotificationQueueStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_horseId_fkey" 
    FOREIGN KEY ("horseId") REFERENCES "horses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_stablemateId_fkey" 
    FOREIGN KEY ("stablemateId") REFERENCES "stablemates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_trainerId_fkey" 
    FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "notification_queue_status_idx" ON "notification_queue"("status");
CREATE INDEX IF NOT EXISTS "notification_queue_createdAt_idx" ON "notification_queue"("createdAt");
CREATE INDEX IF NOT EXISTS "notification_queue_horseId_idx" ON "notification_queue"("horseId");
CREATE INDEX IF NOT EXISTS "notification_queue_stablemateId_idx" ON "notification_queue"("stablemateId");

-- ============================================
-- MIGRATION 4: Cascade Delete (20251129190612)
-- ============================================
-- Update foreign key constraints to have ON DELETE CASCADE

-- Expenses
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_addedById_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_addedById_fkey" 
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Notes
ALTER TABLE "horse_notes" DROP CONSTRAINT IF EXISTS "horse_notes_addedById_fkey";
ALTER TABLE "horse_notes" ADD CONSTRAINT "horse_notes_addedById_fkey" 
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Illnesses
ALTER TABLE "horse_illnesses" DROP CONSTRAINT IF EXISTS "horse_illnesses_addedById_fkey";
ALTER TABLE "horse_illnesses" ADD CONSTRAINT "horse_illnesses_addedById_fkey" 
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Illness Operations
ALTER TABLE "horse_illness_operations" DROP CONSTRAINT IF EXISTS "horse_illness_operations_addedById_fkey";
ALTER TABLE "horse_illness_operations" ADD CONSTRAINT "horse_illness_operations_addedById_fkey" 
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Banned Medicines
ALTER TABLE "horse_banned_medicines" DROP CONSTRAINT IF EXISTS "horse_banned_medicines_addedById_fkey";
ALTER TABLE "horse_banned_medicines" ADD CONSTRAINT "horse_banned_medicines_addedById_fkey" 
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Training Plans
ALTER TABLE "horse_training_plans" DROP CONSTRAINT IF EXISTS "horse_training_plans_addedById_fkey";
ALTER TABLE "horse_training_plans" ADD CONSTRAINT "horse_training_plans_addedById_fkey" 
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- MIGRATION 5: Composite Indexes (20251130000000)
-- ============================================
-- Add composite indexes for performance

CREATE INDEX IF NOT EXISTS "horse_race_history_horseId_raceDate_idx" 
ON "horse_race_history"("horseId", "raceDate" DESC);

CREATE INDEX IF NOT EXISTS "horse_gallops_horseId_gallopDate_idx" 
ON "horse_gallops"("horseId", "gallopDate" DESC);

CREATE INDEX IF NOT EXISTS "horse_registrations_horseId_raceDate_idx" 
ON "horse_registrations"("horseId", "raceDate" ASC);

CREATE INDEX IF NOT EXISTS "expenses_horseId_createdAt_idx" 
ON "expenses"("horseId", "createdAt" DESC);

