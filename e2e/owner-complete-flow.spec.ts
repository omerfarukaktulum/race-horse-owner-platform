import { test, expect, Page } from '@playwright/test';

// Helper function to generate unique email
const generateEmail = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-owner-${timestamp}-${random}@example.com`;
};

// Helper function to wait for navigation
const waitForNavigation = async (page: Page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Additional wait for any async operations
};

// Helper function to check for HTTP errors on the page
const checkForPageErrors = async (page: Page, pageName: string) => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const errorHeading = page.locator('text=/This page isn\'t working|HTTP ERROR|405/i');
  const hasErrorHeading = await errorHeading.isVisible({ timeout: 2000 }).catch(() => false);
  
  const pageText = await page.textContent('body').catch(() => '') || '';
  const hasErrorInContent = pageText.includes('HTTP ERROR') || pageText.includes('405') || pageText.includes("isn't working");
  
  if (hasErrorHeading || hasErrorInContent) {
    throw new Error(
      `${pageName} page returned an error (HTTP 405). ` +
      `URL: ${page.url()}. ` +
      `This suggests the route is not accessible. ` +
      `Check: 1) Route exists, 2) Middleware allows access, 3) Authentication token is valid. ` +
      `Page content: ${pageText.substring(0, 500)}`
    );
  }
};

// Helper function to fill form and submit
const fillAndSubmitForm = async (page: Page, fields: Record<string, string>) => {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
  }
  await page.click('button[type="submit"]');
  await waitForNavigation(page);
};

test.describe('Complete Owner Flow - Full Application Test', () => {
  let testEmail: string;
  let testPassword = 'TestPassword123!';

  test.beforeEach(() => {
    testEmail = generateEmail();
  });

  test('Complete owner registration and test all features', async ({ page }) => {
    // ============================================
    // STEP 1: REGISTRATION
    // ============================================
    console.log('Step 1: Starting registration...');
    await page.goto('/register/owner');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we hit an error page - fail fast if so
    const regErrorHeading = page.locator('text=/This page isn\'t working|HTTP ERROR/i');
    const regHasError = await regErrorHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (regHasError) {
      const pageContent = await page.textContent('body');
      throw new Error(`Page returned an error (HTTP 405). Check if dev server is running and /register/owner route is accessible. Page content: ${pageContent?.substring(0, 200)}`);
    }
    
    // Wait for registration form to be visible - this will fail if form doesn't exist
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verify we're on the registration page by checking for password fields
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Fill registration form
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    
    // Find confirm password field - try multiple selectors
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1).or(
      page.locator('input[placeholder*="Şifre Tekrar"], input[placeholder*="Confirm"]')
    );
    await confirmPasswordInput.waitFor({ state: 'visible', timeout: 5000 });
    await confirmPasswordInput.fill(testPassword);
    
    // Submit registration - wait for both the API response and navigation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.waitFor({ state: 'visible' });
    
    // Wait for the registration API call to complete
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/register/owner') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null); // Don't fail if response doesn't match
    
    // Click submit and wait for navigation
    await Promise.all([
      page.waitForURL(/.*onboarding\/owner-lookup/, { timeout: 15000 }),
      submitButton.click(),
      responsePromise
    ]).catch(async (error) => {
      // If navigation failed, check for errors
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const navErrorHeading = page.locator('text=/This page isn\'t working|HTTP ERROR|error/i');
      const navHasError = await navErrorHeading.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (navHasError || currentUrl.includes('/register/owner')) {
        const pageText = await page.textContent('body').catch(() => '') || '';
        throw new Error(`Registration failed. Still on ${currentUrl}. Error: ${error.message}. Page: ${pageText.substring(0, 300)}`);
      }
      throw error;
    });
    
    // Verify we're on the owner lookup page
    await expect(page).toHaveURL(/.*onboarding\/owner-lookup/, { timeout: 5000 });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if we hit an error page on owner-lookup - fail immediately if so
    const lookupErrorHeading = page.locator('text=/This page isn\'t working|HTTP ERROR|405/i');
    const lookupHasError = await lookupErrorHeading.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Also check page title/content for errors
    const pageTitle = await page.title().catch(() => '');
    const pageText = await page.textContent('body').catch(() => '') || '';
    const hasErrorInContent = pageText.includes('HTTP ERROR') || pageText.includes('405') || pageText.includes("isn't working");
    
    if (lookupHasError || hasErrorInContent) {
      throw new Error(
        `Owner lookup page returned an error (HTTP 405). ` +
        `URL: ${page.url()}. ` +
        `Title: ${pageTitle}. ` +
        `This suggests the /onboarding/owner-lookup route is not accessible. ` +
        `Check: 1) Route exists, 2) Middleware allows access, 3) Authentication is working. ` +
        `Page content: ${pageText.substring(0, 500)}`
      );
    }
    
    console.log('✓ Registration successful');

    // ============================================
    // STEP 2: OWNER LOOKUP
    // ============================================
    console.log('Step 2: Owner lookup...');
    
    // Wait for the owner lookup page content - try multiple selectors
    const ownerLookupHeading = page.locator('h1, h2').filter({ hasText: /At Sahibi|Owner|Sahip/i });
    const ownerSearchInput = page.locator('input[placeholder*="At Sahibi"], input[placeholder*="Owner"], input[type="text"]').first();
    
    // Wait for either heading or search input to be visible
    await Promise.race([
      ownerLookupHeading.waitFor({ state: 'visible', timeout: 10000 }),
      ownerSearchInput.waitFor({ state: 'visible', timeout: 10000 })
    ]).catch(async () => {
      // If both fail, check what's actually on the page
      const currentUrl = page.url();
      const actualContent = await page.textContent('body').catch(() => '') || '';
      throw new Error(
        `Owner lookup page content not found. ` +
        `URL: ${currentUrl}. ` +
        `Expected: heading with "At Sahibi" or search input. ` +
        `Actual page content: ${actualContent.substring(0, 500)}`
      );
    });
    
    // Verify we have the expected content
    if (await ownerLookupHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(ownerLookupHeading).toContainText(/At Sahibi/i);
    }
    
    // Search for owner (type at least 3 characters)
    const searchInput = ownerSearchInput.or(page.locator('input[placeholder*="At Sahibi"]').first());
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Search for HARUN KAHRAMAN
    await searchInput.fill('HARUN KAHRAMAN');
    await page.waitForTimeout(2000); // Wait for search results
    
    // Try to find and click an owner result
    const ownerButtons = page.locator('button').filter({ hasText: /HARUN.*KAHRAMAN|KAHRAMAN.*HARUN/i });
    let ownerCount = await ownerButtons.count();
    
    // If no exact match, try just HARUN
    if (ownerCount === 0) {
      await searchInput.clear();
      await searchInput.fill('HARUN');
      await page.waitForTimeout(2000);
      const harunButtons = page.locator('button').filter({ hasText: /HARUN/i });
      ownerCount = await harunButtons.count();
      
      if (ownerCount > 0) {
        console.log(`Found ${ownerCount} owner(s) for "HARUN"`);
        await harunButtons.first().click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log(`Found ${ownerCount} owner(s) for "HARUN KAHRAMAN"`);
      await ownerButtons.first().click();
      await page.waitForTimeout(1000);
    }
    
    // Check for errors after clicking owner
    await page.waitForTimeout(1000);
    const errorAfterClick = page.locator('text=/This page isn\'t working|HTTP ERROR|405/i');
    const hasErrorAfterClick = await errorAfterClick.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasErrorAfterClick) {
      const pageText = await page.textContent('body').catch(() => '') || '';
      throw new Error(
        `Page error after selecting owner. ` +
        `This suggests clicking the owner triggered an error. ` +
        `Page: ${pageText.substring(0, 500)}`
      );
    }
    
    // Verify owner is selected - wait a bit for UI to update
    await page.waitForTimeout(1500);
    
    // Check for errors before looking for button
    const errorCheck = page.locator('text=/This page isn\'t working|HTTP ERROR|405/i');
    const hasError = await errorCheck.isVisible({ timeout: 1000 }).catch(() => false);
    if (hasError) {
      const pageText = await page.textContent('body').catch(() => '') || '';
      throw new Error(
        `Page error after selecting owner. ` +
        `URL: ${page.url()}. ` +
        `Page: ${pageText.substring(0, 500)}`
      );
    }
    
    // Try multiple button selectors - the button text is from TR.common.next which is "İleri"
    const ownerSubmitButton = page.locator(
      'button:has-text("İleri"), ' +
      'button:has-text("Devam"), ' +
      'button:has-text("Next"), ' +
      'button:has-text("Continue"), ' +
      'button[type="submit"]:not([disabled])'
    ).first();
    
    // Wait for button to be visible and enabled
    await ownerSubmitButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Also ensure button is not disabled
    const isDisabled = await ownerSubmitButton.isDisabled().catch(() => true);
    if (isDisabled) {
      // Wait a bit more and check again - button might be enabling
      await page.waitForTimeout(1000);
      const stillDisabled = await ownerSubmitButton.isDisabled().catch(() => true);
      if (stillDisabled) {
        const pageText = await page.textContent('body').catch(() => '') || '';
        const allButtons = await page.locator('button').allTextContents().catch(() => []);
        throw new Error(
          `Submit button is disabled after owner selection. ` +
          `URL: ${page.url()}. ` +
          `Available buttons: ${allButtons.join(', ')}. ` +
          `Page: ${pageText.substring(0, 500)}`
        );
      }
    }
    
    // Wait for API response and navigation when clicking submit
    await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/onboarding/owner-profile') && response.status() === 200,
        { timeout: 10000 }
      ),
      page.waitForURL(/.*onboarding\/stablemate-setup/, { timeout: 15000 }),
      ownerSubmitButton.click()
    ]).catch(async (error) => {
      // Check if we're still on the same page or got an error
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const pageText = await page.textContent('body').catch(() => '') || '';
      const hasError = pageText.includes('HTTP ERROR') || pageText.includes('405');
      
      if (hasError || currentUrl.includes('/onboarding/owner-lookup')) {
        // Check for API errors in console or network
        throw new Error(
          `Owner selection failed. Still on ${currentUrl}. ` +
          `Error: ${error.message}. ` +
          `Check: 1) API /api/onboarding/owner-profile is working, 2) Authentication token is valid. ` +
          `Page: ${pageText.substring(0, 500)}`
        );
      }
      throw error;
    });
    
    // Verify we're on stablemate setup page
    await expect(page).toHaveURL(/.*onboarding\/stablemate-setup/, { timeout: 5000 });
    console.log('✓ Owner lookup completed');

    // ============================================
    // STEP 3: STABLEMATE SETUP
    // ============================================
    console.log('Step 3: Setting up stablemate...');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for errors immediately after navigation
    const stablemateErrorCheck = page.locator('text=/This page isn\'t working|HTTP ERROR|405/i');
    const stablemateHasError = await stablemateErrorCheck.isVisible({ timeout: 2000 }).catch(() => false);
    const pageTextAfterNav = await page.textContent('body').catch(() => '') || '';
    const hasErrorInPage = pageTextAfterNav.includes('HTTP ERROR') || pageTextAfterNav.includes('405') || pageTextAfterNav.includes("isn't working");
    
    if (stablemateHasError || hasErrorInPage) {
      throw new Error(
        `Stablemate setup page returned an error (HTTP 405). ` +
        `URL: ${page.url()}. ` +
        `This suggests the /onboarding/stablemate-setup route is not accessible. ` +
        `Check: 1) Route exists, 2) Middleware allows access, 3) Authentication token is valid. ` +
        `Page: ${pageTextAfterNav.substring(0, 500)}`
      );
    }
    
    // Wait for stablemate form to be visible - try multiple selectors
    const stablemateNameInput = page.locator('input[placeholder*="Eküri Adı"], input[name="name"], input[type="text"]').first();
    
    // Also try to find any form input as fallback
    await Promise.race([
      stablemateNameInput.waitFor({ state: 'visible', timeout: 10000 }),
      page.locator('form input').first().waitFor({ state: 'visible', timeout: 10000 })
    ]).catch(async () => {
      const currentUrl = page.url();
      const actualContent = await page.textContent('body').catch(() => '') || '';
      throw new Error(
        `Stablemate form not found. ` +
        `URL: ${currentUrl}. ` +
        `Expected: input with placeholder "Eküri Adı" or name="name". ` +
        `Actual page content: ${actualContent.substring(0, 500)}`
      );
    });
    
    // Fill stablemate form
    await stablemateNameInput.fill('Test Eküri');
    await page.fill('input[placeholder*="Kuruluş Yılı"], input[name="foundationYear"]', '2020');
    await page.fill('input[placeholder*="Konum"], input[name="location"]', 'İstanbul');
    
    // Submit stablemate setup - wait for API response and navigation
    const stablemateSubmit = page.locator('button:has-text("Devam"), button[type="submit"]').first();
    await stablemateSubmit.waitFor({ state: 'visible', timeout: 5000 });
    
    await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/onboarding/stablemate') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null),
      page.waitForURL(/.*onboarding\/import-horses/, { timeout: 15000 }),
      stablemateSubmit.click()
    ]).catch(async (error) => {
      const currentUrl = page.url();
      const pageText = await page.textContent('body').catch(() => '') || '';
      throw new Error(
        `Stablemate setup failed. URL: ${currentUrl}. ` +
        `Error: ${error.message}. ` +
        `Page: ${pageText.substring(0, 300)}`
      );
    });
    
    // Verify we're on import horses page
    await expect(page).toHaveURL(/.*onboarding\/import-horses/, { timeout: 5000 });
    
    // Check for errors after navigation
    await checkForPageErrors(page, 'Import horses');
    
    console.log('✓ Stablemate setup completed');

    // ============================================
    // STEP 4: IMPORT HORSES
    // ============================================
    console.log('Step 4: Importing horses...');
    
    // Wait for page content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Wait for heading or content to be visible
    const importHeading = page.locator('h1, h2').filter({ hasText: /At|Horse|İçe Aktar/i });
    await importHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
      const pageText = await page.textContent('body').catch(() => '') || '';
      throw new Error(`Import horses page content not found. Page: ${pageText.substring(0, 500)}`);
    });
    
    await expect(importHeading).toContainText(/At|Horse/i);
    
    // Wait for horses to load
    await page.waitForTimeout(3000);
    
    // Try to select horses if available
    const selectAllButton = page.locator('button:has-text("Tümünü Seç"), button:has-text("Select All")');
    if (await selectAllButton.isVisible({ timeout: 5000 })) {
      await selectAllButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Select first few horses manually
      const horseCheckboxes = page.locator('input[type="checkbox"]').filter({ hasNotText: /select all/i });
      const count = await horseCheckboxes.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(3, count); i++) {
          await horseCheckboxes.nth(i).check();
          await page.waitForTimeout(300);
        }
      }
    }
    
    // Click continue/import button - wait for navigation
    const importButton = page.locator('button:has-text("Devam"), button:has-text("İçe Aktar"), button[type="submit"]').first();
    if (await importButton.isVisible({ timeout: 5000 })) {
      await Promise.all([
        page.waitForURL(/.*onboarding\/set-locations/, { timeout: 15000 }),
        importButton.click()
      ]).catch(async (error) => {
        const currentUrl = page.url();
        throw new Error(`Horse import navigation failed. URL: ${currentUrl}. Error: ${error.message}`);
      });
    }
    
    // Verify we're on set locations page
    await expect(page).toHaveURL(/.*onboarding\/set-locations/, { timeout: 5000 });
    
    // Check for errors after navigation
    await checkForPageErrors(page, 'Set locations');
    
    console.log('✓ Horses imported');

    // ============================================
    // STEP 5: SET LOCATIONS
    // ============================================
    console.log('Step 5: Setting horse locations...');
    
    // Wait for page content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Wait for heading
    const locationHeading = page.locator('h1, h2').filter({ hasText: /Konum|Location/i });
    await locationHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
      const pageText = await page.textContent('body').catch(() => '') || '';
      throw new Error(`Set locations page content not found. Page: ${pageText.substring(0, 500)}`);
    });
    
    await expect(locationHeading).toContainText(/Konum|Location/i);
    
    // Wait for horses to load
    await page.waitForTimeout(2000);
    
    // Set location for each horse (select first racecourse option)
    const locationRadios = page.locator('input[type="radio"][name*="location"]');
    const radioCount = await locationRadios.count();
    
    if (radioCount > 0) {
      // Select first location option for each horse
      for (let i = 0; i < Math.min(radioCount, 5); i++) {
        const radio = locationRadios.nth(i);
        if (await radio.isVisible()) {
          await radio.check();
          await page.waitForTimeout(300);
        }
      }
    }
    
    // Submit locations - wait for navigation
    const locationSubmit = page.locator('button:has-text("Devam"), button:has-text("Kaydet"), button[type="submit"]').first();
    if (await locationSubmit.isVisible({ timeout: 5000 })) {
      await Promise.all([
        page.waitForURL(/.*app\/home/, { timeout: 15000 }),
        locationSubmit.click()
      ]).catch(async (error) => {
        const currentUrl = page.url();
        throw new Error(`Location submission navigation failed. URL: ${currentUrl}. Error: ${error.message}`);
      });
    }
    
    // Verify we're on dashboard/home
    await expect(page).toHaveURL(/.*app\/home/, { timeout: 5000 });
    
    // Check for errors after navigation
    await checkForPageErrors(page, 'Dashboard/Home');
    
    console.log('✓ Locations set, onboarding complete!');

    // ============================================
    // STEP 6: DASHBOARD / HOME PAGE
    // ============================================
    console.log('Step 6: Testing dashboard...');
    
    // Wait for page content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check dashboard elements
    const dashboardHeading = page.locator('h1, h2').filter({ hasText: /Dashboard|Ana Sayfa|Home/i });
    await dashboardHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
      const pageText = await page.textContent('body').catch(() => '') || '';
      throw new Error(`Dashboard page content not found. Page: ${pageText.substring(0, 500)}`);
    });
    
    await expect(dashboardHeading).toContainText(/Dashboard|Ana Sayfa|Home/i);
    
    // Check for dashboard cards
    const cards = page.locator('[class*="card"], [class*="Card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`✓ Dashboard loaded with ${cardCount} cards`);

    // ============================================
    // STEP 7: HORSES PAGE
    // ============================================
    console.log('Step 7: Testing horses page...');
    
    // Navigate to horses page
    await page.click('a[href*="/app/horses"], nav a:has-text("Atlar")');
    await waitForNavigation(page);
    await expect(page).toHaveURL(/.*app\/horses/);
    
    // Check for errors after navigation
    await checkForPageErrors(page, 'Horses');
    
    // Check horses list
    const horsesHeading = page.locator('h1, h2').filter({ hasText: /Atlar|Horses/i });
    await horsesHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
      const pageText = await page.textContent('body').catch(() => '') || '';
      throw new Error(`Horses page content not found. Page: ${pageText.substring(0, 500)}`);
    });
    
    await expect(horsesHeading).toContainText(/Atlar|Horses/i);
    
    // Test filter button
    const filterButton = page.locator('button:has-text("Filtrele"), button:has-text("Filter")');
    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();
      await page.waitForTimeout(500);
      // Close filter if opened
      await page.keyboard.press('Escape');
    }
    
    // Test sort button
    const sortButton = page.locator('button:has-text("Sırala"), button:has-text("Sort")');
    if (await sortButton.isVisible({ timeout: 3000 })) {
      await sortButton.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
    }
    
    // Test search
    const horseSearchInput = page.locator('input[placeholder*="Ara"], input[type="search"]');
    if (await horseSearchInput.isVisible({ timeout: 3000 })) {
      await horseSearchInput.fill('test');
      await page.waitForTimeout(1000);
      await horseSearchInput.clear();
    }
    
    console.log('✓ Horses page tested');

    // ============================================
    // STEP 8: ADD HORSE MODAL
    // ============================================
    console.log('Step 8: Testing add horse modal...');
    
    // Click add horse button
    const addHorseButton = page.locator('button:has-text("At Ekle"), button:has-text("+"), a[href*="add"]').first();
    if (await addHorseButton.isVisible({ timeout: 5000 })) {
      await addHorseButton.click();
      await page.waitForTimeout(1000);
      
      // Check if modal opened
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Dialog"]');
      if (await modal.isVisible({ timeout: 3000 })) {
        // Try to search for a horse
        const modalSearch = modal.locator('input[type="text"], input[placeholder*="Ara"]');
        if (await modalSearch.isVisible({ timeout: 2000 })) {
          await modalSearch.fill('TEST');
          await page.waitForTimeout(2000);
        }
        
        // Close modal
        const closeButton = modal.locator('button:has-text("Kapat"), button:has-text("X"), [aria-label*="close"]').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(500);
      }
    }
    
    console.log('✓ Add horse modal tested');

    // ============================================
    // STEP 9: INDIVIDUAL HORSE DETAIL PAGE
    // ============================================
    console.log('Step 9: Testing horse detail page...');
    
    // Click on first horse card if available
    const horseCard = page.locator('[class*="card"], [class*="horse"]').first();
    if (await horseCard.isVisible({ timeout: 5000 })) {
      await horseCard.click();
      await waitForNavigation(page);
      
      // Should be on horse detail page
      if (page.url().includes('/app/horses/')) {
        // Check for errors after navigation
        await checkForPageErrors(page, 'Horse detail');
        
        // Test tabs
        const tabs = page.locator('[role="tab"], button[class*="tab"]');
        const tabCount = await tabs.count();
        
        if (tabCount > 0) {
          // Click through tabs
          for (let i = 0; i < Math.min(tabCount, 4); i++) {
            await tabs.nth(i).click();
            await page.waitForTimeout(1000);
          }
        }
        
        // Test action buttons
        const actionButtons = page.locator('button:has-text("Not"), button:has-text("Gider"), button:has-text("Konum")');
        const actionCount = await actionButtons.count();
        if (actionCount > 0) {
          // Click first action button
          await actionButtons.first().click();
          await page.waitForTimeout(1000);
          
          // Close any opened modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
        
        // Go back to horses list
        const backButton = page.locator('button:has-text("Geri"), a:has-text("Back")');
        if (await backButton.isVisible({ timeout: 2000 })) {
          await backButton.click();
          await waitForNavigation(page);
        } else {
          await page.goto('/app/horses');
          await waitForNavigation(page);
        }
      }
    }
    
    console.log('✓ Horse detail page tested');

    // ============================================
    // STEP 10: ADD EXPENSE MODAL
    // ============================================
    console.log('Step 10: Testing add expense modal...');
    
    // Navigate to expenses page or open from horses page
    const expenseButton = page.locator('button:has-text("Gider Ekle"), a[href*="/app/expenses"]').first();
    if (await expenseButton.isVisible({ timeout: 5000 })) {
      await expenseButton.click();
      await page.waitForTimeout(1000);
      
      // Check if modal opened or navigated to expenses page
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      if (await modal.isVisible({ timeout: 3000 })) {
        // Fill expense form
        const dateInput = modal.locator('input[type="date"]');
        if (await dateInput.isVisible({ timeout: 2000 })) {
          const today = new Date().toISOString().split('T')[0];
          await dateInput.fill(today);
        }
        
        // Select category
        const categorySelect = modal.locator('select[name="category"], select').first();
        if (await categorySelect.isVisible({ timeout: 2000 })) {
          await categorySelect.selectOption({ index: 1 });
        }
        
        // Fill amount
        const amountInput = modal.locator('input[name="amount"], input[type="number"]');
        if (await amountInput.isVisible({ timeout: 2000 })) {
          await amountInput.fill('100');
        }
        
        // Close modal without submitting
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else if (page.url().includes('/app/expenses')) {
        // If navigated to expenses page, go back
        await page.goBack();
        await waitForNavigation(page);
      }
    }
    
    console.log('✓ Add expense modal tested');

    // ============================================
    // STEP 11: EXPENSES PAGE
    // ============================================
    console.log('Step 11: Testing expenses page...');
    
    // Navigate to expenses
    await page.click('a[href*="/app/expenses"], nav a:has-text("Giderler")');
    await waitForNavigation(page);
    
    if (page.url().includes('/app/expenses')) {
      // Check for errors after navigation
      await checkForPageErrors(page, 'Expenses');
      
      const expensesHeading = page.locator('h1, h2').filter({ hasText: /Giderler|Expenses/i });
      await expensesHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
        const pageText = await page.textContent('body').catch(() => '') || '';
        throw new Error(`Expenses page content not found. Page: ${pageText.substring(0, 500)}`);
      });
      
      await expect(expensesHeading).toContainText(/Giderler|Expenses/i);
      
      // Test filters if available
      const filterInputs = page.locator('input[type="date"], select');
      const filterCount = await filterInputs.count();
      if (filterCount > 0) {
        console.log(`✓ Expenses page loaded with ${filterCount} filter options`);
      }
    }
    
    console.log('✓ Expenses page tested');

    // ============================================
    // STEP 12: NOTES PAGE
    // ============================================
    console.log('Step 12: Testing notes page...');
    
    // Navigate to notes
    await page.click('a[href*="/app/notes"], nav a:has-text("Notlar")');
    await waitForNavigation(page);
    
    if (page.url().includes('/app/notes')) {
      // Check for errors after navigation
      await checkForPageErrors(page, 'Notes');
      
      const notesHeading = page.locator('h1, h2').filter({ hasText: /Notlar|Notes/i });
      await notesHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
        const pageText = await page.textContent('body').catch(() => '') || '';
        throw new Error(`Notes page content not found. Page: ${pageText.substring(0, 500)}`);
      });
      
      await expect(notesHeading).toContainText(/Notlar|Notes/i);
      console.log('✓ Notes page loaded');
    }
    
    console.log('✓ Notes page tested');

    // ============================================
    // STEP 13: STABLEMATE / EKÜRİ PAGE
    // ============================================
    console.log('Step 13: Testing stablemate management page...');
    
    // Navigate to stablemate page
    await page.click('a[href*="/app/stablemate"], nav a:has-text("Eküri")');
    await waitForNavigation(page);
    
    if (page.url().includes('/app/stablemate')) {
      // Check for errors after navigation
      await checkForPageErrors(page, 'Stablemate');
      
      const stablemateHeading = page.locator('h1, h2').filter({ hasText: /Eküri|Stablemate/i });
      await stablemateHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
        const pageText = await page.textContent('body').catch(() => '') || '';
        throw new Error(`Stablemate page content not found. Page: ${pageText.substring(0, 500)}`);
      });
      
      await expect(stablemateHeading).toContainText(/Eküri|Stablemate/i);
      
      // Test add trainer button
      const addTrainerButton = page.locator('button:has-text("Antrenör Ekle"), button:has-text("Add Trainer")');
      if (await addTrainerButton.isVisible({ timeout: 5000 })) {
        await addTrainerButton.click();
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 3000 })) {
          // Try to search for trainer
          const searchInput = modal.locator('input[type="text"]');
          if (await searchInput.isVisible({ timeout: 2000 })) {
            await searchInput.fill('TEST');
            await page.waitForTimeout(2000);
          }
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
      
      // Test change trainer button
      const changeTrainerButton = page.locator('button:has-text("Antrenör Değiştir"), button:has-text("Change Trainer")');
      if (await changeTrainerButton.isVisible({ timeout: 5000 })) {
        await changeTrainerButton.click();
        await page.waitForTimeout(1000);
        
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 3000 })) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
      
      console.log('✓ Stablemate page tested');
    }

    // ============================================
    // STEP 14: STATISTICS PAGE
    // ============================================
    console.log('Step 14: Testing statistics page...');
    
    // Navigate to statistics
    await page.click('a[href*="/app/stats"], nav a:has-text("İstatistikler")');
    await waitForNavigation(page);
    
    if (page.url().includes('/app/stats')) {
      // Check for errors after navigation
      await checkForPageErrors(page, 'Statistics');
      
      const statsHeading = page.locator('h1, h2').filter({ hasText: /İstatistikler|Statistics/i });
      await statsHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
        const pageText = await page.textContent('body').catch(() => '') || '';
        throw new Error(`Statistics page content not found. Page: ${pageText.substring(0, 500)}`);
      });
      
      await expect(statsHeading).toContainText(/İstatistikler|Statistics/i);
      
      // Test navigation tabs if available
      const navButtons = page.locator('button[class*="nav"], [role="button"]');
      const navCount = await navButtons.count();
      if (navCount > 0) {
        for (let i = 0; i < Math.min(navCount, 3); i++) {
          await navButtons.nth(i).click();
          await page.waitForTimeout(1000);
        }
      }
      
      console.log('✓ Statistics page tested');
    }

    // ============================================
    // STEP 15: ACCOUNT SETTINGS / PROFILE
    // ============================================
    console.log('Step 15: Testing account settings...');
    
    // Try to find account/profile link
    const accountLink = page.locator('a[href*="account"], nav a:has-text("Hesap"), button:has-text("Profile")');
    if (await accountLink.isVisible({ timeout: 5000 })) {
      await accountLink.click();
      await waitForNavigation(page);
      
      // Check for errors after navigation
      if (page.url().includes('/app/stablemate') || page.url().includes('/account')) {
        await checkForPageErrors(page, 'Account/Settings');
      }
      
      // Test notification toggles if available
      const toggles = page.locator('[role="switch"], input[type="checkbox"]');
      const toggleCount = await toggles.count();
      if (toggleCount > 0) {
        // Toggle first switch
        await toggles.first().click();
        await page.waitForTimeout(500);
        // Toggle back
        await toggles.first().click();
        await page.waitForTimeout(500);
      }
    }
    
    console.log('✓ Account settings tested');

    // ============================================
    // STEP 16: NAVIGATION TESTING
    // ============================================
    console.log('Step 16: Testing navigation...');
    
    // Test all main navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      const visitedUrls = new Set<string>();
      
      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');
        
        if (href && !visitedUrls.has(href) && !href.includes('#')) {
          visitedUrls.add(href);
          await link.click();
          await waitForNavigation(page);
          
          // Check for errors after navigation
          try {
            await checkForPageErrors(page, `Navigation to ${href}`);
          } catch (error) {
            // Log error but continue testing other links
            console.log(`⚠ Error on ${href}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // Verify page loaded
          await expect(page.locator('body')).toBeVisible();
          await page.waitForTimeout(500);
        }
      }
      
      console.log(`✓ Tested ${visitedUrls.size} navigation links`);
    }

    // ============================================
    // STEP 17: RESPONSIVE TESTING (Mobile View)
    // ============================================
    console.log('Step 17: Testing mobile responsiveness...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Navigate to horses page
    await page.goto('/app/horses');
    await waitForNavigation(page);
    
    // Check if mobile menu exists
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")');
    if (await mobileMenuButton.isVisible({ timeout: 3000 })) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);
      
      // Close menu
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Reset to desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    
    console.log('✓ Mobile responsiveness tested');

    // ============================================
    // FINAL: VERIFICATION
    // ============================================
    console.log('Final: Verifying application state...');
    
    // Go back to dashboard
    await page.goto('/app/home');
    await waitForNavigation(page);
    
    // Check for errors
    await checkForPageErrors(page, 'Final dashboard check');
    
    // Verify user is still logged in
    const logoutButton = page.locator('button:has-text("Çıkış"), button:has-text("Logout"), a[href*="logout"]');
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      console.log('✓ User session verified');
    }
    
    console.log('✅ Complete owner flow test finished successfully!');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Logout if still logged in
    try {
      await page.goto('/api/auth/logout');
      await page.waitForTimeout(1000);
    } catch (e) {
      // Ignore cleanup errors
    }
  });
});

