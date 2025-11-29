# TJK Scraper Service

Separate service for Playwright-based TJK scraping operations.

## Purpose

This service runs independently from the main Vercel app and handles all Playwright operations:
- Initial horse fetch during onboarding
- Horse detail fetching (races, gallops, pedigree)
- Nightly updates (cronjob)

## Deployment

**Recommended:** Railway or Render (full Playwright support)

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Install Playwright browsers:**
```bash
npx playwright install chromium
```

3. **Environment variables:**
```env
DATABASE_URL=postgresql://...  # Shared with main app
PORT=3001
API_KEY=your-secret-key  # For cronjob security
```

4. **Run:**
```bash
npm run dev  # Development
npm start    # Production
```

## API Endpoints

### `POST /api/tjk/fetch-horses`
Fetch horses for an owner (initial onboarding)

### `POST /api/tjk/fetch-horse-details`
Fetch detailed data for a horse

### `POST /api/tjk/update-all`
Nightly cronjob - update all horses

## Architecture

```
Main App (Vercel) → HTTP → This Service → Playwright → TJK → Database
```

