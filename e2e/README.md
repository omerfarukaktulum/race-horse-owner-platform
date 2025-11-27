# End-to-End Testing with Playwright

This directory contains comprehensive end-to-end tests for the Race Horse Owner Platform.

## Test Suite

### `owner-complete-flow.spec.ts`
A comprehensive test that covers the complete owner journey from registration to using all features:

1. **Registration** - Owner account creation
2. **Onboarding Flow**:
   - Owner lookup and selection
   - Stablemate (Eküri) setup
   - Horse import
   - Location assignment
3. **Dashboard** - Home page verification
4. **Horses Management**:
   - Horses listing page
   - Add horse modal
   - Individual horse detail page
   - Horse tabs (info, races, expenses, notes, etc.)
5. **Expenses**:
   - Add expense modal
   - Expenses listing page
6. **Notes** - Notes page
7. **Stablemate Management**:
   - Add trainer modal
   - Change trainer modal
8. **Statistics** - Statistics page with charts
9. **Account Settings** - Profile and notification settings
10. **Navigation** - All main navigation links
11. **Mobile Responsiveness** - Mobile viewport testing

## Running Tests

### Prerequisites
1. Ensure the database is set up and migrations are run
2. Make sure the development server can start (dependencies installed)

### Run Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Environment Variables

The tests use the default `http://localhost:3000` base URL. To change this, set the `BASE_URL` environment variable:

```bash
BASE_URL=http://localhost:3001 npm run test:e2e
```

Or update `playwright.config.ts`:

```typescript
use: {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
}
```

## Test Configuration

The Playwright configuration is in `playwright.config.ts` at the root of the project.

### Key Settings:
- **Test Directory**: `./e2e`
- **Base URL**: `http://localhost:3000` (or from env)
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: Only on failure
- **Trace**: On first retry
- **Web Server**: Automatically starts `npm run dev` before tests

## Test Structure

Each test:
1. Generates a unique email for registration
2. Goes through the complete onboarding flow
3. Tests all major features and pages
4. Verifies navigation and UI elements
5. Tests mobile responsiveness
6. Cleans up after completion

## Writing New Tests

### Example Test Structure:

```typescript
import { test, expect } from '@playwright/test';

test('My new test', async ({ page }) => {
  // Navigate
  await page.goto('/my-page');
  
  // Interact
  await page.click('button');
  await page.fill('input', 'value');
  
  // Assert
  await expect(page).toHaveURL(/.*my-page/);
  await expect(page.locator('h1')).toContainText('Expected Text');
});
```

### Best Practices:

1. **Use data-testid attributes** when possible for more reliable selectors
2. **Wait for navigation** after clicks that trigger navigation
3. **Use `waitForTimeout` sparingly** - prefer `waitForLoadState` or element visibility
4. **Generate unique test data** (emails, names, etc.) to avoid conflicts
5. **Clean up** test data after tests complete

## Debugging Tests

### Visual Debugging:
```bash
npm run test:e2e:ui
```

### Step-by-step Debugging:
```bash
npm run test:e2e:debug
```

### Screenshots and Videos:
- Screenshots are automatically saved on failure
- Videos can be enabled in `playwright.config.ts`:
  ```typescript
  use: {
    video: 'on-first-retry',
  }
  ```

## CI/CD Integration

For CI/CD, add to your workflow:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```

## Troubleshooting

### Tests fail with "Target closed"
- The dev server might not be running
- Check that port 3000 is available
- Increase timeout in `playwright.config.ts`

### Tests are flaky
- Add more explicit waits
- Use `waitForLoadState('networkidle')`
- Check for race conditions in your app

### Selectors not found
- Use Playwright's codegen tool: `npx playwright codegen http://localhost:3000`
- Check if elements are in iframes or shadow DOM
- Verify elements are visible (not hidden by CSS)

## Test Coverage

The current test suite covers:
- ✅ User registration and authentication
- ✅ Complete onboarding flow
- ✅ All main pages and navigation
- ✅ CRUD operations (view, add, modify)
- ✅ Modal interactions
- ✅ Form submissions
- ✅ Mobile responsiveness
- ✅ Navigation and routing

## Future Enhancements

- [ ] Add tests for trainer flow
- [ ] Add tests for admin features
- [ ] Add API mocking for external services
- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add accessibility testing



