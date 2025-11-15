/**
 * TJK Owner Races Scraper
 * Fetches all race data for horses owned by a specific owner
 * URL: https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?QueryParameter_SahipId={ownerId}&QueryParameter_SehirId=-1&QueryParameter_YIL=-1
 */

import { chromium, Browser, Page } from 'playwright'

export interface OwnerRaceData {
  date: string          // Race date (DD.MM.YYYY)
  horseName: string     // Horse name (At İsmi)
  city: string          // City (Şehir)
  distance?: number     // Distance in meters (Msf)
  surface?: string      // Surface type (Pist)
  position?: number     // Finish position (S - Derece)
  raceType?: string     // Race type (Kcins)
  prizeMoney?: string   // Prize money (İkramiye)
  jockeyName?: string   // Jockey name (for declarations)
  registrationStatus?: string // "Kayıt", "Deklare", "Kayıt Koşmaz", "Deklare Koşmaz"
}

let browser: Browser | null = null

/**
 * Fetch all races for horses owned by a specific owner from TJK
 * @param ownerId - TJK owner ID
 * @param includeKosmaz - If true, includes registrations/declarations (QueryParameter_Kosmaz=on)
 */
export async function fetchTJKOwnerRaces(
  ownerId: string,
  includeKosmaz: boolean = false
): Promise<OwnerRaceData[]> {
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

    // Forward browser console logs to terminal
    page.on('console', (msg) => {
      const text = msg.text()
      const type = msg.type()
      if (type === 'error') {
        console.error('[Browser]', text)
      } else if (type === 'warning') {
        console.warn('[Browser]', text)
      } else {
        console.log('[Browser]', text)
      }
    })

    // Build URL with optional QueryParameter_Kosmaz=on for registrations/declarations
    let racesUrl = `https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?QueryParameter_SahipId=${ownerId}&QueryParameter_SehirId=-1&QueryParameter_YIL=-1&QueryParameter_PistKodu=-1&QueryParameter_MesafeStart=-1&QueryParameter_MesafeEnd=-1`
    
    if (includeKosmaz) {
      racesUrl += `&QueryParameter_Kosmaz=on`
    }
    
    console.log('[TJK Owner Races] Fetching races for owner ID:', ownerId)
    
    await page.goto(racesUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Extract race data from the page
    const races = await page.evaluate(() => {
      const results: any[] = []
      
      // Find the races table
      const tables = document.querySelectorAll('table')
      let raceTable: HTMLTableElement | null = null
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i] as HTMLTableElement
        const headerText = table.textContent || ''
        if (headerText.includes('Tarih') && headerText.includes('At İsmi') && headerText.includes('Şehir')) {
          raceTable = table
          break
        }
      }

      if (!raceTable) {
        console.log('[Browser] No race table found')
        return results
      }

      // Find header row to identify column indices
      const headerRow = raceTable.querySelector('thead tr, tr:first-child')
      const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th, td')) : []
      
      // Log all header cells for debugging
      console.log('[Browser] ===== HEADER DETECTION =====')
      console.log('[Browser] Total header cells:', headerCells.length)
      headerCells.forEach((cell, index) => {
        const exactText = cell.textContent?.trim() || ''
        console.log(`[Browser]   Header[${index}]: "${exactText}"`)
      })
      
      let dateColIndex = -1
      let horseNameColIndex = -1
      let cityColIndex = -1
      let distanceColIndex = -1
      let surfaceColIndex = -1
      let positionColIndex = -1
      let raceTypeColIndex = -1
      let prizeMoneyColIndex = -1
      let jockeyColIndex = -1
      
      // Track Derece column index separately to ensure we don't use it for position
      let dereceColIndex = -1
      
      headerCells.forEach((cell, index) => {
        const text = cell.textContent?.trim().toLowerCase() || ''
        const exactText = cell.textContent?.trim() || ''
        
        if (text.includes('tarih') || text.includes('date')) {
          dateColIndex = index
          console.log('[Browser] ✓ Date column at index', index)
        }
        else if (text.includes('at i') || text.includes('at İsmi') || text.includes('horse')) {
          horseNameColIndex = index
          console.log('[Browser] ✓ Horse name column at index', index)
        }
        else if (text.includes('şehir') || text.includes('city')) {
          cityColIndex = index
          console.log('[Browser] ✓ City column at index', index)
        }
        else if (text.includes('msf') || text.includes('mesafe') || text.includes('distance')) {
          distanceColIndex = index
          console.log('[Browser] ✓ Distance column at index', index)
        }
        else if (text.includes('pist') || text.includes('surface')) {
          surfaceColIndex = index
          console.log('[Browser] ✓ Surface column at index', index)
        }
        // IMPORTANT: Match ONLY "S" exactly for position, NOT "Derece"
        // "S" = finish position (7, 3, etc.)
        // "Derece" = race time (1.33.94, etc.)
        // Check for exact match "S" and also check that it's NOT "Derece"
        else if (exactText === 'S' && !text.includes('derece')) {
          positionColIndex = index
          console.log('[Browser] ✓ Found S column (position) at index', index)
        }
        // Also check for "Derece" to ensure we don't confuse it with "S"
        else if (text.includes('derece') || exactText === 'Derece') {
          dereceColIndex = index
          console.log('[Browser] ✓ Found Derece column (time) at index', index, '- skipping for position')
        }
        else if (text.includes('kcins') || text.includes('k.cins') || text.includes('koşu tipi')) {
          raceTypeColIndex = index
          console.log('[Browser] ✓ Race type column at index', index)
        }
        else if (text.includes('ikramiye') || text.includes('prize')) {
          prizeMoneyColIndex = index
          console.log('[Browser] ✓ Prize money column at index', index)
        }
        else if (text.includes('jokey') || text.includes('jockey')) {
          jockeyColIndex = index
          console.log('[Browser] ✓ Jockey column at index', index)
        }
      })
      
      // Safety check: if positionColIndex equals dereceColIndex, we have a problem
      if (positionColIndex === dereceColIndex && positionColIndex !== -1) {
        console.error('[Browser] ERROR: Position column index matches Derece column index!', positionColIndex)
        positionColIndex = -1 // Reset to force fallback
      }
      
      console.log('[Browser] Column indices - Date:', dateColIndex, 'Horse:', horseNameColIndex, 'City:', cityColIndex, 'Distance:', distanceColIndex, 'Surface:', surfaceColIndex, 'Position:', positionColIndex, 'RaceType:', raceTypeColIndex, 'PrizeMoney:', prizeMoneyColIndex)
      
      // Fallback to default indices if headers not found
      if (dateColIndex === -1) dateColIndex = 0
      if (horseNameColIndex === -1) horseNameColIndex = 1
      if (cityColIndex === -1) cityColIndex = 2
      if (distanceColIndex === -1) distanceColIndex = 3
      if (surfaceColIndex === -1) surfaceColIndex = 4
      
      // For position: if not found, try to infer from Derece column (S should be before Derece)
      if (positionColIndex === -1) {
        if (dereceColIndex !== -1 && dereceColIndex > 0) {
          // S column should be right before Derece
          positionColIndex = dereceColIndex - 1
          console.log('[Browser] Using fallback: S column should be at index', positionColIndex, '(before Derece at', dereceColIndex, ')')
        } else {
          // Default fallback (but this might be wrong)
          positionColIndex = 5
          console.warn('[Browser] WARNING: Using default position column index 5 (may be incorrect)')
        }
      }
      
      if (raceTypeColIndex === -1) raceTypeColIndex = 14 // Usually around column 14
      if (prizeMoneyColIndex === -1) prizeMoneyColIndex = 15 // Usually around column 15
      if (jockeyColIndex === -1) jockeyColIndex = 8 // Usually around column 8
      
      console.log('[Browser] Final column indices - Position:', positionColIndex, 'Derece:', dereceColIndex)
      
      const rows = raceTable.querySelectorAll('tbody tr, tr')
      let rowIndex = 0
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        
        // Skip if not enough cells or if it's a header row
        if (cells.length < 5) return
        
        const firstCellText = cells[0]?.textContent?.trim() || ''
        if (firstCellText === 'Tarih' || firstCellText === '') return
        
        // Debug first few rows - show ALL cells with their indices
        if (rowIndex < 5) {
          console.log('[Browser] ===== Row', rowIndex, '=====')
          console.log('[Browser] Total cells:', cells.length)
          for (let i = 0; i < Math.min(20, cells.length); i++) {
            const cellText = cells[i]?.textContent?.trim() || ''
            const isPositionCol = i === positionColIndex
            const isDereceCol = i === dereceColIndex
            const marker = isPositionCol ? ' <-- POSITION COL' : (isDereceCol ? ' <-- DERECE COL' : '')
            console.log(`[Browser]   Cell[${i}]: "${cellText}"${marker}`)
          }
        }
        rowIndex++
        
        // Parse date (format: DD.MM.YYYY)
        const dateCell = cells[dateColIndex]
        const dateLink = dateCell?.querySelector('a')
        const dateText = dateLink?.textContent?.trim() || dateCell?.textContent?.trim() || ''
        
        // Skip if no valid date
        if (!dateText || !dateText.match(/\d{2}\.\d{2}\.\d{4}/)) return
        
        // Parse horse name
        const horseNameCell = cells[horseNameColIndex]
        const horseNameLink = horseNameCell?.querySelector('a')
        const horseName = horseNameLink?.textContent?.trim() || horseNameCell?.textContent?.trim() || ''
        
        if (!horseName) return
        
        // Parse city
        const cityCell = cells[cityColIndex]
        const cityLink = cityCell?.querySelector('a')
        const city = cityLink?.textContent?.trim() || cityCell?.textContent?.trim() || ''
        
        // Parse distance (meters)
        const distanceCell = cells[distanceColIndex]
        const distanceText = distanceCell?.textContent?.trim() || ''
        const distance = distanceText ? parseInt(distanceText) : undefined
        
        // Parse surface (format: "Ç:Normal 3.3" or "K:Normal")
        const surfaceCell = cells[surfaceColIndex]
        const surface = surfaceCell?.textContent?.trim() || undefined
        
        // Parse position from "S" column (NOT "Derece")
        // "S" column contains the finish position (7, 3, 12, etc.)
        // "Derece" column contains the race time (1.33.94, etc.)
        const positionCell = cells[positionColIndex]
        const positionText = positionCell?.textContent?.trim() || ''
        let position: number | undefined
        
        // Debug position extraction for first few rows
        if (rowIndex <= 3) {
          console.log('[Browser] Position extraction for', horseName, '- using column', positionColIndex, '- text:', positionText)
          // Also check adjacent columns to see if we're reading the wrong one
          if (cells[positionColIndex - 1]) {
            const prevCellText = cells[positionColIndex - 1]?.textContent?.trim() || ''
            console.log('[Browser] Previous column (', positionColIndex - 1, ') text:', prevCellText)
          }
          if (cells[positionColIndex + 1]) {
            const nextCellText = cells[positionColIndex + 1]?.textContent?.trim() || ''
            console.log('[Browser] Next column (', positionColIndex + 1, ') text:', nextCellText)
          }
        }
        
        // CRITICAL: Check if we're accidentally reading from Derece column
        // If positionColIndex equals dereceColIndex, we MUST use the previous column
        if (positionColIndex === dereceColIndex && dereceColIndex !== -1) {
          console.error('[Browser] CRITICAL ERROR: Position column index equals Derece column index!', positionColIndex)
          if (cells[positionColIndex - 1]) {
            const prevCellText = cells[positionColIndex - 1]?.textContent?.trim() || ''
            const prevParsed = parseInt(prevCellText)
            if (!isNaN(prevParsed) && prevParsed > 0 && prevParsed <= 20) {
              console.log('[Browser] Using previous column (', positionColIndex - 1, ') as position due to column mismatch:', prevParsed)
              position = prevParsed
            }
          }
        } else if (positionText && positionText !== '') {
          // The "S" column should contain only simple integers (no decimals, no colons)
          // If we see decimals or colons, we're reading the wrong column (probably "Derece"/time)
          // Also check if it looks like a time format (e.g., "2.34.13" has multiple dots)
          const hasDecimal = positionText.includes('.')
          const hasColon = positionText.includes(':')
          const dotCount = positionText.split('.').length - 1
          const isTimeFormat = hasDecimal || hasColon || dotCount > 1 // Multiple dots = time format like "2.34.13"
          
          if (isTimeFormat) {
            // This is a time from "Derece" column, not a position!
            console.error('[Browser] ERROR: Reading time instead of position! Column', positionColIndex, 'contains:', positionText)
            console.error('[Browser] This means we are reading "Derece" column instead of "S" column')
            // Try the previous column as fallback (S should be before Derece)
            if (cells[positionColIndex - 1]) {
              const prevCellText = cells[positionColIndex - 1]?.textContent?.trim() || ''
              if (prevCellText && !prevCellText.includes('.') && !prevCellText.includes(':')) {
                const parsed = parseInt(prevCellText)
                if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
                  console.log('[Browser] Using previous column (', positionColIndex - 1, ') as position:', parsed, 'instead of time:', positionText)
                  position = parsed
                } else {
                  console.error('[Browser] Previous column also invalid:', prevCellText)
                }
              } else {
                console.error('[Browser] Previous column also looks like time:', prevCellText)
              }
            } else {
              console.error('[Browser] No previous column available')
            }
          } else {
            // Try to parse the position - it should be a simple number (1-20 typically)
            const parsed = parseInt(positionText)
            // Additional validation: if parsed value is very small (1-3) and the original text had dots,
            // it might be a time that was partially parsed (e.g., "2.34.13" -> 2)
            if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
              // Double-check: if the original text has any dots, it's likely a time
              if (hasDecimal && parsed <= 3) {
                console.warn('[Browser] WARNING: Position', parsed, 'looks suspicious (has decimal, might be time). Original text:', positionText)
                // Try previous column
                if (cells[positionColIndex - 1]) {
                  const prevCellText = cells[positionColIndex - 1]?.textContent?.trim() || ''
                  if (prevCellText && !prevCellText.includes('.') && !prevCellText.includes(':')) {
                    const prevParsed = parseInt(prevCellText)
                    if (!isNaN(prevParsed) && prevParsed > 0 && prevParsed <= 20) {
                      console.log('[Browser] Using previous column instead of suspicious value:', prevParsed, 'vs', parsed)
                      position = prevParsed
                    } else {
                      position = parsed
                    }
                  } else {
                    position = parsed
                  }
                } else {
                  position = parsed
                }
              } else {
                position = parsed
                if (rowIndex <= 3) {
                  console.log('[Browser] ✓ Found position:', position, 'for', horseName, 'on', dateText)
                }
              }
            } else {
              // If it's not a valid number, it might be empty for future races
              if (rowIndex <= 3) {
                console.log('[Browser] Position text not a valid number:', positionText, 'for', horseName)
                // Try previous column as fallback
                if (cells[positionColIndex - 1]) {
                  const prevCellText = cells[positionColIndex - 1]?.textContent?.trim() || ''
                  if (prevCellText && !prevCellText.includes('.') && !prevCellText.includes(':')) {
                    const prevParsed = parseInt(prevCellText)
                    if (!isNaN(prevParsed) && prevParsed > 0 && prevParsed <= 20) {
                      console.log('[Browser] Using previous column as position fallback:', prevParsed)
                      position = prevParsed
                    }
                  }
                }
              }
            }
          }
        } else {
          // Empty position - might be a future race, but try previous column just in case
          if (cells[positionColIndex - 1]) {
            const prevCellText = cells[positionColIndex - 1]?.textContent?.trim() || ''
            if (prevCellText && !prevCellText.includes('.') && !prevCellText.includes(':')) {
              const parsed = parseInt(prevCellText)
              if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
                console.log('[Browser] Using previous column as position (empty cell):', parsed)
                position = parsed
              }
            }
          }
        }
        
        // Parse race type (Kcins)
        const raceTypeCell = cells[raceTypeColIndex]
        const raceType = raceTypeCell?.textContent?.trim() || undefined
        
        // Parse prize money (İkramiye)
        let prizeMoney: string | undefined
        if (prizeMoneyColIndex >= 0 && cells[prizeMoneyColIndex]) {
          const prizeCell = cells[prizeMoneyColIndex]
          const prizeText = prizeCell?.textContent?.trim() || ''
          if (prizeText && prizeText !== '0' && prizeText !== '') {
            // Remove dots (thousand separators) and keep the number
            prizeMoney = prizeText.replace(/\./g, '')
          }
        }
        
        // Parse jockey name (for declarations)
        let jockeyName: string | undefined
        let registrationStatus: string | undefined
        if (jockeyColIndex >= 0 && cells[jockeyColIndex]) {
          const jockeyCell = cells[jockeyColIndex]
          const jockeyLink = jockeyCell?.querySelector('a')
          jockeyName = jockeyLink?.textContent?.trim() || jockeyCell?.textContent?.trim() || undefined
          
          // Determine registration status
          // Check if the cell contains "Kayıt" or "Deklare" or "Koşmaz"
          const cellText = jockeyCell?.textContent?.trim() || ''
          if (cellText.includes('Kayıt Koşmaz')) {
            registrationStatus = 'Kayıt Koşmaz'
          } else if (cellText.includes('Deklare Koşmaz')) {
            registrationStatus = 'Deklare Koşmaz'
          } else if (cellText.includes('Kayıt') && !jockeyName) {
            registrationStatus = 'Kayıt'
          } else if (jockeyName && jockeyName.trim() !== '') {
            registrationStatus = 'Deklare'
          }
        } else {
          // If no jockey column, check if there's a "Kayıt" text somewhere in the row
          const rowText = row.textContent || ''
          if (rowText.includes('Kayıt Koşmaz')) {
            registrationStatus = 'Kayıt Koşmaz'
          } else if (rowText.includes('Kayıt') && !rowText.includes('Koşmaz')) {
            registrationStatus = 'Kayıt'
          }
        }
        
        const raceData = {
          date: dateText,
          horseName,
          city,
          distance,
          surface,
          position,
          raceType,
          prizeMoney,
          jockeyName,
          registrationStatus,
        }
        
        // Log extracted data for first few races
        if (results.length < 3) {
          console.log('[Browser] Extracted race data:', JSON.stringify(raceData, null, 2))
        }
        
        results.push(raceData)
      })

      console.log('[Browser] Extracted', results.length, 'races')
      return results
    })

    await context.close()
    
    console.log('[TJK Owner Races] Successfully fetched', races.length, 'races')
    
    return races

  } catch (error: any) {
    console.error('[TJK Owner Races] Error fetching races:', error.message)
    throw error
  }
}

/**
 * Filter races by date range (most recent X items)
 */
export function filterRecentRaces(races: OwnerRaceData[], limit: number): OwnerRaceData[] {
  // Sort by date (most recent first)
  const sorted = [...races].sort((a, b) => {
    const dateA = parseRaceDate(a.date)
    const dateB = parseRaceDate(b.date)
    return dateB.getTime() - dateA.getTime()
  })
  
  return sorted.slice(0, limit)
}

/**
 * Filter registrations and declarations (future races with registration status)
 */
export function filterRegistrationsAndDeclarations(races: OwnerRaceData[]): OwnerRaceData[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today
  
  return races.filter((race) => {
    const raceDate = parseRaceDate(race.date)
    
    // Must be future date
    if (raceDate < now) return false
    
    // Must have registration status
    if (!race.registrationStatus) return false
    
    // Exclude cancellations
    if (race.registrationStatus === 'Kayıt Koşmaz' || race.registrationStatus === 'Deklare Koşmaz') {
      return false
    }
    
    // Include only "Kayıt" or "Deklare"
    return race.registrationStatus === 'Kayıt' || race.registrationStatus === 'Deklare'
  })
}

/**
 * Filter future races (registrations/declarations)
 */
export function filterFutureRaces(races: OwnerRaceData[]): OwnerRaceData[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today
  
  return races.filter((race) => {
    const raceDate = parseRaceDate(race.date)
    return raceDate >= now
  })
}

/**
 * Filter past races
 */
export function filterPastRaces(races: OwnerRaceData[]): OwnerRaceData[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today
  
  return races.filter((race) => {
    const raceDate = parseRaceDate(race.date)
    return raceDate < now
  })
}

function parseRaceDate(dateStr: string): Date {
  // Parse DD.MM.YYYY format
  const parts = dateStr.split('.')
  if (parts.length !== 3) return new Date()
  
  return new Date(
    parseInt(parts[2]),
    parseInt(parts[1]) - 1,
    parseInt(parts[0])
  )
}

/**
 * Close the browser instance (call when done with all requests)
 */
export async function closeOwnerRacesBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}

