# Database Migration Strategy

## Overview

Database migrations are executed via **GitHub Actions workflow** or **manually via Supabase SQL Editor**. 

**Why not in Vercel builds?**
- Vercel build environment has connection/timeout issues with Supabase
- Migrations can hang or timeout during build
- Better to run migrations separately before deployment

## How It Works

### Recommended: GitHub Actions Workflow

1. **Create Migration**: Create migration locally with `npm run db:migrate`
2. **Push to GitHub**: Commit and push migration files
3. **Run GitHub Actions**: Manually trigger "Run Production Migration" workflow
4. **Verify**: Check workflow logs to confirm migrations succeeded
5. **Deploy**: Deploy your application (migrations are already applied)

### Alternative: Manual via Supabase SQL Editor

1. Copy migration SQL from `prisma/migrations/[migration-name]/migration.sql`
2. Run in Supabase SQL Editor
3. Verify migration was applied
4. Deploy your application

## Prerequisites

### GitHub Secrets

Make sure these are set in your GitHub repository secrets (Settings → Secrets and variables → Actions):

- `PROD_DATABASE_URL` - Pooled connection string (transaction mode)

**Note**: Use Supabase's **transaction pooler** connection string (port 6543) from Settings → Database → Connection string → Transaction mode.

### Supabase Connection Strings

**Transaction Pooler (DATABASE_URL)**:
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Note**: Use the **Transaction** mode connection string from Supabase (not Session mode). Transaction mode supports DDL operations like migrations.

## Migration Process

### Via GitHub Actions (Recommended)

1. Create migration locally: `npm run db:migrate`
2. Commit and push migration files to GitHub
3. Go to GitHub Actions → "Run Production Migration"
4. Click "Run workflow" → "Run workflow"
5. Wait for workflow to complete (check logs)
6. Deploy your application

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

### Migration Fails in GitHub Actions

**Symptoms**: GitHub Actions workflow fails or hangs

**Solutions**:
1. Check GitHub Actions logs for specific error message
2. Verify `PROD_DATABASE_URL` is set in GitHub secrets
3. Ensure you're using **Transaction** mode connection string (not Session mode)
4. Test migration locally with production connection:
   ```bash
   export DATABASE_URL="your-prod-pooled-connection"
   npx prisma migrate deploy
   ```
5. If migration has issues, apply manually via Supabase SQL Editor first
6. If connection times out, try running migration SQL directly in Supabase SQL Editor

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

