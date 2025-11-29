# Run Migration: Add Data Fetch Status Fields

## Error
The error `Unknown field 'dataFetchStatus'` means the database doesn't have the new fields yet.

## Solution

Run this SQL in your database:

```sql
ALTER TABLE "stablemates" 
ADD COLUMN IF NOT EXISTS "dataFetchStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "dataFetchStartedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "dataFetchCompletedAt" TIMESTAMP;
```

### Option 1: Using psql (if DATABASE_URL is a connection string)
```bash
psql "$DATABASE_URL" -c "ALTER TABLE stablemates ADD COLUMN IF NOT EXISTS \"dataFetchStatus\" TEXT DEFAULT 'PENDING', ADD COLUMN IF NOT EXISTS \"dataFetchStartedAt\" TIMESTAMP, ADD COLUMN IF NOT EXISTS \"dataFetchCompletedAt\" TIMESTAMP;"
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project
2. Open SQL Editor
3. Paste the SQL above
4. Run it

### Option 3: Using Prisma Studio
1. Open your database client
2. Run the SQL directly

## After Migration

1. Restart your dev server
2. The status tracking will start working
3. Admin users page will show data fetch status

## Note

The code handles missing fields gracefully (won't crash), but status won't be tracked until migration is run.

