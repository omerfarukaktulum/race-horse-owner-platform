/**
 * TJK Horse Detail Scraper
 * Fetches detailed information about a horse from TJK's horse detail page
 * URL: https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId={horseId}
 */

import { chromium, Browser, Page } from 'playwright'

export interface HorseDetailData {
  // Basic info
  handicapPoints?: number
  totalEarnings?: number
  prizeMoney?: number
  ownerPremium?: number
  breederPremium?: number
  
  // Race statistics
  totalRaces?: number
  firstPlaces?: number
  secondPlaces?: number
  thirdPlaces?: number
  fourthPlaces?: number
  fifthPlaces?: number
  
  // Surface statistics
  turfRaces?: number
  turfFirsts?: number
  turfEarnings?: number
  dirtRaces?: number
  dirtFirsts?: number
  dirtEarnings?: number
  syntheticRaces?: number
  syntheticFirsts?: number
  syntheticEarnings?: number
  
  // Pedigree
  sireName?: string
  damName?: string
  sireSire?: string
  sireDam?: string
  damSire?: string
  damDam?: string
  
  // Race history (past races)
  races: RaceHistoryItem[]
  
  // Registrations and declarations (future races)
  registrations: RegistrationItem[]
}

export interface RaceHistoryItem {
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  surfaceType?: string
  position?: number  // "S" column (position)
  derece?: string     // "Derece" column (time elapsed, e.g., "2.34.13")
  weight?: number
  jockeyName?: string
  jockeyId?: string
  raceNumber?: number
  raceName?: string
  raceType?: string
  trainerName?: string
  trainerId?: string
  handicapPoints?: number
  prizeMoney?: number
  videoUrl?: string
  photoUrl?: string
}

export interface RegistrationItem {
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  surfaceType?: string
  raceType?: string
  type: 'Kayıt' | 'Deklare'  // Registration type
  jockeyName?: string
  jockeyId?: string
}

let browser: Browser | null = null

/**
 * Fetch detailed horse data from TJK
 */
export async function fetchTJKHorseDetail(horseId: string): Promise<HorseDetailData | null> {
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

    // Build URL with parameters to show all races including future registrations/declarations
    // QueryParameter_Kosmaz=on is required to see all registrations (including future ones)
    const detailUrl = `https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?QueryParameter_Yil=-1&QueryParameter_SehirId=-1&QueryParameter_PistKodu=-1&QueryParameter_MesafeStart=-1&QueryParameter_MesafeEnd=-1&QueryParameter_Kosmaz=on&QueryParameter_AtId=${horseId}&Sort=`
    
    console.log('[TJK Horse Detail] Fetching:', detailUrl)
    
    await page.goto(detailUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Scroll to bottom to ensure all rows are loaded (especially for registrations)
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(1000)
    
    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(500)

    // Navigate to Pedigri tab to get full pedigree data
    try {
      const pedigriTab = page.locator('text=Pedigri').first()
      if (await pedigriTab.isVisible({ timeout: 3000 })) {
        await pedigriTab.click()
        await page.waitForTimeout(1500) // Wait for tab content to load
      }
    } catch (e) {
      console.log('[TJK Horse Detail] Pedigri tab not found or not clickable, using default view')
    }
    
    // Scroll again after tab navigation
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(1000)

    // Extract data from the page
    const data = await page.evaluate(() => {
      const result: HorseDetailData = {
        races: [],
        registrations: [],
      }

      // Extract basic information from the horse info section
      const bodyText = document.body.textContent || ''
      
      // Handicap Points - look for "Handikap P. 93" pattern
      const handicapMatch = bodyText.match(/Handikap\s+P\.?\s*(\d+)/i)
      if (handicapMatch) {
        result.handicapPoints = parseInt(handicapMatch[1])
      }

      // Extract financial data - look for patterns like "İkramiye 757.300t"
      const prizeMatch = bodyText.match(/İkramiye\s+([\d.,]+)\s*t/i)
      if (prizeMatch) {
        result.prizeMoney = parseFloat(prizeMatch[1].replace(/\./g, '').replace(',', '.'))
      }

      const ownerPremiumMatch = bodyText.match(/At\s+Sahibi\s+Primi\s+([\d.,]+)\s*t/i)
      if (ownerPremiumMatch) {
        result.ownerPremium = parseFloat(ownerPremiumMatch[1].replace(/\./g, '').replace(',', '.'))
      }

      const breederPremiumMatch = bodyText.match(/Yetiştiricilik\s+Primi\s+([\d.,]+)\s*t/i)
      if (breederPremiumMatch) {
        result.breederPremium = parseFloat(breederPremiumMatch[1].replace(/\./g, '').replace(',', '.'))
      }

      const totalEarningsMatch = bodyText.match(/Kazanç\s+([\d.,]+)\s*t/i)
      if (totalEarningsMatch) {
        result.totalEarnings = parseFloat(totalEarningsMatch[1].replace(/\./g, '').replace(',', '.'))
      }

      // Extract statistics from the summary table
      const statsTable = document.querySelector('table')
      if (statsTable) {
        const rows = statsTable.querySelectorAll('tr')
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td')
          if (cells.length >= 7) {
            const label = cells[0]?.textContent?.trim()
            const races = parseInt(cells[1]?.textContent?.trim() || '0')
            const firsts = parseInt(cells[2]?.textContent?.trim() || '0')
            const seconds = parseInt(cells[3]?.textContent?.trim() || '0')
            const thirds = parseInt(cells[4]?.textContent?.trim() || '0')
            const fourths = parseInt(cells[5]?.textContent?.trim() || '0')
            const fifths = parseInt(cells[6]?.textContent?.trim() || '0')
            const earningsText = cells[7]?.textContent?.trim() || '0 t'
            const earnings = parseFloat(earningsText.replace(/\./g, '').replace(',', '.').replace(' t', ''))

            if (label === 'TOPLAM') {
              result.totalRaces = races
              result.firstPlaces = firsts
              result.secondPlaces = seconds
              result.thirdPlaces = thirds
              result.fourthPlaces = fourths
              result.fifthPlaces = fifths
            } else if (label === 'Çim') {
              result.turfRaces = races
              result.turfFirsts = firsts
              result.turfEarnings = earnings
            } else if (label === 'Kum') {
              result.dirtRaces = races
              result.dirtFirsts = firsts
              result.dirtEarnings = earnings
            } else if (label === 'Sentetik') {
              result.syntheticRaces = races
              result.syntheticFirsts = firsts
              result.syntheticEarnings = earnings
            }
          }
        })
      }

      // PRIMARY METHOD: Extract from span.key and span.value structure
      // This is the most reliable method as it directly matches the HTML structure
      // Format: <span class="key">Baba</span><span class="value"><a>DAI JIN (GB)</a></span>
      const keySpans = document.querySelectorAll('span.key')
      for (const keySpan of keySpans) {
        const keyText = keySpan.textContent?.trim()
        const nextSibling = keySpan.nextElementSibling
        
        if (keyText === 'Baba' && nextSibling && nextSibling.classList.contains('value')) {
          const link = nextSibling.querySelector('a')
          if (link) {
            result.sireName = link.textContent?.trim() || ''
            console.log('[TJK Detail] Extracted Sire from span.key/value:', result.sireName)
          }
        }
        
        if (keyText === 'Anne' && nextSibling && nextSibling.classList.contains('value')) {
          const link = nextSibling.querySelector('a')
          if (link) {
            let damName = link.textContent?.trim() || ''
            // For dam, take only the first part before "/" if it exists
            // Example: "JUSTIN TIME /BIN AJWAAD (IRE)" -> "JUSTIN TIME"
            if (damName.includes('/')) {
              damName = damName.split('/')[0].trim()
            }
            result.damName = damName
            console.log('[TJK Detail] Extracted Dam from span.key/value:', result.damName)
          }
        }
      }
      
      // If we got both from the primary method, skip table extraction
      if (result.sireName && result.damName) {
        console.log('[TJK Detail] Successfully extracted pedigree from span.key/value structure')
      } else {
        // FALLBACK METHOD: Extract pedigree information from the pedigree table
        // The pedigree is shown in a table structure with multiple columns representing generations
        const pedigreeTables = document.querySelectorAll('table')
        
        for (const table of pedigreeTables) {
          const tableText = table.textContent || ''
          // Check if this is a pedigree table (contains typical pedigree terms)
          if (tableText.includes('(GB)') || tableText.includes('(USA)') || tableText.includes('(IRE)')) {
            const rows = table.querySelectorAll('tr')
            const cells: string[][] = []
            
            // Collect all cells from the table
            rows.forEach((row) => {
              const rowCells = row.querySelectorAll('td, th')
              if (rowCells.length > 0) {
                const rowData: string[] = []
                rowCells.forEach((cell) => {
                  const text = cell.textContent?.trim() || ''
                  if (text && text.length > 2) {
                    rowData.push(text)
                  }
                })
                if (rowData.length > 0) {
                  cells.push(rowData)
                }
              }
            })
            
            // Try to find pedigree structure - typically the first two columns contain sire and dam
            // Column structure: [Sire, Dam, Sire's Sire, Sire's Dam, Dam's Sire, Dam's Dam, ...]
            if (cells.length >= 2) {
              // First row often contains the main sire and dam
              const firstRow = cells[0]
              const secondRow = cells[1]
              
              // Extract sire (first column, first row)
              if (firstRow.length > 0) {
                const sireText = firstRow[0]
                // Match full name including country code: "DAI JIN (GB)" or "JUSTIN TIME"
                // Pattern: name (optionally followed by country code in parentheses, then optional age info)
                const sireMatch = sireText.match(/^([A-Z][A-Z\s]+?)(?:\s*\([A-Z]+\))?(?:\s+[a-z]+\s+[a-z]+\s+\(\d+\))?/i)
                if (sireMatch) {
                  let sireName = sireMatch[1].trim()
                  // Also capture country code if present
                  const countryMatch = sireText.match(/^[A-Z][A-Z\s]+?\s*\(([A-Z]+)\)/i)
                  if (countryMatch) {
                    sireName = `${sireName} (${countryMatch[1]})`
                  }
                  result.sireName = sireName
                }
              }
              
              // Extract dam (second column, first row, or first column second row)
              if (firstRow.length > 1) {
                const damText = firstRow[1]
                const damMatch = damText.match(/^([A-Z][A-Z\s]+?)(?:\s*\([A-Z]+\))?(?:\s+[a-z]+\s+[a-z]+\s+\(\d+\))?/i)
                if (damMatch) {
                  let damName = damMatch[1].trim()
                  // Also capture country code if present
                  const countryMatch = damText.match(/^[A-Z][A-Z\s]+?\s*\(([A-Z]+)\)/i)
                  if (countryMatch) {
                    damName = `${damName} (${countryMatch[1]})`
                  }
                  result.damName = damName
                }
              } else if (secondRow.length > 0) {
                const damText = secondRow[0]
                const damMatch = damText.match(/^([A-Z][A-Z\s]+?)(?:\s*\([A-Z]+\))?(?:\s+[a-z]+\s+[a-z]+\s+\(\d+\))?/i)
                if (damMatch) {
                  let damName = damMatch[1].trim()
                  // Also capture country code if present
                  const countryMatch = damText.match(/^[A-Z][A-Z\s]+?\s*\(([A-Z]+)\)/i)
                  if (countryMatch) {
                    damName = `${damName} (${countryMatch[1]})`
                  }
                  result.damName = damName
                }
              }
              
              // Extract extended pedigree (grandparents)
              // Sire's Sire (third column, first row or first column, third row)
              if (firstRow.length > 2) {
                const sireSireText = firstRow[2]
                const sireSireMatch = sireSireText.match(/^([A-Z][^(]+?)(?:\s*\([^)]+\))?(?:\s+[a-z]+\s+[a-z]+\s+\(\d+\))?/i)
                if (sireSireMatch) {
                  result.sireSire = sireSireMatch[1].trim()
                }
              }
              
              // Sire's Dam (fourth column, first row or second column, third row)
              if (firstRow.length > 3) {
                const sireDamText = firstRow[3]
                const sireDamMatch = sireDamText.match(/^([A-Z][^(]+?)(?:\s*\([^)]+\))?(?:\s+[a-z]+\s+[a-z]+\s+\(\d+\))?/i)
                if (sireDamMatch) {
                  result.sireDam = sireDamMatch[1].trim()
                }
              }
              
              // Dam's Sire (fifth column, first row or first column, fourth row)
              if (firstRow.length > 4) {
                const damSireText = firstRow[4]
                const damSireMatch = damSireText.match(/^([A-Z][^(]+?)(?:\s*\([^)]+\))?(?:\s+[a-z]+\s+[a-z]+\s+\(\d+\))?/i)
                if (damSireMatch) {
                  result.damSire = damSireMatch[1].trim()
                }
              }
              
              // Dam's Dam (sixth column, first row or second column, fourth row)
              if (firstRow.length > 5) {
                const damDamText = firstRow[5]
                const damDamMatch = damDamText.match(/^([A-Z][^(]+?)(?:\s*\([^)]+\))?(?:\s+[a-z]+\s+[a-z]+\s+\(\d+\))?/i)
                if (damDamMatch) {
                  result.damDam = damDamMatch[1].trim()
                }
              }
              
              // If we found basic info, break
              if (result.sireName || result.damName) {
                break
              }
            }
          }
        }
      } // End of else block for table extraction fallback
      
      // Final fallback: Try to extract from the main page text if both methods failed
      if (!result.sireName && !result.damName) {
        const sireMatch = bodyText.match(/Baba\s+([A-Z][^\n\r]+?)(?:\s*Anne|\s*Antrenör|$)/i)
        if (sireMatch) {
          result.sireName = sireMatch[1].trim().replace(/\s+\([^)]+\)\s+[a-z]+\s+[a-z]+\s+\(\d+\)/i, '').trim()
        }

        const damMatch = bodyText.match(/Anne\s+([A-Z][^\n\r]+?)(?:\s*Antrenör|$)/i)
        if (damMatch) {
          result.damName = damMatch[1].trim().replace(/\s+\([^)]+\)\s+[a-z]+\s+[a-z]+\s+\(\d+\)/i, '').trim()
        }
      }

      // Extract race history from the races table
      // Find the table that contains race data (usually has "Tarih" in header)
      const allTables = document.querySelectorAll('table')
      console.log(`[Browser] Found ${allTables.length} tables on the page`)
      
      let raceTable: HTMLTableElement | null = null
      
      for (let i = 0; i < allTables.length; i++) {
        const table = allTables[i] as HTMLTableElement
        const headerText = table.textContent || ''
        const firstFewRows = Array.from(table.querySelectorAll('tr')).slice(0, 3).map(r => r.textContent?.substring(0, 100) || '').join(' | ')
        console.log(`[Browser] Table ${i}: has "Tarih": ${headerText.includes('Tarih')}, has "Şehir": ${headerText.includes('Şehir')}, has "Derece": ${headerText.includes('Derece')}, preview: ${firstFewRows.substring(0, 150)}`)
        
        if (headerText.includes('Tarih') && headerText.includes('Şehir') && headerText.includes('Derece')) {
          raceTable = table
          console.log(`[Browser] ✓ Found race table at index ${i}`)
          break
        }
      }
      
      if (!raceTable) {
        console.log('[Browser] ⚠ No race table found with all required headers! Looking for any table with "Tarih"...')
        // Fallback: look for any table with "Tarih"
        for (let i = 0; i < allTables.length; i++) {
          const table = allTables[i] as HTMLTableElement
          const headerText = table.textContent || ''
          if (headerText.includes('Tarih')) {
            raceTable = table
            console.log(`[Browser] ⚠ Using fallback table at index ${i} (has "Tarih" but may not have all expected columns)`)
            break
          }
        }
      }

      if (raceTable) {
        // First, find the header row to identify column indices
        const headerRow = raceTable.querySelector('thead tr, tr:first-child')
        const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th, td')) : []
        
        // Find column indices by header text
        let dateColIndex = -1
        let cityColIndex = -1
        let distanceColIndex = -1
        let surfaceColIndex = -1
        let positionColIndex = -1  // "S" column (position)
        let dereceColIndex = -1   // "Derece" column (time elapsed)
        let weightColIndex = -1
        let jockeyColIndex = -1
        let raceColIndex = -1
        let raceTypeColIndex = -1
        let trainerColIndex = -1
        let hpColIndex = -1
        let prizeColIndex = -1
        let videoColIndex = -1
        let photoColIndex = -1
        
        console.log('[Browser] ===== HEADER DETECTION (Horse Detail) =====')
        console.log('[Browser] Total header cells:', headerCells.length)
        
        headerCells.forEach((cell, index) => {
          const text = cell.textContent?.trim().toLowerCase() || ''
          const originalText = cell.textContent?.trim() || ''
          console.log(`[Browser]   Header[${index}]: "${originalText}" (normalized: "${text}")`)
          
          if (text.includes('tarih') || text.includes('date')) dateColIndex = index
          else if (text.includes('şehir') || text.includes('city')) cityColIndex = index
          else if (text.includes('msf') || text.includes('mesafe') || text.includes('distance')) distanceColIndex = index
          else if (text.includes('pist') || text.includes('surface')) surfaceColIndex = index
          // CRITICAL: "S" is the position column, "Derece" is the time column
          // Look for exact match of "S" (case-insensitive, but must be standalone or with minimal context)
          else if (text === 's' || (text.length === 1 && text === 's')) {
            positionColIndex = index
            console.log(`[Browser] ✓ Found S column (position) at index ${index}`)
          }
          // "Derece" is the time elapsed column (not position!)
          else if (text.includes('derece') && !text.includes('position') && !text.includes('sıra')) {
            dereceColIndex = index
            console.log(`[Browser] ✓ Found Derece column (time) at index ${index}`)
          }
          // Fallback: if we see "position" or "sıra" but not "derece", it might be position
          else if ((text.includes('position') || text.includes('sıra')) && !text.includes('derece')) {
            // Only use this if we haven't found "S" yet
            if (positionColIndex === -1) {
              positionColIndex = index
              console.log(`[Browser] ⚠ Found position column (fallback) at index ${index}`)
            }
          }
          else if (text.includes('sıklet') || text.includes('weight')) weightColIndex = index
          else if (text.includes('jokey') || text.includes('jockey')) jockeyColIndex = index
          else if (text.includes('koşu') && !text.includes('tip') && !text.includes('no')) raceColIndex = index
          // Race type detection - be more specific to avoid matching ages column
          else if ((text.includes('kcins') || text.includes('k.cins') || text.includes('koşu tipi') || text.includes('race type')) && !text.includes('yaş') && !text.includes('age')) raceTypeColIndex = index
          else if (text.includes('antrenör') || text.includes('trainer') || text.includes('ant.')) trainerColIndex = index
          else if (text.includes('hp') || text.includes('handikap')) hpColIndex = index
          else if (text.includes('ikramiye') || text.includes('prize')) prizeColIndex = index
          else if (text.includes('video') || text.includes('s20') || text.includes('medya') || text.includes('media')) {
            videoColIndex = index
            console.log(`[Browser] ✓ Found video column at index ${index}`)
          }
          else if (text.includes('foto') || text.includes('photo') || text.includes('resim') || text.includes('image')) {
            photoColIndex = index
            console.log(`[Browser] ✓ Found photo column at index ${index}`)
          }
        })
        
        // Safety check: if positionColIndex equals dereceColIndex, reset positionColIndex
        if (positionColIndex === dereceColIndex && positionColIndex !== -1) {
          console.log('[Browser] ⚠ WARNING: positionColIndex equals dereceColIndex, resetting positionColIndex')
          positionColIndex = -1
        }
        
        // Fallback: if "S" not found, try to infer it (usually just before "Derece")
        if (positionColIndex === -1 && dereceColIndex !== -1) {
          positionColIndex = dereceColIndex - 1
          console.log(`[Browser] ⚠ S column not found, inferring positionColIndex as ${positionColIndex} (dereceColIndex - 1)`)
        }
        
        // Fallback to default indices if headers not found
        if (dateColIndex === -1) dateColIndex = 0
        if (cityColIndex === -1) cityColIndex = 1
        if (distanceColIndex === -1) distanceColIndex = 2
        if (surfaceColIndex === -1) surfaceColIndex = 3
        // Position fallback: if still not found and derece is found, use derece - 1
        // Otherwise default to index 4 (typical position of "S" column)
        if (positionColIndex === -1) {
          if (dereceColIndex !== -1) {
            positionColIndex = dereceColIndex - 1
          } else {
            positionColIndex = 4  // Default fallback
          }
        }
        if (weightColIndex === -1) weightColIndex = 6
        if (jockeyColIndex === -1) jockeyColIndex = 7
        if (raceColIndex === -1) raceColIndex = 10
        if (raceTypeColIndex === -1) raceTypeColIndex = 11
        if (trainerColIndex === -1) trainerColIndex = 12
        if (hpColIndex === -1) hpColIndex = 13
        if (prizeColIndex === -1) prizeColIndex = 14
        if (videoColIndex === -1) videoColIndex = 15
        if (photoColIndex === -1) photoColIndex = 16
        
        const rows = raceTable.querySelectorAll('tbody tr, tr')
        console.log(`[Browser] Total rows found: ${rows.length}`)
        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('td')
          
          // Log all rows, even if they don't have enough cells
          const firstCellText = cells[0]?.textContent?.trim() || ''
          console.log(`[Browser] Row ${rowIndex}: ${cells.length} cells, first cell: "${firstCellText.substring(0, 20)}"`)
          
          // Skip header rows
          if (firstCellText === 'Tarih' || firstCellText.includes('Toplam')) {
            console.log(`[Browser] ⏭ Skipping header row: "${firstCellText}"`)
            return
          }
          
          // Need at least date, city, distance columns (at least 3-4 cells minimum)
          // But some rows might have empty cells, so check if we have a date
          if (cells.length < 3) {
            console.log(`[Browser] ⏭ Skipping row ${rowIndex}: too few cells (${cells.length})`)
            return
          }
          
          // Check if first cell looks like a date (DD.MM.YYYY format)
          const potentialDate = firstCellText || cells[dateColIndex]?.textContent?.trim() || ''
          if (!potentialDate.match(/\d{2}\.\d{2}\.\d{4}/) && cells.length < 10) {
            console.log(`[Browser] ⏭ Skipping row ${rowIndex}: doesn't look like a race row (no date pattern)`)
            return
          }

          // Parse date (format: DD.MM.YYYY)
          const dateCell = cells[dateColIndex]
          const dateLink = dateCell?.querySelector('a')
          const dateText = dateLink?.textContent?.trim() || dateCell?.textContent?.trim() || ''
          
          // Parse city
          const cityCell = cells[cityColIndex]
          const cityLink = cityCell?.querySelector('a')
          const city = cityLink?.textContent?.trim() || cityCell?.textContent?.trim() || undefined
          
          // Parse distance (meters)
          const distanceCell = cells[distanceColIndex]
          const distanceText = distanceCell?.textContent?.trim() || ''
          const distance = distanceText ? parseInt(distanceText) : undefined
          
          // Parse surface (format: "Ç:Normal 3.3" or "K:Normal")
          const surfaceCell = cells[surfaceColIndex]
          const surfaceText = surfaceCell?.textContent?.trim() || ''
          let surface: string | undefined
          let surfaceType: string | undefined
          if (surfaceText) {
            if (surfaceText.includes('Ç')) {
              surface = 'Çim'
            } else if (surfaceText.includes('K')) {
              surface = 'Kum'
            } else if (surfaceText.includes('S')) {
              surface = 'Sentetik'
            }
            surfaceType = surfaceText
          }
          
          // Parse position from "S" column (NOT "Derece"!)
          let position: number | undefined
          if (positionColIndex >= 0 && cells[positionColIndex]) {
            const positionCell = cells[positionColIndex]
            const positionText = positionCell?.textContent?.trim() || ''
            
            console.log(`[Browser] Position extraction - column ${positionColIndex}, text: "${positionText}"`)
            
            // Only parse if there's actual text (not empty/whitespace)
            if (positionText && positionText.length > 0) {
              // Check if this looks like a time format (contains '.', ':' or multiple dots)
              const isTimeFormat = positionText.includes('.') && positionText.split('.').length > 2
              
              if (isTimeFormat) {
                console.log(`[Browser] ⚠ ERROR: Position column contains time format "${positionText}", this should be in Derece column!`)
                // Try the previous column if available
                if (positionColIndex > 0 && cells[positionColIndex - 1]) {
                  const prevText = cells[positionColIndex - 1].textContent?.trim() || ''
                  const prevParsed = parseInt(prevText)
                  if (!isNaN(prevParsed) && prevParsed > 0 && prevParsed < 100) {
                    position = prevParsed
                    console.log(`[Browser] ✓ Using previous column for position: ${position}`)
                  }
                }
              } else {
                // Parse as integer
                const parsed = parseInt(positionText)
                if (!isNaN(parsed) && parsed > 0 && parsed < 100) {
                  position = parsed
                  console.log(`[Browser] ✓ Found position: ${position}`)
                } else {
                  console.log(`[Browser] ⚠ Could not parse position from "${positionText}"`)
                }
              }
            } else {
              // Empty position cell - this is expected for future races (registrations/declarations)
              console.log(`[Browser] Position column is empty (expected for future races)`)
            }
          }
          
          // Parse derece (time elapsed) from "Derece" column
          let derece: string | undefined
          if (dereceColIndex >= 0 && cells[dereceColIndex]) {
            const dereceCell = cells[dereceColIndex]
            derece = dereceCell?.textContent?.trim() || undefined
            if (derece) {
              console.log(`[Browser] Found derece (time): "${derece}"`)
            }
          }
          
          // Parse weight (Sıklet)
          const weightCell = cells[weightColIndex]
          const weightText = weightCell?.textContent?.trim() || ''
          const weight = weightText ? parseFloat(weightText) : undefined
          
          // Parse jockey
          const jockeyCell = cells[jockeyColIndex]
          const jockeyLink = jockeyCell?.querySelector('a')
          const jockeyName = jockeyLink?.textContent?.trim() || undefined
          const jockeyHref = jockeyLink?.getAttribute('href') || ''
          const jockeyIdMatch = jockeyHref.match(/QueryParameter_JokeyId=(\d+)/)
          const jockeyId = jockeyIdMatch ? jockeyIdMatch[1] : undefined
          
          // Parse race number and name (format: "5 - GOLD GUARD" or just "5")
          const raceCell = cells[raceColIndex]
          const raceText = raceCell?.textContent?.trim() || ''
          let raceNumber: number | undefined
          let raceName: string | undefined
          if (raceText) {
            const raceMatch = raceText.match(/(\d+)\s*[-–]\s*(.+)/)
            if (raceMatch) {
              raceNumber = parseInt(raceMatch[1])
              raceName = raceMatch[2].trim()
            } else {
              const numMatch = raceText.match(/^(\d+)$/)
              if (numMatch) {
                raceNumber = parseInt(numMatch[1])
              } else {
                raceName = raceText
              }
            }
          }
          
          // Parse race type (Kcins) - get full text including any additional info
          // The race type column might be confused with ages, so we need to be careful
          let raceType: string | undefined
          
          // First, try the detected race type column
          if (raceTypeColIndex >= 0 && cells[raceTypeColIndex]) {
            const raceTypeCell = cells[raceTypeColIndex]
            const raceTypeText = raceTypeCell.textContent?.trim() || ''
            
            // Check if this looks like a race type (contains letters, not just numbers/ages)
            if (raceTypeText && raceTypeText.match(/[A-ZÇĞİÖŞÜ]/) && !raceTypeText.match(/^\d+\s*(yaş|yıl|year)/i)) {
              raceType = raceTypeText
            }
          }
          
          // If race type column gave us something that looks like ages (e.g., "3+i", "3 Yaş"), 
          // try to find the actual race type in nearby columns
          if (!raceType || raceType.match(/^\d+[+\-]?[a-z]?\s*(yaş|yıl|year)?$/i)) {
            // Check columns around the race type index
            const columnsToCheck = [
              raceTypeColIndex - 1, // Previous column (might be race type before ages)
              raceTypeColIndex + 1, // Next column (might be race type after ages)
              raceColIndex - 1,     // Column before race name
            ]
            
            for (const colIdx of columnsToCheck) {
              if (colIdx >= 0 && colIdx < cells.length) {
                const cell = cells[colIdx]
                const cellText = cell?.textContent?.trim() || ''
                
                // Check if this looks like a race type
                // Race types typically contain: ŞARTLI, SATIŞ, KV, Handikap, Maiden, etc.
                if (cellText && 
                    cellText.match(/[A-ZÇĞİÖŞÜ]/) && 
                    (cellText.match(/şartlı|satış|kv|handikap|maiden|koşu/i) ||
                     cellText.match(/^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s\d/]+$/))) {
                  // Make sure it's not distance, weight, or other numeric data
                  if (!cellText.match(/^\d+\s*(m|kg|yaş|yıl|year|hp)/i)) {
                    raceType = cellText
                    break
                  }
                }
              }
            }
          }
          
          // Fallback: Check if race name contains the race type
          if (!raceType && raceName) {
            // Race type might be in the race name like "ŞARTLI 5 - GOLD GUARD"
            const nameParts = raceName.split(/\s*[-–]\s*/)
            if (nameParts.length > 1) {
              const possibleType = nameParts[0].trim()
              // Check if first part looks like a race type
              if (possibleType.match(/[A-ZÇĞİÖŞÜ]/) && 
                  (possibleType.match(/şartlı|satış|kv|handikap|maiden/i) ||
                   possibleType.match(/^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s\d/]+$/))) {
                raceType = possibleType
              }
            }
          }
          
          raceType = raceType || undefined
          
          // Parse trainer
          const trainerCell = cells[trainerColIndex]
          const trainerLink = trainerCell?.querySelector('a')
          const trainerName = trainerLink?.textContent?.trim() || undefined
          const trainerHref = trainerLink?.getAttribute('href') || ''
          const trainerIdMatch = trainerHref.match(/QueryParameter_AntrenorId=(\d+)/)
          const trainerId = trainerIdMatch ? trainerIdMatch[1] : undefined
          
          // Parse handicap points (HP)
          const hpCell = cells[hpColIndex]
          const hpText = hpCell?.textContent?.trim() || ''
          let handicapPoints: number | undefined
          if (hpText) {
            // Try to parse as integer - HP is usually just a number
            const parsed = parseInt(hpText)
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 200) {
              // Reasonable HP range (0-200)
              handicapPoints = parsed
            } else {
              // Might be formatted differently, try to extract number
              const numMatch = hpText.match(/(\d+)/)
              if (numMatch) {
                const num = parseInt(numMatch[1])
                if (num >= 0 && num <= 200) {
                  handicapPoints = num
                }
              }
            }
          }
          
          // Parse prize money (İkramiye)
          const prizeCell = cells[prizeColIndex]
          const prizeText = prizeCell?.textContent?.trim() || ''
          let prizeMoney: number | undefined
          if (prizeText) {
            prizeMoney = parseFloat(prizeText.replace(/\./g, '').replace(',', '.'))
          }
          
          // Parse video URL
          let videoUrl: string | undefined
          if (videoColIndex >= 0 && cells[videoColIndex]) {
            const videoCell = cells[videoColIndex]
            // Try multiple methods to find video link
            const videoLink = videoCell.querySelector('a')
            if (videoLink) {
              const href = videoLink.getAttribute('href')
              if (href) {
                videoUrl = href.startsWith('http') ? href : `https://www.tjk.org${href}`
                console.log(`[Browser] ✓ Found video URL: ${videoUrl.substring(0, 80)}...`)
              }
            } else {
              // Fallback: check if cell itself is a link
              const cellHref = videoCell.getAttribute('href')
              if (cellHref) {
                videoUrl = cellHref.startsWith('http') ? cellHref : `https://www.tjk.org${cellHref}`
                console.log(`[Browser] ✓ Found video URL (from cell): ${videoUrl.substring(0, 80)}...`)
              } else {
                // Check for onclick or data attributes
                const onclick = videoCell.getAttribute('onclick')
                if (onclick) {
                  const urlMatch = onclick.match(/['"]([^'"]+)['"]/)
                  if (urlMatch) {
                    videoUrl = urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.tjk.org${urlMatch[1]}`
                    console.log(`[Browser] ✓ Found video URL (from onclick): ${videoUrl.substring(0, 80)}...`)
                  }
                }
              }
            }
            if (!videoUrl) {
              console.log(`[Browser] ⚠ No video URL found in column ${videoColIndex}, cell text: "${videoCell.textContent?.trim()}"`)
            }
          } else {
            console.log(`[Browser] ⚠ Video column index ${videoColIndex} is invalid or cell not found`)
          }
          
          // Parse photo URL
          let photoUrl: string | undefined
          if (photoColIndex >= 0 && cells[photoColIndex]) {
            const photoCell = cells[photoColIndex]
            const photoImg = photoCell.querySelector('img')
            if (photoImg) {
              const src = photoImg.getAttribute('src')
              if (src) {
                photoUrl = src.startsWith('http') ? src : `https://www.tjk.org${src}`
                console.log(`[Browser] ✓ Found photo URL: ${photoUrl.substring(0, 80)}...`)
              }
            } else {
              // Fallback: check if cell has background image or data attribute
              const cellSrc = photoCell.getAttribute('data-src') || photoCell.getAttribute('src')
              if (cellSrc) {
                photoUrl = cellSrc.startsWith('http') ? cellSrc : `https://www.tjk.org${cellSrc}`
                console.log(`[Browser] ✓ Found photo URL (from cell): ${photoUrl.substring(0, 80)}...`)
              }
            }
            if (!photoUrl) {
              console.log(`[Browser] ⚠ No photo URL found in column ${photoColIndex}, cell text: "${photoCell.textContent?.trim()}"`)
            }
          } else {
            console.log(`[Browser] ⚠ Photo column index ${photoColIndex} is invalid or cell not found`)
          }

          // Only add if we have at least a date
          if (dateText && dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
            // Check row text for cancellation status ("Kayıt Koşmaz" or "Deklare Koşmaz")
            const rowText = row.textContent || ''
            const isCancelled = rowText.includes('Kayıt Koşmaz') || rowText.includes('Deklare Koşmaz')
            
            console.log(`[Browser] Processing row with date: ${dateText}, row text preview: ${rowText.substring(0, 150)}`)
            
            // Skip cancelled registrations
            if (isCancelled) {
              console.log('[Browser] ⏭ Skipping cancelled registration:', dateText)
              return
            }
            
            // Parse date to check if it's in the future
            // Format: DD.MM.YYYY
            const dateParts = dateText.split('.')
            if (dateParts.length !== 3) {
              console.log(`[Browser] ⚠ Invalid date format: ${dateText}`)
              return
            }
            
            const day = parseInt(dateParts[0])
            const month = parseInt(dateParts[1]) - 1 // JS months are 0-indexed
            const year = parseInt(dateParts[2])
            
            const raceDateObj = new Date(year, month, day)
            raceDateObj.setHours(0, 0, 0, 0) // Normalize to start of day
            
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            // Check if this is a future race (registration/declaration)
            const isFuture = raceDateObj >= today
            
            console.log(`[Browser] Date check: ${dateText} -> ${raceDateObj.toISOString()}, today: ${today.toISOString()}, isFuture: ${isFuture}`)
            
            // Check if position column is truly empty (not just undefined)
            // Position should be null/undefined for future races
            const hasPosition = position !== null && position !== undefined
            
            // Check if it has a jockey assigned (Deklare) or not (Kayıt)
            const hasJockey = jockeyName && jockeyName.trim() !== '' && jockeyName.trim() !== 'Kayıt'
            
            // Debug logging for registration detection (only for future dates)
            if (isFuture) {
              console.log(`[Browser] 🔍 Future race detected: ${dateText}`, {
                isFuture,
                hasPosition,
                position,
                hasJockey,
                jockeyName: jockeyName || '(none)',
                willBeRegistration: isFuture && !hasPosition,
              })
            }
            
            if (isFuture && !hasPosition) {
              // This is a registration or declaration (future race without position)
              const registrationType: 'Kayıt' | 'Deklare' = hasJockey ? 'Deklare' : 'Kayıt'
              
              const registrationData = {
                raceDate: dateText,
                city,
                distance,
                surface,
                surfaceType,
                raceType,
                type: registrationType,
                jockeyName: hasJockey ? jockeyName : undefined,
                jockeyId: hasJockey ? jockeyId : undefined,
              }
              
              // Log extracted data for all registrations (for debugging)
              console.log('[Browser] ✅ REGISTRATION EXTRACTED:', JSON.stringify(registrationData, null, 2))
              
              result.registrations.push(registrationData)
            } else {
              // This is a past race (has position or is in the past)
              const raceData = {
                raceDate: dateText,
                city,
                distance,
                surface,
                surfaceType,
                position,
                derece,
                weight,
                jockeyName,
                jockeyId,
                raceNumber,
                raceName,
                raceType,
                trainerName,
                trainerId,
                handicapPoints,
                prizeMoney,
                videoUrl,
                photoUrl,
              }
              
              // Log extracted data for first few races
              if (result.races.length < 3) {
                console.log('[Browser] Extracted race data:', JSON.stringify(raceData, null, 2))
              }
              
              result.races.push(raceData)
            }
          }
        })
      }

      return result
    })

    await context.close()
    
    console.log('[TJK Horse Detail] Successfully fetched data for horse:', horseId)
    console.log('[TJK Horse Detail] Races found:', data.races.length)
    console.log('[TJK Horse Detail] Registrations found:', data.registrations.length)
    
    return data

  } catch (error: any) {
    console.error('[TJK Horse Detail] Error fetching horse detail:', error.message)
    throw error
  } finally {
    // Ensure context is closed even if there's an error
    if (page) {
      try {
        await page.close().catch(() => {})
      } catch (e) {
        // Ignore errors when closing
      }
    }
  }
}

/**
 * Close the browser instance (call when done with all requests)
 */
export async function closeHorseDetailBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}

