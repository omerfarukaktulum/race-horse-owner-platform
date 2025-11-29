# Migration Instructions: Add Data Fetch Status

## Run the Migration

You need to add the new fields to your database. Run this SQL:

```sql
ALTER TABLE "stablemates" 
ADD COLUMN IF NOT EXISTS "dataFetchStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "dataFetchStartedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "dataFetchCompletedAt" TIMESTAMP;
```

### Option 1: Using psql
```bash
psql $DATABASE_URL -c "ALTER TABLE stablemates ADD COLUMN IF NOT EXISTS \"dataFetchStatus\" TEXT DEFAULT 'PENDING', ADD COLUMN IF NOT EXISTS \"dataFetchStartedAt\" TIMESTAMP, ADD COLUMN IF NOT EXISTS \"dataFetchCompletedAt\" TIMESTAMP;"
```

### Option 2: Using Prisma Studio or your database client
Just run the SQL above directly in your database.

## How Completion Detection Works

The system knows data fetching is finished through this logic:

1. **Start**: When background fetch begins
   - Status set to `IN_PROGRESS`
   - `dataFetchStartedAt` timestamp recorded

2. **Processing**: Loop through all horses
   - For each horse: Fetch races, gallops, pedigree, etc.
   - Continue even if one horse fails (error handling)

3. **Completion Detection**: After the `for` loop finishes
   - The code reaches line 342: `console.log('[Background Fetch] Completed processing all horses')`
   - This means ALL horses in the array have been processed
   - Status set to `COMPLETED`
   - `dataFetchCompletedAt` timestamp recorded

4. **Error Handling**: If fatal error occurs
   - Status set to `FAILED`
   - `dataFetchCompletedAt` timestamp recorded (to show when it failed)

### Key Point
The completion is detected when the `for (const horse of horses)` loop completes - meaning all horses have been processed (successfully or with errors). The status is updated AFTER the loop, not during it.

