# Summary: Separating Playwright Service

## ✅ What We've Done

1. **Created separate service structure** (`services/tjk-scraper/`)
   - Express.js service
   - Can be deployed to Railway/Render
   - Handles all Playwright operations

2. **Updated Vercel route** (`app/api/tjk/horses/route.ts`)
   - Now calls external service instead of running Playwright
   - No Playwright dependency in Vercel
   - Graceful fallback if service unavailable

3. **Created documentation**
   - `ARCHITECTURE_SEPARATION.md` - Architecture overview
   - `DEPLOYMENT_SEPARATION.md` - Step-by-step deployment guide
   - `services/tjk-scraper/README.md` - Service documentation

## 📋 Next Steps

### 1. Complete Service Implementation

The service skeleton is created, but needs:
- Copy Playwright functions from `lib/tjk-api.ts` to service
- Copy other scrapers (`lib/tjk-horse-detail-scraper.ts`, etc.)
- Set up Prisma client in service
- Implement cronjob update logic

### 2. Deploy Service

1. Deploy `services/tjk-scraper/` to Railway or Render
2. Get service URL
3. Add `TJK_SCRAPER_SERVICE_URL` to Vercel environment variables
4. Redeploy Vercel

### 3. Set Up Cronjob

- Configure nightly cronjob (2 AM)
- Calls `/api/tjk/update-all` endpoint
- Updates all horses in database

## 🎯 Benefits

✅ **Vercel stays lightweight** - No Playwright dependency
✅ **Playwright works reliably** - Runs on compatible hosting
✅ **Better architecture** - Separation of concerns
✅ **Cost effective** - Only ~$5-7/month for service
✅ **Scalable** - Can scale services independently

## 📝 Files Changed

- ✅ `app/api/tjk/horses/route.ts` - Now calls external service
- ✅ `services/tjk-scraper/` - New service directory
- ✅ Documentation files created

## ⚠️ Remaining Work

1. **Complete service implementation:**
   - Copy Playwright functions to service
   - Set up Prisma
   - Implement all endpoints

2. **Update other routes:**
   - `app/api/import/horses/fetch-details/route.ts`
   - `app/api/horses/[id]/fetch-detail/route.ts`
   - These also need to call external service

3. **Test end-to-end:**
   - Test initial fetch
   - Test cronjob
   - Verify database updates

## 🚀 Quick Start

1. **Deploy service to Railway:**
   ```bash
   cd services/tjk-scraper
   # Follow Railway deployment guide
   ```

2. **Add to Vercel:**
   - Environment variable: `TJK_SCRAPER_SERVICE_URL`
   - Redeploy

3. **Set up cronjob:**
   - Use Railway cronjob or external service
   - Schedule: Daily at 2 AM

That's it! The architecture is now separated and ready for deployment.

