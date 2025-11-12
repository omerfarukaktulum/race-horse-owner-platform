/**
 * TJK API Integration
 * Uses hybrid approach: API for owners, Playwright for horses (anti-bot protection)
 */

import { chromium, Browser, Page } from 'playwright'

interface TJKOwnerResult {
  label: string
  officialName: string
  externalRef?: string
  sampleHorse?: string
}

interface TJKHorseResult {
  name: string
  yob?: number
  gender?: string
  status?: string
  externalRef?: string
  sire?: string  // Baba (Sire)
  dam?: string   // Anne (Dam)
}

/**
 * Search for horse owners using TJK's API
 * @param query - Owner name (minimum 2 characters)
 * @returns Array of owner results
 */
export async function searchTJKOwnersAPI(query: string): Promise<TJKOwnerResult[]> {
  try {
    const upperQuery = query.toUpperCase()
    
    // TJK API endpoint for owner search
    const timestamp = Date.now()
    const url = `https://www.tjk.org/TR/YarisSever/Query/ParameterQuery?parameterName=UzerineKosanSahipId&filter=${encodeURIComponent(upperQuery)}&page=1&parentParameterName=&_=${timestamp}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.tjk.org/TR/YarisSever/Query/Page/Atlar',
      },
    })

    if (!response.ok) {
      throw new Error(`TJK API returned ${response.status}`)
    }

    const data = await response.json()

    // TJK returns data in format: { entities: [...], totalCount: X }
    if (!data || !Array.isArray(data.entities)) {
      console.warn('Unexpected TJK API response format:', data)
      return []
    }

    // Map TJK response to our format
    // Note: We skip sample horse fetching here because TJK's horse endpoint
    // returns HTML when called from server-side, likely due to anti-bot protection
    // The full horse import will work during the onboarding horse import step
    const owners: TJKOwnerResult[] = data.entities.map((item: any) => ({
      label: item.text,
      officialName: item.text,
      externalRef: String(item.id),
      // sampleHorse will be undefined - that's OK, user can verify via import step
    }))

    return owners
  } catch (error) {
    console.error('TJK API owner search error:', error)
    throw error
  }
}

/**
 * Search for horses owned by a specific owner using Playwright (bypasses anti-bot)
 * @param ownerName - Owner's official name
 * @param ownerId - Owner's TJK ID (from search result)
 * @returns Array of horses
 */
export async function searchTJKHorsesPlaywright(
  ownerName: string,
  ownerId?: string
): Promise<TJKHorseResult[]> {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    if (!ownerId) {
      throw new Error('Owner ID is required for horse search')
    }

    console.log('[TJK Playwright] Starting browser for owner ID:', ownerId)

    // Launch browser (headless mode)
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'tr-TR',
    })

    page = await context.newPage()

    // Navigate DIRECTLY to DATA URL (not Page, but Data endpoint!)
    // NOTE: Include QueryParameter_OLDUFLG=on to include dead horses (Öldü)
    console.log('[TJK Playwright] Navigating directly to data URL...')
    const resultsUrl = `https://www.tjk.org/TR/YarisSever/Query/Data/Atlar?QueryParameter_AtIsmi=&QueryParameter_IrkId=-1&QueryParameter_CinsiyetId=-1&QueryParameter_Yas=&QueryParameter_BabaId=&QueryParameter_AnneId=&QueryParameter_UzerineKosanSahipId=${ownerId}&QueryParameter_YetistiricAdi=&QueryParameter_AntronorId=&QueryParameter_UlkeId=-1&QueryParameter_OLDUFLG=on&Era=today&Sort=&OldQueryParameter_OLDUFLG=on&X-Requested-With=XMLHttpRequest`
    
    await page.goto(resultsUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    console.log('[TJK Playwright] Waiting for results table to load...')
    // Wait for either the results table or a "no results" message
    await Promise.race([
      page.waitForSelector('table tbody tr', { timeout: 15000 }),
      page.waitForSelector('.no-data, .nodata, :has-text("Kayıt bulunamadı")', { timeout: 15000 }),
    ]).catch(() => {
      console.log('[TJK Playwright] Timeout waiting for results, will try to extract anyway')
    })
    
    // Give it extra time to fully render
    await page.waitForTimeout(3000)

    // Extract horse data from the table
    console.log('[TJK Playwright] Extracting horse data...')
    const horses = await page.evaluate(() => {
      const results: any[] = []
      // Direct data endpoint returns table without wrapper
      const rows = document.querySelectorAll('table tbody tr, tbody tr')

      console.log('[Browser] Found', rows.length, 'table rows')

      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td')
        console.log('[Browser] Row', index, 'has', cells.length, 'cells')
        
        // Log all cell contents for debugging
        if (index === 0) {
          const cellContents = Array.from(cells).map((cell, i) => `Col${i}: ${cell.textContent?.trim()}`).join(' | ')
          console.log('[Browser] First row cells:', cellContents)
        }
        
        if (cells.length >= 3) {
          // Column 0: Horse name (with link)
          const nameCell = cells[0]
          const nameLink = nameCell?.querySelector('a')
          const name = (nameLink?.textContent || nameCell?.textContent || '').trim()
          
          // Extract horse ID from the link href
          // Link format: ../Page/../../Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=86521
          let horseId: string | undefined
          if (nameLink) {
            const href = nameLink.getAttribute('href') || ''
            const atIdMatch = href.match(/QueryParameter_AtId=(\d+)/)
            if (atIdMatch) {
              horseId = atIdMatch[1]
            }
          }
          
          // Column 1: Breed (Irk)
          const breed = cells[1]?.textContent?.trim() || ''
          
          // Column 2: Gender (Cinsiyet)
          const gender = cells[2]?.textContent?.trim() || ''
          
          // Column 3: Age (Yaş) - format like "6 y d a"
          const ageText = cells[3]?.textContent?.trim() || ''
          // Extract year from age text (first number)
          const ageMatch = ageText.match(/(\d+)\s*y/)
          const currentYear = new Date().getFullYear()
          const yob = ageMatch ? currentYear - parseInt(ageMatch[1]) : undefined

          // Column 4: Orijin(Baba-Anne) - contains "SIRE - DAM" in a single cell
          // The cell may contain links, so we need to extract text from all links
          const originCell = cells[4]
          let originText = ''
          
          if (originCell) {
            // Get all links in the origin cell
            const links = originCell.querySelectorAll('a')
            if (links.length >= 2) {
              // First link is sire, second link is dam
              originText = `${links[0]?.textContent?.trim() || ''} - ${links[1]?.textContent?.trim() || ''}`
            } else {
              // Fallback to textContent if no links
              originText = originCell.textContent?.trim() || ''
            }
          }
          
          // Column 5: Üzerine Koşan Sahip (Owner) - NOT part of origin!
          // Column 6: Gerçek Sahibi (Real owner)
          // Column 7: Yetiştirici (Breeder)
          // Column 8: Antrenörü (Trainer)

          // Parse origin: split by " - " to get sire and dam
          const originParts = originText.split(' - ').map(part => part.trim())
          const sire = originParts[0] || ''
          const dam = originParts[1] || ''

          if (name && name !== 'At İsmi') { // Skip header row
            // Check if horse is dead (marked with Öldü in name)
            const isDead = name.includes('Öldü') || name.includes('ÖLDÜ')
            const cleanName = name.replace(/\(.*?\)/g, '').trim() // Remove any parentheses (Öldü), (T), etc.
            
            // Determine status
            let status = 'RACING'
            if (isDead) {
              status = 'DEAD'
            } else if (gender?.includes('Aygır') || gender?.includes('AYGIR')) {
              status = 'STALLION'
            } else if (gender?.includes('Kısrak') || gender?.includes('KISRAK')) {
              status = 'MARE'
            }
            
            console.log('[Browser] Adding horse:', cleanName, '| Status:', status, '| Origin text:', originText, '| Sire:', sire, '| Dam:', dam, '| Horse ID:', horseId)
            results.push({
              name: cleanName,
              yob,
              gender,
              breed,
              status,
              externalRef: horseId,
              sire: sire || undefined,
              dam: dam || undefined,
            })
          }
        }
      })

      console.log('[Browser] Extracted', results.length, 'horses')
      return results
    })

    console.log('[TJK Playwright] Successfully extracted', horses.length, 'horses')

    // Map to our format - status is already determined in the extraction phase
    const mappedHorses: TJKHorseResult[] = horses.map((horse: any) => {
      return {
        name: horse.name,
        yob: horse.yob,
        gender: horse.gender,
        status: horse.status || 'RACING', // Use status from extraction (DEAD, STALLION, MARE, or RACING)
        externalRef: undefined, // Table doesn't show IDs
        sire: horse.sire,
        dam: horse.dam,
      }
    })

    await browser.close()
    return mappedHorses

  } catch (error: any) {
    console.error('[TJK Playwright] Horse search error:', error.message)
    if (page) {
      try {
        const screenshot = await page.screenshot()
        console.log('[TJK Playwright] Screenshot captured on error')
      } catch (screenshotError) {
        console.error('[TJK Playwright] Failed to capture screenshot:', screenshotError)
      }
    }
    if (browser) {
      await browser.close()
    }
    throw error
  }
}

/**
 * Mock data for development/testing
 */
export function getMockOwners(query: string): TJKOwnerResult[] {
  const mockOwners = [
    {
      label: 'EMRAH',
      officialName: 'EMRAH',
      externalRef: '1001',
      sampleHorse: 'YILDIZ',
    },
    {
      label: 'EMRAH YILMAZ',
      officialName: 'EMRAH YILMAZ',
      externalRef: '1002',
      sampleHorse: 'ŞAHİN',
    },
    {
      label: 'MEHMET EMRAH',
      officialName: 'MEHMET EMRAH',
      externalRef: '1003',
      sampleHorse: 'RÜZGAR',
    },
  ]

  const upperQuery = query.toUpperCase()
  return mockOwners.filter((owner) => owner.officialName.includes(upperQuery))
}

export function getMockHorses(ownerName: string): TJKHorseResult[] {
  return [
    {
      name: 'YILDIZ',
      yob: 2020,
      gender: 'Kısrak',
      status: 'RACING',
      externalRef: 'horse-001',
      sire: 'ŞAMPİYON',
      dam: 'GÜNEŞ',
    },
    {
      name: 'ŞİMŞEK',
      yob: 2019,
      gender: 'Aygır',
      status: 'RACING',
      externalRef: 'horse-002',
      sire: 'RÜZGAR',
      dam: 'YILDIZ',
    },
    {
      name: 'RÜZGAR',
      yob: 2021,
      gender: 'Aygır',
      status: 'RACING',
      externalRef: 'horse-003',
      sire: 'KAPLAN',
      dam: 'ASLAN',
    },
  ]
}

