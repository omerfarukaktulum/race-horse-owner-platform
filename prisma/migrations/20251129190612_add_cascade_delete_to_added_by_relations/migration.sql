-- Add ON DELETE CASCADE to all addedBy foreign key constraints
-- This allows deleting users even when they have created expenses, notes, etc.

-- Expenses
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_addedById_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Notes
ALTER TABLE "horse_notes" DROP CONSTRAINT IF EXISTS "horse_notes_addedById_fkey";
ALTER TABLE "horse_notes" ADD CONSTRAINT "horse_notes_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Illnesses
ALTER TABLE "horse_illnesses" DROP CONSTRAINT IF EXISTS "horse_illnesses_addedById_fkey";
ALTER TABLE "horse_illnesses" ADD CONSTRAINT "horse_illnesses_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Illness Operations
ALTER TABLE "horse_illness_operations" DROP CONSTRAINT IF EXISTS "horse_illness_operations_addedById_fkey";
ALTER TABLE "horse_illness_operations" ADD CONSTRAINT "horse_illness_operations_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Banned Medicines
ALTER TABLE "horse_banned_medicines" DROP CONSTRAINT IF EXISTS "horse_banned_medicines_addedById_fkey";
ALTER TABLE "horse_banned_medicines" ADD CONSTRAINT "horse_banned_medicines_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Horse Training Plans
ALTER TABLE "horse_training_plans" DROP CONSTRAINT IF EXISTS "horse_training_plans_addedById_fkey";
ALTER TABLE "horse_training_plans" ADD CONSTRAINT "horse_training_plans_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

