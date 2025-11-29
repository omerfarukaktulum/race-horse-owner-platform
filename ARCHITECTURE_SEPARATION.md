# Architecture: Separating Playwright Service

## Overview

**Problem:** Playwright doesn't work on Vercel serverless functions
**Solution:** Separate Playwright service that runs independently

## Architecture

```
┌─────────────────┐
│   Vercel App    │  (Main application - no Playwright)
│   (Frontend)    │
└────────┬────────┘
         │
         │ HTTP API calls
         │
         ▼
┌─────────────────┐
│  Playwright     │  (Separate service - Railway/Render)
│  Service        │  - Runs Playwright operations
│  (Backend)      │  - Handles TJK scraping
└─────────────────┘
         │
         │ Updates database
         │
         ▼
┌─────────────────┐
│   Supabase      │  (Shared database)
│   PostgreSQL    │
└─────────────────┘
```

## Use Cases

### 1. Initial Onboarding (Manual Setup)
**When:** Admin manually sets up user account
**Flow:**
1. Admin uses Playwright service to fetch horses for owner
2. Playwright service stores horses in database (linked to owner's stablemate)
3. User completes onboarding
4. User reaches import-horses page
5. Vercel queries database for pre-fetched horses (no Playwright call)
6. User selects horses to import (they're already in DB, just need to confirm/select)

### 2. Nightly Updates (Cronjob)
**When:** Once per day (e.g., 2 AM)
**Flow:**
1. Cronjob triggers Playwright service: `POST /api/tjk/update-all`
2. Playwright service:
   - Fetches all horses with `externalRef`
   - Checks for new races, gallops, declarations, registrations
   - Updates database
3. No user interaction needed

## Service Endpoints

### Playwright Service API

#### `POST /api/tjk/fetch-horses`
**Purpose:** Admin tool - Initial horse fetch during manual onboarding setup
**Request:**
```json
{
  "ownerName": "EMRAH KARAMAZI",
  "ownerRef": "7356"
}
```
**Response:**
```json
{
  "horses": [
    {
      "name": "Horse Name",
      "yob": 2020,
      "gender": "Kısrak",
      "status": "Yarışta",
      "externalRef": "12345"
    }
  ]
}
```
**Note:** This is called by admin during manual setup, not by users during onboarding.

#### `POST /api/tjk/fetch-horse-details`
**Purpose:** Fetch detailed data for a horse
**Request:**
```json
{
  "horseId": "12345",
  "horseName": "Horse Name"
}
```
**Response:**
```json
{
  "detail": { /* race history, registrations */ },
  "gallops": [ /* training data */ ],
  "pedigree": { /* family tree */ }
}
```

#### `POST /api/tjk/update-all`
**Purpose:** Nightly cronjob - update all horses
**Request:**
```json
{
  "apiKey": "SECRET_KEY" // For security
}
```
**Response:**
```json
{
  "updated": 150,
  "newRaces": 25,
  "newGallops": 40,
  "errors": []
}
```

## Implementation Plan

### Step 1: Create Separate Service
- New directory: `services/tjk-scraper/`
- Express.js or Next.js API
- Deploy to Railway/Render
- Environment variable: `DATABASE_URL` (shared with Vercel)

### Step 2: Update Vercel Routes
- ✅ `app/api/tjk/horses/route.ts` - Now queries database (horses pre-fetched by admin)
- Remove Playwright imports from Vercel (already done)
- No service URL needed for this route (it's database-only)

### Step 3: Set Up Cronjob
- Use Railway/Render cronjob or external service (cron-job.org)
- Calls Playwright service nightly
- Updates all horses in database

## Benefits

✅ **Vercel stays lightweight** - No Playwright dependency
✅ **Playwright works reliably** - Runs on compatible hosting
✅ **Better separation** - Scraping logic isolated
✅ **Scalable** - Can scale Playwright service independently
✅ **Cost effective** - Only pay for Playwright when needed

## Deployment

### Vercel (Main App)
- No Playwright
- Fast deployments
- Free tier works

### Railway/Render (Playwright Service)
- Full Playwright support
- Can run 24/7 or on-demand
- Shared database connection

