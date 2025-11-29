-- Create enum types for notification queue
CREATE TYPE "NotificationQueueType" AS ENUM ('horseRegistered', 'horseDeclared', 'newTraining', 'newRace');
CREATE TYPE "NotificationQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- Create notification_queue table
CREATE TABLE "notification_queue" (
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
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "horses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_stablemateId_fkey" FOREIGN KEY ("stablemateId") REFERENCES "stablemates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "notification_queue_status_idx" ON "notification_queue"("status");
CREATE INDEX "notification_queue_createdAt_idx" ON "notification_queue"("createdAt");
CREATE INDEX "notification_queue_horseId_idx" ON "notification_queue"("horseId");
CREATE INDEX "notification_queue_stablemateId_idx" ON "notification_queue"("stablemateId");

