# Database Migration Strategy

## Overview

Database migrations are automatically executed during Vercel deployments via the `prebuild` script. We use Supabase's **transaction pooler** (pooled connection) which supports DDL operations, so no direct connection is needed.

## How It Works

1. **During Vercel Build**: The `prebuild` script runs before `next build`
2. **Migration Execution**: `npx prisma migrate deploy` applies pending migrations using pooled connection
3. **Automatic**: No manual intervention needed - migrations run with every deployment
4. **Build Safety**: If migrations fail, the build fails - this prevents deploying with broken migrations

## Prerequisites

### Vercel Environment Variables

Make sure this is set in your Vercel project settings:

- `DATABASE_URL` - Pooled connection string (transaction mode)

**Important**: We use Supabase's **transaction pooler** (port 6543) which supports DDL operations like migrations. No direct connection needed!

### Supabase Connection Strings

**Transaction Pooler (DATABASE_URL)**:
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Note**: Use the **Transaction** mode connection string from Supabase (not Session mode). Transaction mode supports DDL operations like migrations.

## Migration Process

### Automatic (Recommended)

Migrations run automatically during Vercel deployments:

1. Push code to GitHub (including migration files)
2. Vercel triggers build
3. `prebuild` script runs: `npx prisma generate && npx prisma migrate deploy`
4. Migrations are applied to production database using pooled connection
5. Build continues

### Manual (If Needed)

If you need to run migrations manually:

**Option 1: Via GitHub Actions**
- Go to Actions → "Run Production Migration"
- Click "Run workflow"
- This uses the same process but can be triggered independently

**Option 2: Via Supabase SQL Editor**
- Copy migration SQL from `prisma/migrations/[migration-name]/migration.sql`
- Run in Supabase SQL Editor
- Useful for debugging or applying specific migrations

**Option 3: Local (with production connection)**
```bash
export DATABASE_URL="your-prod-connection"
export DIRECT_URL="your-prod-direct-connection"
npx prisma migrate deploy
```

## Troubleshooting

### Migration Fails During Build

**Symptoms**: Build fails with migration errors

**This is expected behavior** - the build intentionally fails if migrations fail to prevent deploying with broken database state.

**Solutions**:
1. Check Vercel build logs for specific error message
2. Verify `DATABASE_URL` is set in Vercel environment variables
3. Ensure you're using **Transaction** mode connection string (not Session mode)
4. Test migration locally with production connection:
   ```bash
   export DATABASE_URL="your-prod-pooled-connection"
   npx prisma migrate deploy
   ```
5. If migration has issues, apply manually via Supabase SQL Editor first
6. Once fixed, push again and build will succeed

### Migrations Not Running

**Symptoms**: New migrations exist but aren't applied

**Check**:
1. Verify `DIRECT_URL` is set in Vercel
2. Check build logs - migrations should appear in `prebuild` step
3. Verify migration files exist in `prisma/migrations/`
4. Check if `_prisma_migrations` table exists (if using `db push`, it won't)

### Connection Issues

**Error**: "Connection timeout" or "Connection refused"

**Solutions**:
1. Verify `DIRECT_URL` uses direct connection (port 5432, not 6543)
2. Check Supabase project is not paused
3. Verify connection string format is correct
4. Check IP restrictions in Supabase (if any)

## Best Practices

1. **Always test migrations locally** before pushing
2. **Review migration SQL** before committing
3. **Use transactions** - Prisma migrations are transactional by default
4. **Backup before major migrations** - Use Supabase backup feature
5. **Monitor build logs** - Check that migrations complete successfully

## Verification

After deployment, verify migrations were applied:

```sql
-- Run in Supabase SQL Editor
SELECT migration_name, started_at, finished_at 
FROM _prisma_migrations 
ORDER BY started_at DESC;
```

Or use the verification script:
```bash
# Run verification queries from scripts/verify-all-migrations.sql
```

## Rollback

If a migration causes issues:

1. **Don't modify migration files** - They're immutable
2. **Create a new migration** to fix the issue
3. **Or manually fix** via Supabase SQL Editor
4. **Document the fix** for future reference

## Related Files

- `package.json` - Contains `prebuild` script
- `prisma/migrations/` - Migration SQL files
- `prisma/schema.prisma` - Database schema
- `.github/workflows/run-production-migration.yml` - Manual migration workflow (backup)

