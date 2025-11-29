# GitHub Actions Nightly Data Update Setup

This document explains how to set up the nightly batch job that updates horse data (races, gallops, declarations, registrations) from TJK.

## Overview

The nightly update runs via GitHub Actions at **2 AM UTC** (5 AM Turkey time) every day. It:
- Fetches new races, gallops, declarations, and registrations for all horses
- Only inserts new data (delta updates)
- Updates horse summary statistics (handicap points, earnings, etc.)

## Setup Instructions

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secret:

- **Name:** `PROD_DATABASE_URL`
- **Value:** Your production database connection string (from Supabase)

Example:
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

### 2. Verify Workflow File

The workflow file is located at `.github/workflows/nightly-data-update.yml`

It will:
- Run at 2 AM UTC daily (cron schedule)
- Install Playwright browsers
- Run the nightly update script
- Upload logs if it fails

### 3. Manual Testing

You can manually trigger the workflow:
1. Go to GitHub → Actions tab
2. Select "Nightly TJK Data Update"
3. Click "Run workflow" → "Run workflow"

Or run locally:
```bash
npm run cronjob:nightly
```

Make sure `DATABASE_URL` in your `.env` points to production for testing.

## How It Works

1. **Fetches all stablemates** with horses that have `externalRef` (TJK ID)
2. **For each horse:**
   - Fetches latest horse detail (races + registrations/declarations)
   - Fetches latest gallops
   - Compares with existing database records
   - Inserts only new data (delta updates)
   - Updates horse summary statistics

3. **Delta Updates:**
   - Races: Compares by date + race name + city
   - Gallops: Compares by date + racecourse
   - Registrations: Compares by date + city + distance + type

## Monitoring

- Check GitHub Actions tab for workflow runs
- Logs are available in the Actions run details
- Failed runs will upload logs as artifacts

## Troubleshooting

### Workflow fails with "Cannot find module"
- Make sure all dependencies are in `package.json`
- Check that `tsx` is installed (used to run TypeScript files)

### Database connection errors
- Verify `PROD_DATABASE_URL` secret is set correctly
- Check that the database URL includes connection pooling parameters if needed

### Playwright errors
- GitHub Actions automatically installs Playwright browsers
- If issues persist, check the workflow logs

### Rate limiting
- The script includes 2-second delays between horses
- If TJK blocks requests, you may need to increase delays

## Cost Considerations

- GitHub Actions provides **2,000 free minutes/month** for private repos
- Each run takes approximately 5-15 minutes depending on number of horses
- With daily runs, you'll use ~150-450 minutes/month (well within free tier)

## Alternative: External Service

If you prefer not to use GitHub Actions, you can:
1. Deploy the `services/tjk-scraper` to Railway/Render
2. Set up a cron job on that service
3. Point it to your production database

