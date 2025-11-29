-- Apply Missing Migrations - Step by Step with Error Checking
-- Run each section separately in Supabase SQL Editor to identify any issues

-- ============================================
-- STEP 1: Create Enum Types (Notification Queue)
-- ============================================
-- Run this first and check for errors

DO $$ BEGIN
    CREATE TYPE "NotificationQueueType" AS ENUM ('horseRegistered', 'horseDeclared', 'newTraining', 'newRace');
    RAISE NOTICE 'Created NotificationQueueType enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'NotificationQueueType enum already exists';
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
    RAISE NOTICE 'Created NotificationQueueStatus enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'NotificationQueueStatus enum already exists';
END $$;

-- Verify enums were created
SELECT typname FROM pg_type WHERE typname IN ('NotificationQueueType', 'NotificationQueueStatus');

-- ============================================
-- STEP 2: Create Notification Queue Table
-- ============================================
-- Run this after step 1

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

-- Verify table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'notification_queue';

-- ============================================
-- STEP 3: Add Foreign Key Constraints
-- ============================================
-- Run this after step 2

DO $$ BEGIN
    ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_horseId_fkey" 
    FOREIGN KEY ("horseId") REFERENCES "horses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Added horseId foreign key';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'horseId foreign key already exists';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding horseId foreign key: %', SQLERRM;
END $$;

DO $$ BEGIN
    ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_stablemateId_fkey" 
    FOREIGN KEY ("stablemateId") REFERENCES "stablemates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Added stablemateId foreign key';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'stablemateId foreign key already exists';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding stablemateId foreign key: %', SQLERRM;
END $$;

DO $$ BEGIN
    ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_trainerId_fkey" 
    FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    RAISE NOTICE 'Added trainerId foreign key';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'trainerId foreign key already exists';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding trainerId foreign key: %', SQLERRM;
END $$;

-- ============================================
-- STEP 4: Create Notification Queue Indexes
-- ============================================
-- Run this after step 3

CREATE INDEX IF NOT EXISTS "notification_queue_status_idx" ON "notification_queue"("status");
CREATE INDEX IF NOT EXISTS "notification_queue_createdAt_idx" ON "notification_queue"("createdAt");
CREATE INDEX IF NOT EXISTS "notification_queue_horseId_idx" ON "notification_queue"("horseId");
CREATE INDEX IF NOT EXISTS "notification_queue_stablemateId_idx" ON "notification_queue"("stablemateId");

-- Verify indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'notification_queue' ORDER BY indexname;

-- ============================================
-- STEP 5: Update Cascade Delete Constraints
-- ============================================
-- Run this section (all at once is fine)

-- Expenses
DO $$ BEGIN
    ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_addedById_fkey";
    ALTER TABLE "expenses" ADD CONSTRAINT "expenses_addedById_fkey" 
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Updated expenses cascade delete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating expenses: %', SQLERRM;
END $$;

-- Horse Notes
DO $$ BEGIN
    ALTER TABLE "horse_notes" DROP CONSTRAINT IF EXISTS "horse_notes_addedById_fkey";
    ALTER TABLE "horse_notes" ADD CONSTRAINT "horse_notes_addedById_fkey" 
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Updated horse_notes cascade delete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating horse_notes: %', SQLERRM;
END $$;

-- Horse Illnesses
DO $$ BEGIN
    ALTER TABLE "horse_illnesses" DROP CONSTRAINT IF EXISTS "horse_illnesses_addedById_fkey";
    ALTER TABLE "horse_illnesses" ADD CONSTRAINT "horse_illnesses_addedById_fkey" 
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Updated horse_illnesses cascade delete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating horse_illnesses: %', SQLERRM;
END $$;

-- Horse Illness Operations
DO $$ BEGIN
    ALTER TABLE "horse_illness_operations" DROP CONSTRAINT IF EXISTS "horse_illness_operations_addedById_fkey";
    ALTER TABLE "horse_illness_operations" ADD CONSTRAINT "horse_illness_operations_addedById_fkey" 
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Updated horse_illness_operations cascade delete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating horse_illness_operations: %', SQLERRM;
END $$;

-- Horse Banned Medicines
DO $$ BEGIN
    ALTER TABLE "horse_banned_medicines" DROP CONSTRAINT IF EXISTS "horse_banned_medicines_addedById_fkey";
    ALTER TABLE "horse_banned_medicines" ADD CONSTRAINT "horse_banned_medicines_addedById_fkey" 
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Updated horse_banned_medicines cascade delete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating horse_banned_medicines: %', SQLERRM;
END $$;

-- Horse Training Plans
DO $$ BEGIN
    ALTER TABLE "horse_training_plans" DROP CONSTRAINT IF EXISTS "horse_training_plans_addedById_fkey";
    ALTER TABLE "horse_training_plans" ADD CONSTRAINT "horse_training_plans_addedById_fkey" 
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    RAISE NOTICE 'Updated horse_training_plans cascade delete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating horse_training_plans: %', SQLERRM;
END $$;

-- ============================================
-- STEP 6: Create Composite Indexes
-- ============================================
-- Run this last

CREATE INDEX IF NOT EXISTS "horse_race_history_horseId_raceDate_idx" 
ON "horse_race_history"("horseId", "raceDate" DESC);

CREATE INDEX IF NOT EXISTS "horse_gallops_horseId_gallopDate_idx" 
ON "horse_gallops"("horseId", "gallopDate" DESC);

CREATE INDEX IF NOT EXISTS "horse_registrations_horseId_raceDate_idx" 
ON "horse_registrations"("horseId", "raceDate" ASC);

CREATE INDEX IF NOT EXISTS "expenses_horseId_createdAt_idx" 
ON "expenses"("horseId", "createdAt" DESC);

-- Verify indexes were created
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE indexname IN (
    'horse_race_history_horseId_raceDate_idx',
    'horse_gallops_horseId_gallopDate_idx',
    'horse_registrations_horseId_raceDate_idx',
    'expenses_horseId_createdAt_idx'
)
ORDER BY tablename, indexname;

