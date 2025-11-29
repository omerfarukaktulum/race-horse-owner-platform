# How to Verify Migrations in Production (Supabase)

## Method 1: Check Migration History in Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this query to see all executed migrations:

```sql
SELECT 
    migration_name,
    applied_steps_count,
    started_at,
    finished_at
FROM _prisma_migrations
ORDER BY started_at DESC;
```

**Expected result**: You should see all migrations including:
- `202311201200_add_notification_settings`
- `20241124_remove_note_category`
- `20251129185754_add_notification_queue`
- `20251129190612_add_cascade_delete_to_added_by_relations`
- `20251130000000_add_composite_indexes`

## Method 2: Verify Composite Indexes Exist

Run this query to check if the composite indexes from the latest migration exist:

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'horse_race_history',
    'horse_gallops',
    'horse_registrations',
    'expenses'
)
AND indexname IN (
    'horse_race_history_horseId_raceDate_idx',
    'horse_gallops_horseId_gallopDate_idx',
    'horse_registrations_horseId_raceDate_idx',
    'expenses_horseId_createdAt_idx'
)
ORDER BY tablename, indexname;
```

**Expected result**: Should return 4 rows (one for each index)

## Method 3: Check All Indexes on Key Tables

To see all indexes (including the composite ones):

```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'horse_race_history',
    'horse_gallops',
    'horse_registrations',
    'expenses',
    'notification_queue'
)
ORDER BY tablename, indexname;
```

## Method 4: Using Prisma Migrate Status (Local)

If you have access to production DATABASE_URL locally, you can run:

```bash
# Set production DATABASE_URL (be careful!)
export DATABASE_URL="your-production-connection-string"
export DIRECT_URL="your-production-direct-connection-string"

# Check migration status
npx prisma migrate status
```

This will show:
- Which migrations have been applied
- Which migrations are pending
- Any migration issues

## Method 5: Check via Prisma Studio (Read-only)

1. Connect Prisma Studio to production (use production DATABASE_URL)
2. Check the `_prisma_migrations` table
3. Verify all migrations are listed

**⚠️ Warning**: Only use read-only access when checking production!

## Quick Verification Checklist

- [ ] `_prisma_migrations` table shows all expected migrations
- [ ] Composite indexes exist on `horse_race_history`, `horse_gallops`, `horse_registrations`, `expenses`
- [ ] `notification_queue` table exists with indexes
- [ ] No migration errors in the migration history

## If Migrations Are Missing

If you find that migrations haven't been applied:

1. **Check GitHub Actions**: Look for the "Run Production Migration" workflow run
2. **Manual Migration**: You can run migrations manually via GitHub Actions workflow (workflow_dispatch)
3. **Direct Migration**: Connect to production and run:
   ```bash
   npx prisma migrate deploy
   ```

## Common Issues

### Migration shows as applied but indexes don't exist
- The migration might have failed partway through
- Check the `finished_at` timestamp - if it's NULL, the migration didn't complete
- Re-run the migration or manually create the indexes

### Migration not in _prisma_migrations table
- Migration was never executed
- Run `npx prisma migrate deploy` to apply pending migrations

