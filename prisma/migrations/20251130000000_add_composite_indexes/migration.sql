-- Add composite indexes for common query patterns

-- HorseRaceHistory: (horseId, raceDate) for efficient queries filtering by horse and sorting by date
CREATE INDEX IF NOT EXISTS "horse_race_history_horseId_raceDate_idx" ON "horse_race_history"("horseId", "raceDate" DESC);

-- HorseGallop: (horseId, gallopDate) for efficient queries filtering by horse and sorting by date
CREATE INDEX IF NOT EXISTS "horse_gallops_horseId_gallopDate_idx" ON "horse_gallops"("horseId", "gallopDate" DESC);

-- HorseRegistration: (horseId, raceDate) for efficient queries filtering by horse and sorting by date
CREATE INDEX IF NOT EXISTS "horse_registrations_horseId_raceDate_idx" ON "horse_registrations"("horseId", "raceDate" ASC);

-- Expense: (horseId, createdAt) for efficient queries filtering by horse and sorting by creation date
CREATE INDEX IF NOT EXISTS "expenses_horseId_createdAt_idx" ON "expenses"("horseId", "createdAt" DESC);

