import { chromium } from 'playwright'

interface TJKOwnerResult {
  label: string
  officialName: string
  externalRef?: string
  sampleHorse?: string // One horse to verify the owner
}

interface TJKHorseResult {
  name: string
  yob?: number
  gender?: string
  status?: string
  externalRef?: string
}

/**
 * Search for horse owners on TJK website
 * @param query - Owner name (will be converted to uppercase)
 * @returns Array of owner results with sample horses for verification
 */
export async function searchTJKOwners(query: string): Promise<TJKOwnerResult[]> {
  if (!process.env.PLAYWRIGHT_ENABLED || process.env.PLAYWRIGHT_ENABLED !== 'true') {
    // Fallback to mock data in development
    return getMockOwners(query)
  }

  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'tr-TR',
    })

    const page = await context.newPage()

    // Navigate to the horses search page
    await page.goto('https://www.tjk.org/TR/YarisSever/Query/Page/Atlar?QueryParameter_OLDUFLG=on', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000)

    // Find the specific Select2 for owner search
    // The page has multiple Select2 inputs, we need the one for "Sahip Adı"
    // Look for the label or container that contains "Sahip"
    const ownerSelectContainer = await page.locator('select[name*="SAHIBI"], select[name*="Sahip"], #select2-chosen-3').first()
    
    // Click the Select2 container to open it
    await ownerSelectContainer.click({ timeout: 10000 })
    
    await page.waitForTimeout(500)

    // Now wait for the search input to appear in the opened dropdown
    const searchInput = await page.waitForSelector(
      '.select2-dropdown-open input.select2-input',
      { timeout: 10000 }
    )

    // Type the query (uppercase)
    const uppercaseQuery = query.toUpperCase()
    await searchInput.fill(uppercaseQuery)

    // Wait for autocomplete results
    await page.waitForSelector('.select2-results', { timeout: 5000 })
    await page.waitForTimeout(1000) // Give time for results to populate

    // Extract the owner options from the dropdown
    const owners = await page.evaluate(() => {
      const results = document.querySelectorAll('.select2-results li.select2-result-selectable')
      const ownerList: { text: string; id: string }[] = []

      results.forEach((result) => {
        const text = result.textContent?.trim()
        const id = result.getAttribute('data-id') || ''
        if (text && text !== '') {
          ownerList.push({ text, id })
        }
      })

      return ownerList
    })

    // For each owner, we need to get one sample horse to verify
    const ownersWithHorses: TJKOwnerResult[] = []

    for (const owner of owners.slice(0, 10)) {
      // Limit to first 10 results
      try {
        // Select this owner
        await page.click('.select2-container')
        await page.waitForSelector('input.select2-input[role="combobox"]', { timeout: 3000 })
        await page.fill('input.select2-input[role="combobox"]', uppercaseQuery)
        await page.waitForTimeout(500)

        // Click on the specific owner result
        const ownerOption = await page.locator(`.select2-results li[data-id="${owner.id}"]`).first()
        if (await ownerOption.isVisible()) {
          await ownerOption.click()
          await page.waitForTimeout(1000)

          // Try to get the first horse from the results
          const horses = await page.evaluate(() => {
            const horseRows = document.querySelectorAll('table tbody tr')
            if (horseRows.length > 0) {
              const firstRow = horseRows[0]
              const cells = firstRow.querySelectorAll('td')
              if (cells.length > 0) {
                return cells[0].textContent?.trim() || ''
              }
            }
            return ''
          })

          ownersWithHorses.push({
            label: `${owner.text}${horses ? ` (Örn. At: ${horses})` : ''}`,
            officialName: owner.text,
            externalRef: owner.id,
            sampleHorse: horses,
          })
        }
      } catch (error) {
        console.error(`Error fetching horses for owner ${owner.text}:`, error)
        // Still add the owner without a sample horse
        ownersWithHorses.push({
          label: owner.text,
          officialName: owner.text,
          externalRef: owner.id,
        })
      }
    }

    await context.close()
    return ownersWithHorses
  } catch (error) {
    console.error('TJK owner search error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // Return mock data as fallback
    console.log('Falling back to mock data due to scraping error')
    return getMockOwners(query)
  } finally {
    await browser.close()
  }
}

/**
 * Search for horses owned by a specific owner on TJK website
 * @param ownerName - Owner's official name
 * @param ownerRef - Owner's external reference ID (optional)
 * @returns Array of horses
 */
export async function searchTJKHorses(
  ownerName: string,
  ownerRef?: string
): Promise<TJKHorseResult[]> {
  if (!process.env.PLAYWRIGHT_ENABLED || process.env.PLAYWRIGHT_ENABLED !== 'true') {
    // Fallback to mock data in development
    return getMockHorses(ownerName)
  }

  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'tr-TR',
    })

    const page = await context.newPage()

    // Navigate to the horses search page
    await page.goto('https://www.tjk.org/TR/YarisSever/Query/Page/Atlar?QueryParameter_OLDUFLG=on', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000)

    // Find the specific Select2 for owner search
    const ownerSelectContainer = await page.locator('select[name*="SAHIBI"], select[name*="Sahip"], #select2-chosen-3').first()
    
    // Click the Select2 container to open it
    await ownerSelectContainer.click({ timeout: 10000 })
    
    await page.waitForTimeout(500)

    // Now wait for the search input to appear
    const searchInput = await page.waitForSelector(
      '.select2-dropdown-open input.select2-input',
      { timeout: 10000 }
    )

    // Type the owner name (uppercase)
    await searchInput.fill(ownerName.toUpperCase())
    await page.waitForTimeout(1000)

    // Select the owner from results
    if (ownerRef) {
      await page.click(`.select2-results li[data-id="${ownerRef}"]`)
    } else {
      // Click the first result
      await page.click('.select2-results li.select2-result-selectable')
    }

    await page.waitForTimeout(2000)

    // Parse the horses table
    const horses = await page.evaluate(() => {
      const horseRows = document.querySelectorAll('table tbody tr')
      const horseList: any[] = []

      horseRows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 6) {
          const horseName = cells[0].textContent?.trim()
          const breed = cells[1].textContent?.trim()
          const gender = cells[2].textContent?.trim()
          const age = cells[3].textContent?.trim()
          const owner = cells[4].textContent?.trim()
          const trainer = cells[5].textContent?.trim()

          if (horseName) {
            // Calculate birth year from age
            const currentYear = new Date().getFullYear()
            const ageNum = parseInt(age || '0', 10)
            const yob = ageNum > 0 ? currentYear - ageNum : undefined

            horseList.push({
              name: horseName,
              yob,
              gender,
              breed,
              trainer,
              externalRef: horseName, // Use horse name as ref for now
            })
          }
        }
      })

      return horseList
    })

    await context.close()
    return horses
  } catch (error) {
    console.error('TJK horse search error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // Return mock data as fallback
    console.log('Falling back to mock data due to scraping error')
    return getMockHorses(ownerName)
  } finally {
    await browser.close()
  }
}

/**
 * Mock data for development/testing when Playwright is disabled
 */
function getMockOwners(query: string): TJKOwnerResult[] {
  const mockOwners = [
    {
      label: 'EMRAH (Örn. At: YILDIZ)',
      officialName: 'EMRAH',
      externalRef: 'emrah-001',
      sampleHorse: 'YILDIZ',
    },
    {
      label: 'MEHMET ALİ (Örn. At: ŞAHİN)',
      officialName: 'MEHMET ALİ',
      externalRef: 'mehmet-ali-001',
      sampleHorse: 'ŞAHİN',
    },
    {
      label: 'AYŞE DEMİR (Örn. At: RÜZGAR)',
      officialName: 'AYŞE DEMİR',
      externalRef: 'ayse-demir-001',
      sampleHorse: 'RÜZGAR',
    },
  ]

  const upperQuery = query.toUpperCase()
  return mockOwners.filter((owner) => owner.officialName.includes(upperQuery))
}

function getMockHorses(ownerName: string): TJKHorseResult[] {
  return [
    {
      name: 'YILDIZ',
      yob: 2020,
      gender: 'Kısrak',
      status: 'RACING',
      externalRef: 'yildiz-001',
    },
    {
      name: 'ŞİMŞEK',
      yob: 2019,
      gender: 'Aygır',
      status: 'RACING',
      externalRef: 'simsek-001',
    },
    {
      name: 'RÜZGAR',
      yob: 2021,
      gender: 'Aygır',
      status: 'RACING',
      externalRef: 'ruzgar-001',
    },
  ]
}

