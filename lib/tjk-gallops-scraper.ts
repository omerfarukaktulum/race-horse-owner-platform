/**
 * TJK Gallops (İdman) Scraper
 * Fetches gallop/workout data for horses from TJK's İdman İstatistikleri page
 * URL: https://www.tjk.org/TR/YarisSever/Query/Page/IdmanIstatistikleri?QueryParameter_AtId={horseId}
 */

import { chromium, Browser, Page } from 'playwright'

export interface GallopData {
  date: string          // Date of gallop (DD.MM.YYYY format)
  distances: {          // All distances with times for this training session
    [distance: number]: string  // e.g., { 1400: "1.02.20", 400: "0.38.50" }
  }
  status?: string       // Durum (Status)
  racecourse?: string   // İ. Hip. (Training Racecourse)
  surface?: string      // Pist (Surface)
  jockeyName?: string   // İ. Jokeyi (Training Jockey)
  horseId: string       // Horse ID for reference
  horseName: string     // Horse name for display
}

let browser: Browser | null = null

/**
 * Fetch gallop data for a specific horse from TJK
 * @param horseId - TJK horse ID
 * @param horseName - Horse name for display
 * @param days - Number of days to look back (default 7)
 */
export async function fetchTJKHorseGallops(
  horseId: string,
  horseName: string,
  days: number = 7
): Promise<GallopData[]> {
  let page: Page | null = null

  try {
    if (!browser) {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'tr-TR',
    })

    page = await context.newPage()

    const gallopUrl = `https://www.tjk.org/TR/YarisSever/Query/Page/IdmanIstatistikleri?QueryParameter_AtId=${horseId}`
    
    console.log('[TJK Gallops] Fetching gallops for horse:', horseName, 'ID:', horseId)
    
    await page.goto(gallopUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Extract gallop data from the page
    const gallops = await page.evaluate((daysParam: number) => {
      const days = daysParam
      const results: any[] = []
      
      // Find the gallops table - it has distance columns (1400m, 1200m, 1000m, etc.)
      const tables = document.querySelectorAll('table')
      let gallopTable: HTMLTableElement | null = null
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i] as HTMLTableElement
        const headerText = table.textContent || ''
        // Look for the İdman İstatistikleri table with distance columns
        if (headerText.includes('İ. Tarihi') || (headerText.includes('1400m') && headerText.includes('1200m'))) {
          gallopTable = table
          break
        }
      }

      if (!gallopTable) {
        console.log('[Browser] No gallop table found')
        return results
      }

      // Find header row to identify column indices
      const headerRow = gallopTable.querySelector('thead tr, tr:first-child')
      const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th, td')) : []
      
      // Distance column indices (1400m, 1200m, 1000m, 800m, 600m, 400m, 200m)
      const distanceColumns: { distance: number; index: number }[] = []
      let dateColIndex = -1
      let statusColIndex = -1
      let racecourseColIndex = -1
      let surfaceColIndex = -1
      let jockeyColIndex = -1
      
      headerCells.forEach((cell, index) => {
        const text = cell.textContent?.trim() || ''
        const textLower = text.toLowerCase()
        
        // Match distance columns (1400m, 1200m, etc.)
        const distanceMatch = text.match(/(\d+)m/i)
        if (distanceMatch) {
          distanceColumns.push({ distance: parseInt(distanceMatch[1]), index })
        }
        // Match date column
        else if (textLower.includes('i. tarihi') || textLower.includes('tarih')) {
          dateColIndex = index
        }
        // Match status column (Durum)
        else if (textLower.includes('durum') || text === 'Durum') {
          statusColIndex = index
        }
        // Match racecourse column
        else if (textLower.includes('i. hip') || textLower.includes('hipodrom')) {
          racecourseColIndex = index
        }
        // Match surface column
        else if (textLower.includes('pist')) {
          surfaceColIndex = index
        }
        // Match jockey column
        else if (textLower.includes('i. jokeyi') || textLower.includes('jokey')) {
          jockeyColIndex = index
        }
      })
      
      console.log('[Browser] Found distance columns:', distanceColumns.map(d => `${d.distance}m`).join(', '))
      console.log('[Browser] Date col:', dateColIndex, 'Status col:', statusColIndex, 'Racecourse col:', racecourseColIndex, 'Surface col:', surfaceColIndex, 'Jockey col:', jockeyColIndex)
      
      // Calculate cutoff date (last X days)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      cutoffDate.setHours(0, 0, 0, 0)
      
      const rows = gallopTable.querySelectorAll('tbody tr, tr')
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        
        // Skip if not enough cells or if it's a header row
        if (cells.length < 5) return
        
        const firstCellText = cells[0]?.textContent?.trim() || ''
        if (firstCellText === 'At Adı' || firstCellText === '' || firstCellText.includes('At Adı')) return
        
        // Parse date (format: DD.MM.YYYY)
        let dateText = ''
        if (dateColIndex >= 0 && cells[dateColIndex]) {
          dateText = cells[dateColIndex]?.textContent?.trim() || ''
        }
        
        // Skip if no valid date
        if (!dateText || !dateText.match(/\d{2}\.\d{2}\.\d{4}/)) return
        
        // Parse date and check if within range
        const dateParts = dateText.split('.')
        if (dateParts.length !== 3) return
        
        const gallopDate = new Date(
          parseInt(dateParts[2]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[0])
        )
        gallopDate.setHours(0, 0, 0, 0)
        
        // Skip if older than cutoff date
        if (gallopDate < cutoffDate) return
        
        // Parse status (Durum)
        let status = ''
        if (statusColIndex >= 0 && cells[statusColIndex]) {
          status = cells[statusColIndex]?.textContent?.trim() || ''
        }
        
        // Parse racecourse (optional)
        let racecourse = ''
        if (racecourseColIndex >= 0 && cells[racecourseColIndex]) {
          racecourse = cells[racecourseColIndex]?.textContent?.trim() || ''
        }
        
        // Parse surface (optional)
        let surface = ''
        if (surfaceColIndex >= 0 && cells[surfaceColIndex]) {
          surface = cells[surfaceColIndex]?.textContent?.trim() || ''
        }
        
        // Parse jockey (optional)
        let jockeyName = ''
        if (jockeyColIndex >= 0 && cells[jockeyColIndex]) {
          jockeyName = cells[jockeyColIndex]?.textContent?.trim() || ''
        }
        
        // Collect all distances with times for this training session
        const distances: { [distance: number]: string } = {}
        distanceColumns.forEach(({ distance, index }) => {
          if (index >= 0 && index < cells.length) {
            const timeText = cells[index]?.textContent?.trim() || ''
            
            // If there's a time value (format like "0.38.50" or "1.02.20")
            if (timeText && timeText.match(/\d+\.\d+\.\d+/)) {
              distances[distance] = timeText
            }
          }
        })
        
        // Only add if there's at least one distance with time
        if (Object.keys(distances).length > 0) {
          results.push({
            date: dateText,
            distances,
            status: status || undefined,
            racecourse: racecourse || undefined,
            surface: surface || undefined,
            jockeyName: jockeyName || undefined,
          })
        }
      })

      console.log('[Browser] Extracted', results.length, 'gallops')
      return results
    }, days)

    await context.close()
    
    console.log('[TJK Gallops] Successfully fetched', gallops.length, 'gallops for horse:', horseName)
    
    // Add horse info to each gallop and filter by days
    const gallopsWithHorseInfo = gallops.map((gallop: any) => ({
      ...gallop,
      horseId,
      horseName,
    }))
    
    // Filter by days (already done during scraping, but double-check)
    return filterGallopsByDays(gallopsWithHorseInfo, days)

  } catch (error: any) {
    console.error('[TJK Gallops] Error fetching gallops for horse:', horseName, error.message)
    throw error
  }
}

/**
 * Filter gallops by date range (last X days)
 */
export function filterGallopsByDays(gallops: GallopData[], days: number): GallopData[] {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  cutoffDate.setHours(0, 0, 0, 0)
  
  return gallops.filter((gallop) => {
    // Parse date from DD.MM.YYYY format
    const dateParts = gallop.date.split('.')
    if (dateParts.length !== 3) return false
    
    const gallopDate = new Date(
      parseInt(dateParts[2]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[0])
    )
    gallopDate.setHours(0, 0, 0, 0)
    
    return gallopDate >= cutoffDate
  })
}

/**
 * Close the browser instance (call when done with all requests)
 */
export async function closeGallopsBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}

