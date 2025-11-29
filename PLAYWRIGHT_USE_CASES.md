# Playwright Use Cases in Race Horse Owner Platform

## Overview

Playwright is used in this application for **two main purposes**:

1. **TJK Data Scraping** - Browser automation to fetch data from TJK (Turkish Jockey Club) website
2. **E2E Testing** - End-to-end testing of the application

---

## 1. TJK Data Scraping (Production Use)

Playwright is used to scrape data from TJK's website because:
- TJK has anti-bot protection that blocks simple HTTP requests
- Some endpoints return server-side rendered HTML (not JSON APIs)
- A real browser bypasses these protections

### Use Case 1: Horse List Import (Primary Use)
**File:** `lib/tjk-api.ts` → `searchTJKHorsesPlaywright()`
**API Route:** `app/api/tjk/horses/route.ts`
**User Flow:** Onboarding → Import Horses page

**What it does:**
- Fetches all horses owned by a specific owner from TJK
- Navigates to TJK horse search page
- Fills owner search field (Select2 dropdown)
- Handles pagination (fetches all pages, up to 1000 horses)
- Extracts: horse name, year of birth, gender, status, external ID, sire, dam
- Filters out dead horses (Öldü)

**When it runs:**
- During owner onboarding when importing horses
- When adding new horses via "Add Horse" modal

**Performance:** ~5-10 seconds per request

**Status:** ✅ **ACTIVELY USED** (but failing on Vercel due to browser not being bundled)

---

### Use Case 2: Horse Detail Fetching
**File:** `lib/tjk-horse-detail-scraper.ts` → `fetchTJKHorseDetail()`
**API Routes:**
- `app/api/import/horses/fetch-details/route.ts`
- `app/api/import/horses/fetch-details-stream/route.ts`
- `app/api/import/horses/fetch-details-background/route.ts`
- `app/api/horses/[id]/fetch-detail/route.ts`

**What it does:**
- Fetches detailed race history for a horse
- Extracts: race dates, positions, prize money, jockey info, handicap points
- Gets registration/declaration data (upcoming races)
- Extracts pedigree information (sire, dam, grandparents)

**When it runs:**
- After importing horses (background job)
- When user manually requests horse details
- When viewing individual horse detail page

**Performance:** ~3-5 seconds per horse

**Status:** ✅ **IMPLEMENTED** (but not working on Vercel)

---

### Use Case 3: Horse Gallops/Training Data
**File:** `lib/tjk-gallops-scraper.ts` → `fetchTJKHorseGallops()`
**API Routes:**
- `app/api/import/horses/fetch-details-stream/route.ts`
- `app/api/import/horses/fetch-details-background/route.ts`

**What it does:**
- Fetches all training/gallop records for a horse
- Extracts: training dates, distances, times, racecourse, surface, jockey

**When it runs:**
- During background horse detail fetching after import

**Performance:** ~2-3 seconds per horse

**Status:** ✅ **IMPLEMENTED** (but not working on Vercel)

---

### Use Case 4: Pedigree Data (4 Generations)
**File:** `lib/tjk-pedigree-scraper.ts` → `fetchTJKPedigree()`
**API Routes:**
- `app/api/import/horses/fetch-details-stream/route.ts`
- `app/api/import/horses/fetch-details-background/route.ts`

**What it does:**
- Fetches complete pedigree tree (4 generations)
- Extracts: sire, dam, grandparents, great-grandparents

**When it runs:**
- During background horse detail fetching after import

**Performance:** ~1-2 seconds per horse

**Status:** ✅ **IMPLEMENTED** (but not working on Vercel)

---

### Use Case 5: Owner Races Scraper
**File:** `lib/tjk-owner-races-scraper.ts` → `fetchTJKOwnerRaces()`
**API Routes:** Not currently used in production

**What it does:**
- Fetches all race data for all horses owned by an owner
- Can include registrations/declarations

**Status:** ⚠️ **IMPLEMENTED BUT NOT USED** (available for future features)

---

## 2. E2E Testing (Development/CI Use)

**File:** `e2e/owner-complete-flow.spec.ts`
**Config:** `playwright.config.ts`

**What it does:**
- Tests complete owner onboarding flow
- Tests all main features (horses, expenses, notes, etc.)
- Validates UI interactions and navigation
- Tests mobile responsiveness

**When it runs:**
- During development (`npm run test:e2e`)
- In CI/CD pipelines
- For regression testing

**Status:** ✅ **ACTIVE** (works locally, not in Vercel builds)

---

## Current Status Summary

### ✅ Working Locally
- All TJK scraping functions work when Playwright browsers are installed
- E2E tests run successfully

### ❌ Not Working on Vercel
- **Primary Issue:** Vercel serverless functions don't bundle Playwright browsers (~300MB)
- Browser binaries are installed during build but not included in function package
- All TJK scraping fails with "Executable doesn't exist" error

### 🔄 Current Workaround
- API detects browser unavailable error
- Returns graceful error message
- Users can manually add horses instead

---

## Files Using Playwright

### Production Code (TJK Scraping)
1. `lib/tjk-api.ts` - Horse list fetching
2. `lib/tjk-horse-detail-scraper.ts` - Race history & details
3. `lib/tjk-gallops-scraper.ts` - Training data
4. `lib/tjk-pedigree-scraper.ts` - Pedigree data
5. `lib/tjk-owner-races-scraper.ts` - Owner race data (unused)
6. `lib/tjk-scraper.ts` - Legacy scraper (has Playwright but uses API now)

### API Routes Using Playwright
1. `app/api/tjk/horses/route.ts` - Horse list import
2. `app/api/import/horses/fetch-details/route.ts` - Horse details
3. `app/api/import/horses/fetch-details-stream/route.ts` - Streamed details
4. `app/api/import/horses/fetch-details-background/route.ts` - Background details
5. `app/api/horses/[id]/fetch-detail/route.ts` - Manual detail fetch

### Testing Code
1. `e2e/owner-complete-flow.spec.ts` - E2E test suite
2. `playwright.config.ts` - Test configuration

---

## Dependencies

```json
{
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

---

## Solutions for Vercel

### Option 1: Upgrade to Vercel Pro
- Cost: $20/month
- Better support for larger functions
- May work with Playwright

### Option 2: Switch to Puppeteer + @sparticuz/chromium
- Designed for serverless environments
- Smaller bundle size
- Requires code changes

### Option 3: Use Alternative Hosting
- Railway (full Playwright support)
- Render (full Playwright support)
- DigitalOcean App Platform (full Playwright support)

### Option 4: Separate Playwright Service
- Run Playwright in a dedicated service (e.g., Railway)
- Call it from Vercel via API
- Best of both worlds (Vercel for frontend, Railway for scraping)

---

## Impact of Playwright Not Working

### What Still Works ✅
- Owner search (uses TJK API, not Playwright)
- Manual horse entry
- All other application features
- E2E tests (locally)

### What Doesn't Work ❌
- Automatic horse import from TJK
- Automatic horse detail fetching
- Automatic training data import
- Automatic pedigree import

### User Impact
- Users must manually enter horse information
- No automatic race history import
- No automatic training data
- More manual work for users

---

## Future Considerations

1. **Migrate to Puppeteer** - Better serverless support
2. **Separate Service** - Dedicated Playwright service
3. **Caching Layer** - Cache scraped data to reduce API calls
4. **Background Jobs** - Queue-based processing for better UX
5. **API Alternative** - If TJK releases official APIs, migrate away from scraping

