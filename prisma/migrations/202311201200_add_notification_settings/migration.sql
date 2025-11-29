-- Add notification preference fields to stablemates table
ALTER TABLE "stablemates"
ADD COLUMN "notifyHorseRegistered" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyHorseDeclared" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyNewTraining" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyNewExpense" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyNewNote" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyNewRace" BOOLEAN NOT NULL DEFAULT true;

