# End-to-End Testing Setup

## Overview

A comprehensive Playwright E2E test suite has been created to test the complete owner flow from registration through all application features.

## What Was Created

### 1. Playwright Configuration (`playwright.config.ts`)
- Configured for Chromium browser
- Auto-starts dev server before tests
- Screenshots on failure
- Trace collection for debugging

### 2. Complete Owner Flow Test (`e2e/owner-complete-flow.spec.ts`)
A single comprehensive test that covers:

#### Registration & Onboarding
- ✅ Owner registration with unique email
- ✅ Owner lookup and selection
- ✅ Stablemate (Eküri) setup
- ✅ Horse import
- ✅ Location assignment

#### Main Features
- ✅ Dashboard/home page
- ✅ Horses listing page (filters, sort, search)
- ✅ Add horse modal
- ✅ Individual horse detail page
- ✅ All horse detail tabs (info, races, expenses, notes, statistics)
- ✅ Add expense modal
- ✅ Expenses page
- ✅ Notes page
- ✅ Stablemate management (add/change trainer modals)
- ✅ Statistics page
- ✅ Account settings
- ✅ Navigation testing
- ✅ Mobile responsiveness

### 3. Test Scripts (added to `package.json`)
- `npm run test:e2e` - Run all tests
- `npm run test:e2e:ui` - Interactive UI mode
- `npm run test:e2e:headed` - Run with visible browser
- `npm run test:e2e:debug` - Debug mode
- `npm run test:e2e:report` - View test report

### 4. Documentation
- `e2e/README.md` - Comprehensive testing guide
- `.gitignore` updated for test artifacts

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

   Or install all browsers:
   ```bash
   npx playwright install
   ```

## Running Tests

### Basic Usage

```bash
# Run all tests (headless)
npm run test:e2e
```

### Development/Debugging

```bash
# Run with visible browser
npm run test:e2e:headed

# Interactive UI mode (recommended for development)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

### View Results

```bash
# After tests complete, view HTML report
npm run test:e2e:report
```

## Test Flow

The test follows this complete journey:

1. **Registration** → Creates new owner account
2. **Onboarding** → Completes full onboarding flow
3. **Dashboard** → Verifies home page loads
4. **Horses** → Tests horses listing and management
5. **Horse Details** → Tests individual horse pages
6. **Expenses** → Tests expense management
7. **Notes** → Tests notes page
8. **Stablemate** → Tests trainer management
9. **Statistics** → Tests statistics page
10. **Settings** → Tests account settings
11. **Navigation** → Tests all navigation links
12. **Mobile** → Tests mobile responsiveness

## Test Features

### Smart Selectors
- Uses multiple selector strategies for reliability
- Handles dynamic content and loading states
- Waits for elements to be visible before interaction

### Error Handling
- Gracefully handles missing elements
- Continues testing even if optional features aren't available
- Provides detailed console logging

### Data Management
- Generates unique test emails to avoid conflicts
- Cleans up after tests complete
- Uses test isolation

## Customization

### Change Base URL

Edit `playwright.config.ts`:
```typescript
use: {
  baseURL: 'http://localhost:3001', // Your custom URL
}
```

Or use environment variable:
```bash
BASE_URL=http://localhost:3001 npm run test:e2e
```

### Add More Tests

Create new test files in `e2e/` directory:
```typescript
// e2e/my-new-test.spec.ts
import { test, expect } from '@playwright/test';

test('My new test', async ({ page }) => {
  await page.goto('/my-page');
  // Your test code
});
```

### Adjust Timeouts

Edit `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 10000, // 10 seconds
  navigationTimeout: 30000, // 30 seconds
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests fail immediately
- Ensure dev server can start: `npm run dev`
- Check database connection
- Verify all environment variables are set

### Selectors not found
- Use Playwright Inspector: `npm run test:e2e:debug`
- Check element visibility: Some elements might be hidden
- Verify page has loaded: Add `await page.waitForLoadState('networkidle')`

### Timeout errors
- Increase timeout in config
- Check if dev server is slow to respond
- Verify network requests complete

### Browser not found
```bash
npx playwright install chromium
```

## Best Practices

1. **Run tests before committing** - Catch issues early
2. **Use UI mode for development** - Easier to debug
3. **Keep tests isolated** - Each test should be independent
4. **Use data-testid** - More reliable than CSS selectors
5. **Wait for navigation** - Don't assume immediate redirects
6. **Clean up test data** - Avoid database pollution

## Next Steps

- [ ] Add tests for trainer flow
- [ ] Add tests for admin features
- [ ] Add API mocking for external services
- [ ] Add visual regression testing
- [ ] Add performance benchmarks
- [ ] Add accessibility testing

## Support

For Playwright documentation:
- https://playwright.dev/docs/intro
- https://playwright.dev/docs/api/class-test

For issues or questions, check the test logs and Playwright trace viewer.



