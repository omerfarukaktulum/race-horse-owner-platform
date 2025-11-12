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
  
  // Race history
  races: RaceHistoryItem[]
}

export interface RaceHistoryItem {
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  surfaceType?: string
  position?: number
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

    const detailUrl = `https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=${horseId}`
    
    console.log('[TJK Horse Detail] Fetching:', detailUrl)
    
    await page.goto(detailUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for page to load
    await page.waitForTimeout(2000)

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

    // Extract data from the page
    const data = await page.evaluate(() => {
      const result: HorseDetailData = {
        races: [],
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
      let raceTable: HTMLTableElement | null = null
      
      for (let i = 0; i < allTables.length; i++) {
        const table = allTables[i] as HTMLTableElement
        const headerText = table.textContent || ''
        if (headerText.includes('Tarih') && headerText.includes('Şehir') && headerText.includes('Derece')) {
          raceTable = table
          break
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
        let positionColIndex = -1
        let weightColIndex = -1
        let jockeyColIndex = -1
        let raceColIndex = -1
        let raceTypeColIndex = -1
        let trainerColIndex = -1
        let hpColIndex = -1
        let prizeColIndex = -1
        let videoColIndex = -1
        let photoColIndex = -1
        
        headerCells.forEach((cell, index) => {
          const text = cell.textContent?.trim().toLowerCase() || ''
          if (text.includes('tarih') || text.includes('date')) dateColIndex = index
          else if (text.includes('şehir') || text.includes('city')) cityColIndex = index
          else if (text.includes('msf') || text.includes('mesafe') || text.includes('distance')) distanceColIndex = index
          else if (text.includes('pist') || text.includes('surface')) surfaceColIndex = index
          else if (text.includes('derece') || text.includes('position') || text.includes('sıra')) positionColIndex = index
          else if (text.includes('sıklet') || text.includes('weight')) weightColIndex = index
          else if (text.includes('jokey') || text.includes('jockey')) jockeyColIndex = index
          else if (text.includes('koşu') && !text.includes('tip') && !text.includes('no')) raceColIndex = index
          // Race type detection - be more specific to avoid matching ages column
          else if ((text.includes('kcins') || text.includes('k.cins') || text.includes('koşu tipi') || text.includes('race type')) && !text.includes('yaş') && !text.includes('age')) raceTypeColIndex = index
          else if (text.includes('antrenör') || text.includes('trainer') || text.includes('ant.')) trainerColIndex = index
          else if (text.includes('hp') || text.includes('handikap')) hpColIndex = index
          else if (text.includes('ikramiye') || text.includes('prize')) prizeColIndex = index
          else if (text.includes('video') || text.includes('s20')) videoColIndex = index
          else if (text.includes('foto') || text.includes('photo')) photoColIndex = index
        })
        
        // Fallback to default indices if headers not found
        if (dateColIndex === -1) dateColIndex = 0
        if (cityColIndex === -1) cityColIndex = 1
        if (distanceColIndex === -1) distanceColIndex = 2
        if (surfaceColIndex === -1) surfaceColIndex = 3
        if (positionColIndex === -1) positionColIndex = 5
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
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td')
          // Need at least 10 cells for a valid race row
          if (cells.length >= 10) {
            // Skip header rows
            const firstCellText = cells[0]?.textContent?.trim() || ''
            if (firstCellText === 'Tarih' || firstCellText.includes('Toplam') || firstCellText === '') {
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
            
            // Parse position (Derece) - this is the critical fix
            const positionCell = cells[positionColIndex]
            const positionText = positionCell?.textContent?.trim() || ''
            // Position might be like "1.25.97" (time) or just "1" (position) - we need position
            // Look for a number that's not a time (not containing dots in time format)
            let position: number | undefined
            if (positionText) {
              // Try to parse as integer first
              const parsed = parseInt(positionText)
              if (!isNaN(parsed) && parsed > 0 && parsed < 100) {
                // If it's a reasonable position (1-99), use it
                position = parsed
              } else {
                // Might be a time like "1.25.97" - look for position in a different format
                // Sometimes position is in a separate column or formatted differently
                const positionMatch = positionText.match(/^(\d+)(?:\.|$)/)
                if (positionMatch) {
                  const pos = parseInt(positionMatch[1])
                  if (pos > 0 && pos < 100) {
                    position = pos
                  }
                }
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
            const videoCell = cells[videoColIndex]
            const videoLink = videoCell?.querySelector('a')
            let videoUrl: string | undefined
            if (videoLink) {
              const href = videoLink.getAttribute('href')
              if (href) {
                videoUrl = href.startsWith('http') ? href : `https://www.tjk.org${href}`
              }
            }
            
            // Parse photo URL
            const photoCell = cells[photoColIndex]
            const photoImg = photoCell?.querySelector('img')
            const photoUrl = photoImg?.getAttribute('src') || undefined

            // Only add if we have at least a date
            // Position is optional - some races might not have position data
            if (dateText && dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
              result.races.push({
                raceDate: dateText,
                city,
                distance,
                surface,
                surfaceType,
                position,
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
              })
            }
          }
        })
      }

      return result
    })

    await context.close()
    
    console.log('[TJK Horse Detail] Successfully fetched data for horse:', horseId)
    return data

  } catch (error: any) {
    console.error('[TJK Horse Detail] Error fetching horse detail:', error.message)
    throw error
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

