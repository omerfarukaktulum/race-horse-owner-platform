# Supabase Setup Guide

This guide will walk you through setting up Supabase as your production database.

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with:
   - GitHub (recommended)
   - Email
   - Or Google account
4. Verify your email if needed

## Step 2: Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the project details:
   - **Name**: `race-horse-owner-platform` (or your preferred name)
   - **Database Password**: 
     - Generate a strong password (click the generate button)
     - **⚠️ IMPORTANT**: Save this password securely! You'll need it for the connection string
   - **Region**: Choose the closest region to your users
     - For Turkey: `West Europe` (France) or `Central Europe` (Germany)
   - **Pricing Plan**: Select **Free** (for now)
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be provisioned

## Step 3: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **Database** in the settings menu
3. Scroll down to **Connection string** section
4. Under **Connection pooling**, select **"Transaction"** mode
5. Copy the connection string - it will look like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
6. **Alternative**: For direct connection (not pooled), use the **"URI"** tab instead:
   ```
   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

**Note**: 
- **Pooled connection** (port 6543) is recommended for serverless/Next.js apps
- **Direct connection** (port 5432) is better for migrations and Prisma Studio

## Step 4: Update Environment Variables

### For Local Development

1. Create or update `.env.local` in your project root:
   ```bash
   # Database
   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   
   # For migrations (use direct connection)
   DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
   ```

2. **Important**: Replace:
   - `[project-ref]` with your actual project reference ID
   - `[password]` with your database password
   - `[region]` with your region (e.g., `eu-central-1`)

### For Production (Vercel/Deployment)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add or update:
   - `DATABASE_URL` - Use the pooled connection string
   - `DIRECT_URL` - Use the direct connection string (for migrations)

## Step 5: Update Prisma Schema (if needed)

Your current Prisma schema should work with Supabase, but we need to add support for connection pooling.

1. Open `prisma/schema.prisma`
2. Update the datasource to support both pooled and direct connections:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Step 6: Test the Connection

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Generate Prisma Client:
   ```bash
   npm run postinstall
   # or
   npx prisma generate
   ```

3. Test the connection:
   ```bash
   npx prisma db pull
   ```
   This should connect successfully without errors.

## Step 7: Run Migrations

1. Push your schema to Supabase:
   ```bash
   npm run db:push
   ```
   
   **OR** if you have existing migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Verify tables were created:
   ```bash
   npm run db:studio
   ```
   This opens Prisma Studio where you can see all your tables.

## Step 8: Verify Everything Works

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test a database operation (e.g., sign up, create a horse, etc.)

3. Check Supabase dashboard:
   - Go to **Table Editor** in Supabase dashboard
   - You should see all your tables
   - Verify data is being created correctly

## Step 9: Configure Supabase Settings (Optional but Recommended)

### Enable Row Level Security (RLS)

Supabase has RLS enabled by default. Since you're using Prisma and NextAuth, you might want to:

1. Go to **Authentication** → **Policies** in Supabase dashboard
2. For now, you can disable RLS on your tables if you're handling auth through NextAuth
3. Or configure RLS policies based on your user roles

### Set up Database Backups

1. Go to **Settings** → **Database**
2. Check backup settings (available on paid plans)
3. For free tier, consider manual exports periodically

## Step 10: Update Production Environment

1. **Vercel**:
   - Add `DATABASE_URL` and `DIRECT_URL` to environment variables
   - Redeploy your application

2. **Other platforms**: Update environment variables accordingly

## Troubleshooting

### Connection Issues

**Error: "Connection timeout"**
- Check if you're using the correct connection string
- Verify your IP is not blocked (Supabase free tier allows all IPs)
- Try the direct connection instead of pooled

**Error: "Password authentication failed"**
- Double-check your database password
- Make sure there are no extra spaces in the connection string

**Error: "Relation does not exist"**
- Run migrations: `npx prisma migrate deploy`
- Or push schema: `npm run db:push`

### Migration Issues

**Error: "Migration failed"**
- Use `DIRECT_URL` for migrations (not pooled connection)
- Check Prisma schema for compatibility issues
- Review migration files for errors

### Performance Issues

- Use pooled connection (`pgbouncer=true`) for application queries
- Use direct connection only for migrations and Prisma Studio
- Monitor usage in Supabase dashboard

## Next Steps

1. ✅ Database is set up and working
2. Consider setting up:
   - Supabase Storage (for file uploads)
   - Supabase Auth (optional, if you want to migrate from NextAuth)
   - Supabase Realtime (for live updates)

## Useful Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push schema changes
npm run db:push

# Open Prisma Studio
npm run db:studio

# Run migrations
npx prisma migrate deploy

# View database in Supabase
# Go to: https://supabase.com/dashboard/project/[project-ref]/editor
```

## Support

- Supabase Docs: https://supabase.com/docs
- Prisma + Supabase: https://supabase.com/docs/guides/integrations/prisma
- Discord: https://discord.supabase.com

