# Setup Playwright Service for Local Development

## Quick Start

1. **Start the Playwright service in a separate terminal:**
   ```bash
   cd services/tjk-scraper
   npm install
   npx playwright install chromium
   npm run dev
   ```

2. **Add to your `.env.local`:**
   ```bash
   TJK_SCRAPER_SERVICE_URL=http://localhost:3001
   ```

3. **Restart your Next.js dev server**

## Verify It's Working

Check the logs when importing horses - you should see:
```
[TJK Horses API] Scraper service URL: http://localhost:3001
[TJK Horses API] Attempting to fetch from Playwright service: http://localhost:3001
```

## Note

The service needs to be able to import TypeScript files. You may need to:
- Use `tsx` or `ts-node` to run the service
- Or compile the TypeScript files first
- Or copy the Playwright functions to the service as JavaScript

