# Deployment Guide: Separated Playwright Service

## Overview

This guide explains how to deploy the separated architecture:
- **Vercel**: Main app (no Playwright)
- **Railway/Render**: Playwright scraper service

## Step 1: Deploy Playwright Service

### Option A: Railway (Recommended)

1. **Create new Railway project:**
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub
   - Select your repo
   - Set root directory: `services/tjk-scraper`

2. **Environment variables:**
   ```
   DATABASE_URL=postgresql://...  # Same as Vercel
   PORT=3001
   API_KEY=your-secret-key-here
   ```

3. **Railway will:**
   - Install dependencies
   - Install Playwright browsers
   - Deploy automatically

4. **Get service URL:**
   - Railway provides: `https://your-service.railway.app`
   - Copy this URL

### Option B: Render

1. **Create new Web Service:**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect GitHub repo
   - Root directory: `services/tjk-scraper`

2. **Environment variables:**
   ```
   DATABASE_URL=postgresql://...
   PORT=3001
   API_KEY=your-secret-key-here
   ```

3. **Build command:**
   ```
   npm install && npx playwright install chromium
   ```

4. **Start command:**
   ```
   npm start
   ```

## Step 2: Update Vercel

1. **Add environment variable:**
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Add: `TJK_SCRAPER_SERVICE_URL=https://your-service.railway.app`

2. **Redeploy:**
   - Vercel will automatically redeploy
   - Or trigger manually

## Step 3: Set Up Nightly Cronjob

### Option A: Railway Cronjob

1. **Create cronjob in Railway:**
   - New Service → Cron
   - Schedule: `0 2 * * *` (2 AM daily)
   - Command: `curl -X POST https://your-service.railway.app/api/tjk/update-all -H "Content-Type: application/json" -d '{"apiKey":"your-secret-key"}'`

### Option B: External Cron Service

Use [cron-job.org](https://cron-job.org) or similar:

1. Create new cronjob
2. URL: `https://your-service.railway.app/api/tjk/update-all`
3. Method: POST
4. Body: `{"apiKey":"your-secret-key"}`
5. Schedule: Daily at 2 AM

## Step 4: Test

1. **Test initial fetch:**
   - Go through onboarding
   - Should fetch horses from external service

2. **Test cronjob:**
   - Manually trigger: `curl -X POST https://your-service.railway.app/api/tjk/update-all -H "Content-Type: application/json" -d '{"apiKey":"your-secret-key"}'`
   - Check logs for updates

## Troubleshooting

### Service not responding
- Check Railway/Render logs
- Verify DATABASE_URL is correct
- Check Playwright browsers are installed

### Vercel can't reach service
- Verify TJK_SCRAPER_SERVICE_URL is set
- Check service is publicly accessible
- Verify CORS is enabled in service

### Cronjob not running
- Check cronjob logs
- Verify API_KEY matches
- Check service is running

## Cost Estimate

### Railway
- **Free tier:** $5/month credit
- **Hobby:** $5/month (usually enough)
- Playwright service: ~$3-5/month

### Render
- **Free tier:** Limited (may not work)
- **Starter:** $7/month
- Playwright service: ~$7/month

### Total
- **Vercel:** Free (main app)
- **Playwright Service:** $5-7/month
- **Total:** ~$5-7/month

## Benefits

✅ Vercel stays fast and lightweight
✅ Playwright works reliably on Railway/Render
✅ Can scale services independently
✅ Better separation of concerns
✅ Cost-effective solution

