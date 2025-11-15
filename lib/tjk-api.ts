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

    // Listen to console messages from the browser and forward to terminal
    page.on('console', (msg) => {
      const text = msg.text()
      // Forward ALL browser console logs to terminal with clear prefix
      console.log('[Browser Console]', msg.type().toUpperCase(), ':', text)
    })
    
    // Also listen to page errors
    page.on('pageerror', (error) => {
      console.error('[Browser Page Error]', error.message)
    })

    // Fetch ALL horses using the correct pagination pattern:
    // 1. First, fetch the initial Data/Atlar page (shows first 50)
    // 2. Then continue with DataRows pages (PageNumber=1, 2, 3, etc.)
    // Set QueryParameter_OLDUFLG=0 to exclude dead horses (Öldü)
    console.log('[TJK Playwright] Starting paginated horse fetch...')
    
    let allHorses: any[] = []
    const pageSize = 50 // TJK returns 50 results per page
    const maxPages = 20 // Safety limit to prevent infinite loops (20 * 50 = 1000 horses max)
    let totalCount: number | null = null
    let hasMorePages = true
    
    // Step 1: Fetch the initial Data/Atlar page (first 50 horses)
    console.log(`[TJK Playwright] ===== Fetching initial page (Data/Atlar) =====`)
    const initialUrl = `https://www.tjk.org/TR/YarisSever/Query/Data/Atlar?QueryParameter_AtIsmi=&QueryParameter_IrkId=-1&QueryParameter_CinsiyetId=-1&QueryParameter_Yas=&QueryParameter_BabaId=&QueryParameter_AnneId=&QueryParameter_UzerineKosanSahipId=${ownerId}&QueryParameter_YetistiricAdi=&QueryParameter_AntronorId=&QueryParameter_UlkeId=-1&QueryParameter_OLDUFLG=0&Era=today&Sort=&X-Requested-With=XMLHttpRequest`
    
    console.log(`[TJK Playwright] Initial URL: ${initialUrl}`)
    
    await page.goto(initialUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    console.log(`[TJK Playwright] Initial page loaded, waiting for results...`)
    await Promise.race([
      page.waitForSelector('a[href*="QueryParameter_AtId"], a[href*="AtKosuBilgileri"], table tbody tr, tbody tr', { timeout: 15000 }),
      page.waitForSelector('.no-data, .nodata, :has-text("Kayıt bulunamadı"), :has-text("sonuçtan")', { timeout: 15000 }),
    ]).catch(() => {
      console.log(`[TJK Playwright] Timeout waiting for results on initial page, will try to extract anyway`)
    })
    
    await page.waitForTimeout(3000)

    // Debug: Check what's actually on the page
    const initialPageStructure = await page.evaluate(() => {
      const allLinks = document.querySelectorAll('a')
      const atIdLinks = Array.from(allLinks).filter(link => {
        const href = link.getAttribute('href') || ''
        return href.includes('AtId') || href.includes('AtKosuBilgileri')
      })
      const tables = document.querySelectorAll('table')
      const tableRows = document.querySelectorAll('table tbody tr, tbody tr')
      
      return {
        totalLinks: allLinks.length,
        atIdLinks: atIdLinks.length,
        tables: tables.length,
        tableRows: tableRows.length,
        bodyHTML: document.body.innerHTML.substring(0, 3000),
        bodyText: document.body.textContent?.substring(0, 1000),
        firstAtIdLink: atIdLinks[0] ? {
          href: atIdLinks[0].getAttribute('href'),
          text: atIdLinks[0].textContent,
        } : null,
      }
    })
    
    console.log(`[TJK Playwright] Initial page structure:`, JSON.stringify(initialPageStructure, null, 2))
    
    // Extract horses from initial page
    const initialHorses = await page.evaluate(() => {
      const results: any[] = []
      
      // Try multiple approaches to find horse links
      let horseNameLinks = document.querySelectorAll('a[href*="QueryParameter_AtId"]')
      if (horseNameLinks.length === 0) {
        horseNameLinks = document.querySelectorAll('a[href*="AtKosuBilgileri"]')
      }
      if (horseNameLinks.length === 0) {
        // Try finding links in table rows
        const allLinks = Array.from(document.querySelectorAll('a'))
        horseNameLinks = allLinks.filter(link => {
          const href = link.getAttribute('href') || ''
          return href.includes('AtId') || href.includes('AtKosuBilgileri')
        }) as any
      }
      
      console.log('[Browser] Found', horseNameLinks.length, 'horse name links on initial page')
      
      // If still no links, try table-based extraction
      if (horseNameLinks.length === 0) {
        console.log('[Browser] No links found, trying table-based extraction...')
        const rows = document.querySelectorAll('table tbody tr, tbody tr')
        console.log('[Browser] Found', rows.length, 'table rows')
        
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td')
        if (cells.length >= 3) {
          const nameCell = cells[0]
          const nameLink = nameCell?.querySelector('a')
          const name = (nameLink?.textContent || nameCell?.textContent || '').trim()
          
            if (!name || name === 'At İsmi') return // Skip header
            
            const href = nameLink?.getAttribute('href') || ''
            let horseId: string | undefined
            const atIdMatch = href.match(/QueryParameter_AtId=(\d+)/)
            if (atIdMatch) {
              horseId = atIdMatch[1]
            }
            
            if (!horseId) return
          
          const breed = cells[1]?.textContent?.trim() || ''
          const gender = cells[2]?.textContent?.trim() || ''
          const ageText = cells[3]?.textContent?.trim() || ''
          const ageMatch = ageText.match(/(\d+)\s*y/)
          const currentYear = new Date().getFullYear()
          const yob = ageMatch ? currentYear - parseInt(ageMatch[1]) : undefined

          let sire = ''
          let dam = ''
            const originCell = cells[4]
          if (originCell) {
              const originLinks = originCell.querySelectorAll('a[href*="Orijin"]')
              if (originLinks.length >= 2) {
                const sireLink = originLinks[0]
                const damLink = originLinks[1]
                const sireHref = sireLink.getAttribute('href') || ''
                const sireMatch = sireHref.match(/QueryParameter_BabaAdi=([^&]+)/)
                if (sireMatch) {
                  sire = decodeURIComponent(sireMatch[1].replace(/\+/g, ' '))
                } else {
                  sire = sireLink.textContent?.trim() || ''
                }
                const damHref = damLink.getAttribute('href') || ''
                const damMatch = damHref.match(/QueryParameter_AnneAdi=([^&]+)/)
                if (damMatch) {
                  dam = decodeURIComponent(damMatch[1].replace(/\+/g, ' '))
              } else {
                  dam = damLink.textContent?.trim() || ''
                }
              }
            }
            
            let status = 'STALLION'
            if (gender && gender.toLowerCase().includes('dişi')) {
              status = 'MARE'
            }
            
            const cleanName = name.replace(/\(.*?\)/g, '').trim()
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
        })
        
        return results
      }
      
      horseNameLinks.forEach((nameLink) => {
        let container = nameLink.parentElement
        while (container && container.tagName !== 'DIV' && container !== document.body) {
          container = container.parentElement
        }
        
        if (!container) return
        
        const containerText = container.textContent || ''
        const name = nameLink.textContent?.trim() || ''
        const href = nameLink.getAttribute('href') || ''
        let horseId: string | undefined
        const atIdMatch = href.match(/QueryParameter_AtId=(\d+)/)
        if (atIdMatch) {
          horseId = atIdMatch[1]
        }
        
        let breed = ''
        const breedPattern = /(Arap|İngiliz|Yarımkan|Thoroughbred)/i
        const breedMatch = containerText.match(breedPattern)
        if (breedMatch) {
          breed = breedMatch[1]
        }
        
        let gender = ''
        const genderPattern = /(Erkek|Dişi)/i
        const genderMatch = containerText.match(genderPattern)
        if (genderMatch) {
          gender = genderMatch[1]
        }
        
        let ageText = ''
        const agePattern = /(\d+)\s*y\s*[dkm]?[kd]?/i
        const ageMatch = containerText.match(agePattern)
        if (ageMatch) {
          ageText = ageMatch[0]
        }
        
        let sire = ''
        let dam = ''
        const originLinks = container.querySelectorAll('a[href*="Orijin"]')
        if (originLinks.length >= 2) {
          const sireLink = originLinks[0]
          const damLink = originLinks[1]
          const sireHref = sireLink.getAttribute('href') || ''
          const sireMatch = sireHref.match(/QueryParameter_BabaAdi=([^&]+)/)
          if (sireMatch) {
            sire = decodeURIComponent(sireMatch[1].replace(/\+/g, ' '))
          } else {
            sire = sireLink.textContent?.trim() || ''
          }
          const damHref = damLink.getAttribute('href') || ''
          const damMatch = damHref.match(/QueryParameter_AnneAdi=([^&]+)/)
          if (damMatch) {
            dam = decodeURIComponent(damMatch[1].replace(/\+/g, ' '))
          } else {
            dam = damLink.textContent?.trim() || ''
          }
        }
        
        const currentYear = new Date().getFullYear()
        let yob: number | undefined
        if (ageMatch) {
          const age = parseInt(ageMatch[1])
          yob = currentYear - age
        }
        
        let status = 'STALLION'
        if (gender && gender.toLowerCase().includes('dişi')) {
          status = 'MARE'
        } else if (ageText && ageText.toLowerCase().includes('tay')) {
          status = 'COLT'
        }
        
        if (name && horseId) {
          const cleanName = name.replace(/\(.*?\)/g, '').trim()
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
      })
      
      return results
    })

    console.log(`[TJK Playwright] Extracted ${initialHorses.length} horses from initial page`)
    allHorses = allHorses.concat(initialHorses)
    
    // Get pagination info from initial page
    const initialPaginationInfo = await page.evaluate(() => {
      const paginationText = document.body.textContent || ''
      const totalMatch = paginationText.match(/Toplam\s+(\d+)\s+sonuçtan/)
      const shownMatch = paginationText.match(/(\d+)\s+tanesi\s+gösteriliyor/)
      if (totalMatch && shownMatch) {
        return {
          total: parseInt(totalMatch[1]),
          shown: parseInt(shownMatch[1]),
        }
      }
      return null
    })
    
    if (initialPaginationInfo) {
      totalCount = initialPaginationInfo.total
      console.log(`[TJK Playwright] ✅ Initial page pagination: ${initialPaginationInfo.shown} of ${initialPaginationInfo.total} shown`)
      
      // If all results are shown on the initial page, skip DataRows fetching
      if (initialPaginationInfo.shown >= initialPaginationInfo.total) {
        console.log(`[TJK Playwright] ✅ All results fetched on initial page (${initialPaginationInfo.shown} of ${initialPaginationInfo.total}), skipping DataRows pages`)
        hasMorePages = false
      }
    }
    
    // Step 2: Continue with DataRows pages (PageNumber=1, 2, 3, etc.)
    // Note: PageNumber=1 in DataRows corresponds to the SECOND page of results (after the initial 50)
    let pageNumber = 1
    
    // Check if we already have all results from initial page
    if (totalCount && initialHorses.length >= totalCount) {
      console.log(`[TJK Playwright] ✅ All ${totalCount} horses already fetched from initial page, skipping DataRows`)
      hasMorePages = false
    }
    
    while (hasMorePages && pageNumber <= maxPages) {
      console.log(`[TJK Playwright] ===== Fetching DataRows page ${pageNumber} =====`)
      
      const resultsUrl = `https://www.tjk.org/TR/YarisSever/Query/DataRows/Atlar?QueryParameter_UzerineKosanSahipId=${ownerId}&QueryParameter_OLDUFLG=0&PageNumber=${pageNumber}&Sort=AtIsmi&X-Requested-With=XMLHttpRequest`
      
      console.log(`[TJK Playwright] URL: ${resultsUrl}`)
      
      // Navigate directly to DataRows endpoint
      await page.goto(resultsUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      
      console.log(`[TJK Playwright] Page loaded, waiting for results table...`)
      // Wait for either the results table or a "no results" message
      await Promise.race([
        page.waitForSelector('table tbody tr', { timeout: 15000 }),
        page.waitForSelector('.no-data, .nodata, :has-text("Kayıt bulunamadı"), :has-text("sonuçtan")', { timeout: 15000 }),
      ]).catch(() => {
        console.log(`[TJK Playwright] Timeout waiting for results, will try to extract anyway`)
      })
      
      // Give it extra time to fully render
      await page.waitForTimeout(2000)
      
      // Get page content for debugging
      const pageContent = await page.content()
      const pageText = await page.evaluate(() => document.body.textContent || '')
      console.log(`[TJK Playwright] Page content length: ${pageContent.length} chars, text length: ${pageText.length} chars`)
      
      // Check pagination info from the page
      const paginationInfo = await page.evaluate(() => {
        const paginationText = document.body.textContent || ''
        
        const totalMatch = paginationText.match(/Toplam\s+(\d+)\s+sonuçtan/)
        const shownMatch = paginationText.match(/(\d+)\s+tanesi\s+gösteriliyor/)
        
        if (totalMatch && shownMatch) {
          return {
            total: parseInt(totalMatch[1]),
            shown: parseInt(shownMatch[1]),
          }
        }
        return null
      })
      
      if (paginationInfo) {
        totalCount = paginationInfo.total
        console.log(`[TJK Playwright] ✅ Pagination: ${paginationInfo.shown} of ${paginationInfo.total} shown`)
      } else {
        console.log(`[TJK Playwright] ⚠️ No pagination info found`)
      }

      // Extract horse data from the current page
      console.log(`[TJK Playwright] Extracting horse data from page ${pageNumber}...`)
      
      // First, let's debug what's actually on the page
      const pageStructure = await page.evaluate(() => {
        const tables = document.querySelectorAll('table')
        const allRows = document.querySelectorAll('tr')
        const tbodyRows = document.querySelectorAll('tbody tr')
        const tableRows = document.querySelectorAll('table tbody tr')
        
        return {
          tableCount: tables.length,
          allRowCount: allRows.length,
          tbodyRowCount: tbodyRows.length,
          tableTbodyRowCount: tableRows.length,
          firstTableHTML: tables[0] ? tables[0].outerHTML.substring(0, 1000) : 'no tables',
          bodyHTML: document.body.innerHTML.substring(0, 2000),
        }
      })
      
      console.log(`[TJK Playwright] Page structure:`, JSON.stringify(pageStructure, null, 2))
      
      const pageHorses = await page.evaluate(() => {
      const results: any[] = []
      
      // DataRows endpoint returns div-based structure, not tables
      // Each horse is in a container (likely a div)
      // Let's find all containers that have horse name links
      const horseNameLinks = document.querySelectorAll('a[href*="QueryParameter_AtId"]')
      console.log('[Browser] Found', horseNameLinks.length, 'horse name links')
      
      if (horseNameLinks.length === 0) {
        console.log('[Browser] No horse links found, trying alternative selectors...')
        // Try finding any links with AtId
        const allLinks = Array.from(document.querySelectorAll('a'))
        const atIdLinks = allLinks.filter(link => {
          const href = link.getAttribute('href') || ''
          return href.includes('AtId') || href.includes('AtKosuBilgileri')
        })
        console.log('[Browser] Found', atIdLinks.length, 'links with AtId or AtKosuBilgileri')
        
        if (atIdLinks.length === 0) {
          return results
        }
        
        // Process each link's parent container
        atIdLinks.forEach((nameLink, index) => {
          // Find the parent container (likely a div)
          let container = nameLink.parentElement
          while (container && container.tagName !== 'DIV' && container !== document.body) {
            container = container.parentElement
          }
          
          if (!container) {
            console.warn('[Browser] Could not find container for horse', index)
            return
          }
          
          // Get all text nodes and links from the container
          const containerText = container.textContent || ''
          const containerHTML = container.innerHTML || ''
          
          // Extract horse name
          const name = nameLink.textContent?.trim() || ''
          
          // Extract horse ID from link
          const href = nameLink.getAttribute('href') || ''
          let horseId: string | undefined
          const atIdMatch = href.match(/QueryParameter_AtId=(\d+)/)
          if (atIdMatch) {
            horseId = atIdMatch[1]
          }
          
          // Parse the container text to extract fields
          // Structure appears to be: Name, Breed, Gender, Age, Origin, Owner, Real Owner, Breeder, Trainer, Date, Number
          const lines = containerText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
          
          // Breed is usually after the name
          let breed = ''
          let gender = ''
          let ageText = ''
          let sire = ''
          let dam = ''
          
          // Look for breed patterns (Arap, İngiliz, etc.)
          const breedPattern = /(Arap|İngiliz|Yarımkan|Thoroughbred)/i
          const breedMatch = containerText.match(breedPattern)
          if (breedMatch) {
            breed = breedMatch[1]
          }
          
          // Look for gender (Erkek, Dişi)
          const genderPattern = /(Erkek|Dişi)/i
          const genderMatch = containerText.match(genderPattern)
          if (genderMatch) {
            gender = genderMatch[1]
          }
          
          // Look for age pattern (e.g., "9 y dk")
          const agePattern = /(\d+)\s*y\s*[dkm]?[kd]?/i
          const ageMatch = containerText.match(agePattern)
          if (ageMatch) {
            ageText = ageMatch[0]
          }
          
          // Extract origin (Sire - Dam) from links in the container
          const originLinks = container.querySelectorAll('a[href*="Orijin"]')
          if (originLinks.length >= 2) {
            const sireLink = originLinks[0]
            const damLink = originLinks[1]
            
            // Try to get full name from title or href
            const sireHref = sireLink.getAttribute('href') || ''
            const sireMatch = sireHref.match(/QueryParameter_BabaAdi=([^&]+)/)
            if (sireMatch) {
              sire = decodeURIComponent(sireMatch[1].replace(/\+/g, ' '))
            } else {
              sire = sireLink.textContent?.trim() || ''
            }
            
            const damHref = damLink.getAttribute('href') || ''
            const damMatch = damHref.match(/QueryParameter_AnneAdi=([^&]+)/)
            if (damMatch) {
              dam = decodeURIComponent(damMatch[1].replace(/\+/g, ' '))
            } else {
              dam = damLink.textContent?.trim() || ''
            }
          }
          
          // Extract year of birth from age
          const currentYear = new Date().getFullYear()
          let yob: number | undefined
          if (ageMatch) {
            const age = parseInt(ageMatch[1])
            yob = currentYear - age
          }
          
          // Determine status from gender
          let status = 'STALLION'
          if (gender && gender.toLowerCase().includes('dişi')) {
            status = 'MARE'
          } else if (ageText && ageText.toLowerCase().includes('tay')) {
            status = 'COLT'
          }
          
          if (name && horseId) {
            results.push({
              name,
              yob,
              gender,
              breed,
              status,
              externalRef: horseId,
              sire: sire || undefined,
              dam: dam || undefined,
            })
          }
        })
        
        return results
      }
      
      // Process each horse container
      horseNameLinks.forEach((nameLink, index) => {
        // Find the parent container (likely a div)
        let container = nameLink.parentElement
        while (container && container.tagName !== 'DIV' && container !== document.body) {
          container = container.parentElement
        }
        
        if (!container) {
          console.warn('[Browser] Could not find container for horse', index)
          return
        }
        
        // Get all text nodes and links from the container
        const containerText = container.textContent || ''
        
        // Extract horse name
        const name = nameLink.textContent?.trim() || ''
        
        // Extract horse ID from link
        const href = nameLink.getAttribute('href') || ''
        let horseId: string | undefined
        const atIdMatch = href.match(/QueryParameter_AtId=(\d+)/)
        if (atIdMatch) {
          horseId = atIdMatch[1]
        }
        
        // Look for breed patterns (Arap, İngiliz, etc.)
        let breed = ''
        const breedPattern = /(Arap|İngiliz|Yarımkan|Thoroughbred)/i
        const breedMatch = containerText.match(breedPattern)
        if (breedMatch) {
          breed = breedMatch[1]
        }
        
        // Look for gender (Erkek, Dişi)
        let gender = ''
        const genderPattern = /(Erkek|Dişi)/i
        const genderMatch = containerText.match(genderPattern)
        if (genderMatch) {
          gender = genderMatch[1]
        }
        
        // Look for age pattern (e.g., "9 y dk")
        let ageText = ''
        const agePattern = /(\d+)\s*y\s*[dkm]?[kd]?/i
        const ageMatch = containerText.match(agePattern)
        if (ageMatch) {
          ageText = ageMatch[0]
        }
        
        // Extract origin (Sire - Dam) from links in the container
        let sire = ''
        let dam = ''
        const originLinks = container.querySelectorAll('a[href*="Orijin"]')
        if (originLinks.length >= 2) {
          const sireLink = originLinks[0]
          const damLink = originLinks[1]
          
          // Try to get full name from href parameter
          const sireHref = sireLink.getAttribute('href') || ''
          const sireMatch = sireHref.match(/QueryParameter_BabaAdi=([^&]+)/)
          if (sireMatch) {
            sire = decodeURIComponent(sireMatch[1].replace(/\+/g, ' '))
          } else {
            sire = sireLink.textContent?.trim() || ''
          }
          
          const damHref = damLink.getAttribute('href') || ''
          const damMatch = damHref.match(/QueryParameter_AnneAdi=([^&]+)/)
          if (damMatch) {
            dam = decodeURIComponent(damMatch[1].replace(/\+/g, ' '))
          } else {
            dam = damLink.textContent?.trim() || ''
          }
        }
        
        // Extract year of birth from age
        const currentYear = new Date().getFullYear()
        let yob: number | undefined
        if (ageMatch) {
          const age = parseInt(ageMatch[1])
          yob = currentYear - age
        }
        
        // Determine status from gender
        let status = 'STALLION'
        if (gender && gender.toLowerCase().includes('dişi')) {
          status = 'MARE'
        } else if (ageText && ageText.toLowerCase().includes('tay')) {
          status = 'COLT'
        }
        
        if (name && horseId) {
          const cleanName = name.replace(/\(.*?\)/g, '').trim() // Remove any parentheses
          console.log('[Browser] Adding horse:', cleanName, '| ID:', horseId, '| Status:', status, '| Sire:', sire, '| Dam:', dam)
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
      })

        console.log('[Browser] Extracted', results.length, 'horses from this page')
        return results
      })

      console.log(`[TJK Playwright] Extracted ${pageHorses.length} horses from page ${pageNumber}`)
      
      // Add horses from this page to the total
      allHorses = allHorses.concat(pageHorses)
      
      // Determine if there are more pages
      // Note: We've already fetched the initial 50 horses, so DataRows PageNumber=1 is the second page
      // Total fetched so far = initialHorses (50) + all DataRows pages
      const totalFetched = allHorses.length
      
      console.log(`[TJK Playwright] Checking pagination: pageHorses=${pageHorses.length}, pageSize=${pageSize}, totalFetched=${totalFetched}`)
      if (paginationInfo) {
        console.log(`[TJK Playwright] Pagination info: shown=${paginationInfo.shown}, total=${paginationInfo.total}`)
      }
      if (totalCount) {
        console.log(`[TJK Playwright] Expected total: ${totalCount}`)
      }
      
      if (pageHorses.length === 0) {
        // No horses on this page, we're done
        hasMorePages = false
        console.log(`[TJK Playwright] ✅ Last page reached - no horses found on DataRows page ${pageNumber}`)
      } else if (totalCount && totalFetched >= totalCount) {
        // We've fetched all expected horses
        hasMorePages = false
        console.log(`[TJK Playwright] ✅ Last page reached - fetched all ${totalCount} horses (got ${totalFetched})`)
      } else if (paginationInfo && paginationInfo.shown >= paginationInfo.total) {
        // We've shown all results according to pagination info
        hasMorePages = false
        console.log(`[TJK Playwright] ✅ Last page reached - all results shown (${paginationInfo.shown} of ${paginationInfo.total})`)
      } else if (pageHorses.length < pageSize) {
        // Got less than a full page, likely the last page
        hasMorePages = false
        console.log(`[TJK Playwright] ✅ Last page reached - got ${pageHorses.length} horses (less than ${pageSize})`)
      } else {
        // Full page of results, continue to next page
        pageNumber++
        const expectedTotal = totalCount ? ` (total: ${totalCount}, fetched: ${totalFetched})` : ''
        console.log(`[TJK Playwright] ➡️  More pages available, continuing to DataRows page ${pageNumber}${expectedTotal}...`)
      }
    }

    if (pageNumber > maxPages) {
      console.warn(`[TJK Playwright] Reached max pages limit (${maxPages}), stopping pagination`)
    }
    
    console.log(`[TJK Playwright] Finished fetching all pages. Total horses: ${allHorses.length}`)
    const horses = allHorses

    // Map to our format - status is already determined in the extraction phase
    const mappedHorses: TJKHorseResult[] = horses.map((horse: any) => {
      console.log('[TJK Playwright] Mapping horse:', horse.name, '| externalRef:', horse.externalRef)
      return {
        name: horse.name,
        yob: horse.yob,
        gender: horse.gender,
        status: horse.status || 'RACING', // Use status from extraction (DEAD, STALLION, MARE, or RACING)
        externalRef: horse.externalRef || undefined, // Preserve extracted horse ID
        sire: horse.sire,
        dam: horse.dam,
      }
    })
    
    console.log('[TJK Playwright] Mapped horses with externalRef:', mappedHorses.filter(h => h.externalRef).length, 'out of', mappedHorses.length)

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

