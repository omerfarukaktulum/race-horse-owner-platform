# Playwright Implementation for TJK Horse Import

## ✅ Implemented

We've successfully implemented Playwright browser automation to bypass TJK's anti-bot protection for horse fetching.

## What Changed

### 1. **lib/tjk-api.ts**
- ✅ Added `searchTJKHorsesPlaywright()` function
- ✅ Launches headless Chrome browser
- ✅ Navigates to TJK horse search page
- ✅ Fills owner search field (Select2 dropdown)
- ✅ Submits form and waits for results
- ✅ Extracts horse data from results table
- ✅ Error handling with screenshot capture
- ✅ Proper browser cleanup

### 2. **app/api/tjk/horses/route.ts**
- ✅ Updated to use `searchTJKHorsesPlaywright()` instead of API
- ✅ Added comprehensive logging
- ✅ Graceful error handling

### 3. **app/api/auth/me/route.ts**
- ✅ Fixed to return full `ownerProfile` data (was missing before!)
- ✅ Now includes `officialName` and `officialRef` needed for horse import

### 4. **app/onboarding/import-horses/page.tsx**
- ✅ Added detailed console logging at every step
- ✅ Better loading state with user-friendly message
- ✅ Shows "5-10 seconds" estimate for Playwright
- ✅ Graceful empty state handling

### 5. **TJK_API_INTEGRATION.md**
- ✅ Updated to reflect hybrid approach
- ✅ Added Playwright documentation
- ✅ Updated performance notes
- ✅ Added deployment considerations

## How It Works

```
User reaches import-horses page
  ↓
Fetch user's ownerProfile (officialName + officialRef)
  ↓
Call /api/tjk/horses?ownerName=X&ownerRef=Y
  ↓
API launches Playwright headless Chrome
  ↓
Browser navigates to TJK website
  ↓
Fills owner search field
  ↓
Submits and waits for table
  ↓
Extracts horse data
  ↓
Returns JSON to client
  ↓
User sees horses and can select which to import
```

## Testing

### Local Development
1. Make sure Chromium is installed: `npx playwright install chromium`
2. Start dev server: `npm run dev`
3. Go through onboarding:
   - Register as owner
   - Search for "EMRAH KARAMAZI"
   - Select owner (ID: 7356)
   - Complete stablemate setup
   - **Import horses page** should now fetch real horses!

### Expected Behavior
- Loading screen shows for 5-10 seconds
- Terminal shows detailed Playwright logs:
  ```
  [TJK Playwright] Starting browser for owner ID: 7356
  [TJK Playwright] Navigating to TJK website...
  [TJK Playwright] Looking for owner search field...
  [TJK Playwright] Found Select2 container, clicking to open...
  [TJK Playwright] Typing owner name: EMRAH KARAMAZI
  [TJK Playwright] Waiting for search results...
  [TJK Playwright] Submitting search...
  [TJK Playwright] Waiting for horse results table...
  [TJK Playwright] Extracting horse data...
  [TJK Playwright] Successfully extracted X horses
  ```
- Horses appear in UI with checkboxes
- User can select and import them

### If It Fails
- Check terminal for error logs
- Playwright will try to capture screenshot
- Look for selector issues (TJK may have changed HTML structure)
- Empty state shows: "TJK'da kayıtlı atınız bulunamadı"

## Performance

- **Owner Search:** ~200-500ms (TJK API - instant)
- **Horse Import:** ~5-10 seconds (Playwright automation)
- **Total Onboarding:** ~5-15 seconds

## Deployment Notes

### ⚠️ Vercel Free Tier
- **Does NOT support Playwright**
- Serverless functions don't include Chromium
- Need: Vercel Hobby plan ($20/mo) or alternative host

### ✅ Supported Platforms
- **Railway** - Full Playwright support
- **Render** - Full Playwright support
- **DigitalOcean App Platform** - Full Playwright support
- **Heroku** - With buildpack
- **AWS Lambda** - With Playwright Lambda layer

### Requirements
- Chromium binary (~300MB)
- 512MB+ memory recommended
- 30s+ timeout for serverless functions

## Troubleshooting

### Browser Launch Fails
```bash
# Reinstall Chromium
npx playwright install chromium

# Check system dependencies (Linux)
npx playwright install-deps chromium
```

### Selectors Not Found
- TJK may have changed their HTML structure
- Update selectors in `lib/tjk-api.ts`
- Use Playwright inspector: `PWDEBUG=1 npm run dev`

### Timeout Errors
- Increase timeout in `searchTJKHorsesPlaywright()`
- Current: 30s for page load, 15s for table
- May need adjustment based on TJK response time

## Future Improvements

1. **Stealth Mode** - Add playwright-extra with stealth plugin
2. **Retry Logic** - Exponential backoff on failure
3. **Progress Updates** - WebSocket for real-time progress
4. **Caching** - Cache horse results for 1 hour
5. **Parallel Imports** - If multiple owners (co-ownership)

## Status

🟢 **READY TO TEST!**

All code is implemented and ready. Just refresh the browser and try the onboarding flow!

