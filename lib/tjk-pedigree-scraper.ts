import { chromium } from 'playwright'

export interface PedigreeData {
  // Generation 1 (horse itself - for reference)
  horseName: string
  
  // Generation 2 (parents)
  sireName?: string
  damName?: string
  
  // Generation 3 (grandparents)
  sireSire?: string
  sireDam?: string
  damSire?: string
  damDam?: string
  
  // Generation 4 (great-grandparents)
  sireSireSire?: string
  sireSireDam?: string
  sireDamSire?: string
  sireDamDam?: string
  damSireSire?: string
  damSireDam?: string
  damDamSire?: string
  damDamDam?: string
}

/**
 * Fetches pedigree data (4 generations) from TJK
 * URL: https://www.tjk.org/TR/YarisSever/Query/Pedigri/Pedigri?Atkodu={horseId}
 */
export async function fetchTJKPedigree(
  horseId: string,
  horseName?: string
): Promise<PedigreeData> {
  console.log('[TJK Pedigree] Fetching pedigree for:', horseName || horseId, 'ID:', horseId)
  
  const browser = await chromium.launch({
    headless: true,
  })
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })
    
    const page = await context.newPage()
    
    // Capture ALL browser console logs and forward to server console
    page.on('console', (msg) => {
      const text = msg.text()
      const type = msg.type()
      // Forward all console messages that contain [Browser] or [Pedigree]
      if (text.includes('[Browser]') || text.includes('[Pedigree]') || text.includes('tblPedigri')) {
        console.log(`[TJK Pedigree] [${type.toUpperCase()}]`, text)
      }
    })
    
    // Also capture page errors
    page.on('pageerror', (error) => {
      console.error('[TJK Pedigree] Page error:', error.message)
    })
    
    // Navigate to pedigree page (correct URL: /TR/map/Query/Pedigri/Pedigri)
    const pedigreeUrl = `https://www.tjk.org/TR/map/Query/Pedigri/Pedigri?Atkodu=${horseId}`
    console.log('[TJK Pedigree] Navigating to:', pedigreeUrl)
    
    await page.goto(pedigreeUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })
    
    // Wait for page to load
    await page.waitForTimeout(2000)
    
    // Try to wait for the pedigree table to appear (it might load via AJAX)
    try {
      await page.waitForSelector('#pedigri', { timeout: 5000 })
      console.log('[TJK Pedigree] ✓ Found #pedigri table')
    } catch (e) {
      console.log('[TJK Pedigree] ⚠ #pedigri not found after waiting, will try alternative methods')
    }
    
    // Additional wait for any dynamic content
    await page.waitForTimeout(1000)
    
    console.log('[TJK Pedigree] Page loaded, starting extraction...')
    
    // Extract pedigree data from the page
    const pedigree = await page.evaluate(() => {
      console.log('[Browser] [Pedigree] Starting pedigree extraction in browser context...')
      const result: any = {}
      
      // Debug: Log all tables on the page
      const allTables = document.querySelectorAll('table')
      console.log(`[Browser] [Pedigree] Found ${allTables.length} tables on page`)
      allTables.forEach((table, idx) => {
        const id = table.id || 'no-id'
        const classes = table.className || 'no-class'
        const rows = table.querySelectorAll('tr').length
        console.log(`[Browser] [Pedigree] Table ${idx}: id="${id}", class="${classes}", rows=${rows}`)
      })
      
      // Debug: Check for any element with "pedigri" in id or class
      const pedigreeElements = document.querySelectorAll('[id*="pedigri"], [id*="Pedigri"], [class*="pedigri"], [class*="Pedigri"]')
      console.log(`[Browser] [Pedigree] Found ${pedigreeElements.length} elements with "pedigri" in id/class`)
      pedigreeElements.forEach((el, idx) => {
        if (idx < 5) {
          console.log(`[Browser] [Pedigree] Element ${idx}: tag=${el.tagName}, id="${el.id}", class="${el.className}"`)
        }
      })
      
      // First, check if #pedigri exists (correct table ID)
      const pedigreeTable = document.querySelector('#pedigri')
      console.log('[Browser] [Pedigree] #pedigri found:', !!pedigreeTable)
      
      if (pedigreeTable) {
        console.log('[Browser] [Pedigree] #pedigri HTML preview:', pedigreeTable.outerHTML.substring(0, 500))
      }
      
      if (pedigreeTable) {
        const rows = pedigreeTable.querySelectorAll('tbody tr, tr')
        console.log('[Browser] [Pedigree] Found', rows.length, 'rows in #pedigri')
        
        // Log first few rows for debugging
        rows.forEach((row, idx) => {
          if (idx < 5) {
            const cells = row.querySelectorAll('td')
            const cellTexts = Array.from(cells).map(c => {
              const link = c.querySelector('a')
              return link ? link.textContent?.trim() : c.textContent?.trim()
            }).filter(Boolean)
            console.log(`[Browser] [Pedigree] Row ${idx}:`, cellTexts.slice(0, 5))
          }
        })
      }
      
      const extractName = (selector: string, description: string) => {
        const element = document.querySelector(selector)
        if (element) {
          const link = element.querySelector('a')
          let rawText = ''
          
          if (link) {
            rawText = link.textContent?.trim() || ''
          } else {
            rawText = element.textContent?.trim() || ''
          }
          
          if (rawText) {
            // Clean up the text: format is "NAME (COUNTRY) gender codes (YEAR)"
            // We want to extract just "NAME (COUNTRY)" or "NAME"
            // Remove gender codes (d, k, a, e, etc.) and year at the end
            // Pattern: text like "AUTHORIZED (IRE) d  a (2004)" -> "AUTHORIZED (IRE)"
            let cleanedName = rawText
            
            // Remove year in parentheses at the end: (2004)
            cleanedName = cleanedName.replace(/\s*\(\d{4}\)\s*$/, '')
            
            // Remove gender codes (single letters like d, k, a, e, etc. with spaces)
            // These appear after the country code
            cleanedName = cleanedName.replace(/\s+[dkae]\s+[dkae]?\s*$/, '')
            cleanedName = cleanedName.replace(/\s+[dkae]\s*$/, '')
            
            // Trim any remaining whitespace
            cleanedName = cleanedName.trim()
            
            if (cleanedName) {
              console.log(`[Browser] [Pedigree] ✓ Found ${description}: "${cleanedName}" (from: "${rawText}")`)
              return cleanedName
            }
          }
        } else {
          console.log(`[Browser] [Pedigree] ✗ Not found: ${description} (selector: ${selector})`)
        }
        return undefined
      }
      
      // Generation 2 (Sire, Dam) - Row 1 and Row 5, first column
      // Row 1 (index 0): AUTHORIZED (IRE) - Sire
      // Row 5 (index 4): CHANTALLE RUA - Dam
      result.sireName = extractName('#pedigri > tbody > tr:nth-child(1) > td:nth-child(1)', 'Sire')
      result.damName = extractName('#pedigri > tbody > tr:nth-child(5) > td:nth-child(1)', 'Dam')
      
      // Generation 3 (Grandparents) - Various rows, second column
      // Row 1: MONTJEU (IRE) - SireSire
      // Row 3: FUNSIE (FR) - SireDam
      // Row 5: MOUNTAIN CAT (USA) - DamSire
      // Row 7: GREENEST HILLS (FR) - DamDam
      result.sireSire = extractName('#pedigri > tbody > tr:nth-child(1) > td:nth-child(2)', 'SireSire')
      result.sireDam = extractName('#pedigri > tbody > tr:nth-child(3) > td:nth-child(2)', 'SireDam')
      result.damSire = extractName('#pedigri > tbody > tr:nth-child(5) > td:nth-child(2)', 'DamSire')
      result.damDam = extractName('#pedigri > tbody > tr:nth-child(7) > td:nth-child(2)', 'DamDam')
      
      // Generation 4 (Great-grandparents) - Various rows, third column
      // Row 1: SADLER'S WELLS (USA) - SireSireSire
      // Row 2: FLORIPEDES (FR) - SireSireDam
      // Row 3: SAUMAREZ (GB) - SireDamSire
      // Row 4: VALLEE DANSANTE (USA) - SireDamDam
      // Row 5: STORM CAT (USA) - DamSireSire
      // Row 6: ALWAYS MINT (CAN) - DamSireDam
      // Row 7: DANEHILL (USA) - DamDamSire
      // Row 8: ALYMATRICE (USA) - DamDamDam
      result.sireSireSire = extractName('#pedigri > tbody > tr:nth-child(1) > td:nth-child(3)', 'SireSireSire')
      result.sireSireDam = extractName('#pedigri > tbody > tr:nth-child(2) > td:nth-child(3)', 'SireSireDam')
      result.sireDamSire = extractName('#pedigri > tbody > tr:nth-child(3) > td:nth-child(3)', 'SireDamSire')
      result.sireDamDam = extractName('#pedigri > tbody > tr:nth-child(4) > td:nth-child(3)', 'SireDamDam')
      result.damSireSire = extractName('#pedigri > tbody > tr:nth-child(5) > td:nth-child(3)', 'DamSireSire')
      result.damSireDam = extractName('#pedigri > tbody > tr:nth-child(6) > td:nth-child(3)', 'DamSireDam')
      result.damDamSire = extractName('#pedigri > tbody > tr:nth-child(7) > td:nth-child(3)', 'DamDamSire')
      result.damDamDam = extractName('#pedigri > tbody > tr:nth-child(8) > td:nth-child(3)', 'DamDamDam')
      
      // Fallback: Try to extract from all links in the table if specific selectors fail
      if (pedigreeTable && (!result.sireSire && !result.sireDam && !result.damSire && !result.damDam)) {
        console.log('[Browser] [Pedigree] Trying fallback: extract all links from table')
        const allLinks = pedigreeTable.querySelectorAll('a[href*="AtId"], a[href*="Atkodu"]')
        console.log('[Browser] [Pedigree] Found', allLinks.length, 'horse links in table')
        
        const horseNames: string[] = []
        allLinks.forEach((link, idx) => {
          const name = link.textContent?.trim()
          if (name && name.length > 2 && !name.includes('http') && !name.includes('.')) {
            horseNames.push(name)
            if (idx < 15) {
              console.log(`[Browser] [Pedigree] Link ${idx}:`, name)
            }
          }
        })
        
        // Map names to pedigree positions (assuming order: horse, sire, dam, sireSire, sireDam, damSire, damDam, ...)
        if (horseNames.length >= 3) {
          if (!result.sireName) result.sireName = horseNames[1]
          if (!result.damName) result.damName = horseNames[2]
        }
        if (horseNames.length >= 7) {
          if (!result.sireSire) result.sireSire = horseNames[3]
          if (!result.sireDam) result.sireDam = horseNames[4]
          if (!result.damSire) result.damSire = horseNames[5]
          if (!result.damDam) result.damDam = horseNames[6]
        }
        if (horseNames.length >= 15) {
          if (!result.sireSireSire) result.sireSireSire = horseNames[7]
          if (!result.sireSireDam) result.sireSireDam = horseNames[8]
          if (!result.sireDamSire) result.sireDamSire = horseNames[9]
          if (!result.sireDamDam) result.sireDamDam = horseNames[10]
          if (!result.damSireSire) result.damSireSire = horseNames[11]
          if (!result.damSireDam) result.damSireDam = horseNames[12]
          if (!result.damDamSire) result.damDamSire = horseNames[13]
          if (!result.damDamDam) result.damDamDam = horseNames[14]
        }
      }
      
      // Final fallback: Try alternative table structure if #pedigri not found or extraction failed
      if (!result.sireName && !result.damName) {
        const allTables = document.querySelectorAll('table')
        console.log('[Browser] [Pedigree] #pedigri not found or extraction failed, trying', allTables.length, 'tables')
        
        for (const table of allTables) {
          const rows = table.querySelectorAll('tbody tr, tr')
          console.log(`[Browser] [Pedigree] Checking table with ${rows.length} rows`)
          
          if (rows.length >= 2) {
            // Log first few rows for debugging
            rows.forEach((row, idx) => {
              if (idx < 5) {
                const cells = row.querySelectorAll('td, th')
                const cellTexts = Array.from(cells).map(c => {
                  const link = c.querySelector('a')
                  return link ? link.textContent?.trim() : c.textContent?.trim()
                }).filter(Boolean).slice(0, 5)
                console.log(`[Browser] [Pedigree] Table row ${idx}:`, cellTexts)
              }
            })
            
            // Try to extract from first two rows
            const firstRowCells = rows[0].querySelectorAll('td')
            const secondRowCells = rows[1].querySelectorAll('td')
            
            console.log(`[Browser] [Pedigree] First row has ${firstRowCells.length} cells, second row has ${secondRowCells.length} cells`)
            
            if (firstRowCells.length >= 2) {
              const sireLink = firstRowCells[1].querySelector('a')
              if (sireLink) {
                result.sireName = sireLink.textContent?.trim() || undefined
                console.log('[Browser] [Pedigree] Found Sire in fallback table:', result.sireName)
              }
            }
            
            if (secondRowCells.length >= 2) {
              const damLink = secondRowCells[1].querySelector('a')
              if (damLink) {
                result.damName = damLink.textContent?.trim() || undefined
                console.log('[Browser] [Pedigree] Found Dam in fallback table:', result.damName)
              }
            }
            
            // Also try to find all links with horse names (links that go to AtKosuBilgileri or similar)
            const allHorseLinks = table.querySelectorAll('a[href*="AtId"], a[href*="Atkodu"], a[href*="AtKosuBilgileri"]')
            console.log(`[Browser] [Pedigree] Found ${allHorseLinks.length} horse links in this table`)
            
            if (allHorseLinks.length >= 2 && !result.sireName && !result.damName) {
              // Try to extract from links
              const linkTexts = Array.from(allHorseLinks).map(link => link.textContent?.trim()).filter(Boolean)
              console.log(`[Browser] [Pedigree] Horse link texts:`, linkTexts.slice(0, 10))
              
              // Usually first link is the horse itself, second is sire, third is dam
              if (linkTexts.length >= 3) {
                result.sireName = linkTexts[1]
                result.damName = linkTexts[2]
                console.log('[Browser] [Pedigree] Extracted from links - Sire:', result.sireName, 'Dam:', result.damName)
              }
            }
            
            if (result.sireName || result.damName) {
              console.log('[Browser] [Pedigree] Found pedigree data in fallback table')
              break
            }
          }
        }
      }
      
      const gen4Count = [result.sireSireSire, result.sireSireDam, result.sireDamSire, result.sireDamDam, 
                        result.damSireSire, result.damSireDam, result.damDamSire, result.damDamDam]
                        .filter(Boolean).length
      
      console.log('[Browser] [Pedigree] Final extracted pedigree:', {
        sire: result.sireName,
        dam: result.damName,
        sireSire: result.sireSire,
        sireDam: result.sireDam,
        damSire: result.damSire,
        damDam: result.damDam,
        gen4Count: gen4Count
      })
      
      return result
    })
    
    console.log('[TJK Pedigree] Extraction completed, received data:', {
      hasSire: !!pedigree.sireName,
      hasDam: !!pedigree.damName,
      hasGen3: !!(pedigree.sireSire || pedigree.sireDam || pedigree.damSire || pedigree.damDam),
      hasGen4: !!(pedigree.sireSireSire || pedigree.sireSireDam || pedigree.sireDamSire || pedigree.sireDamDam || pedigree.damSireSire || pedigree.damSireDam || pedigree.damDamSire || pedigree.damDamDam)
    })
    
    await context.close()
    await browser.close()
    
    // Log detailed summary of what was extracted
    const gen2Count = [pedigree.sireName, pedigree.damName].filter(Boolean).length
    const gen3Count = [pedigree.sireSire, pedigree.sireDam, pedigree.damSire, pedigree.damDam].filter(Boolean).length
    const gen4Count = [pedigree.sireSireSire, pedigree.sireSireDam, pedigree.sireDamSire, pedigree.sireDamDam,
                       pedigree.damSireSire, pedigree.damSireDam, pedigree.damDamSire, pedigree.damDamDam].filter(Boolean).length
    
    console.log('[TJK Pedigree] ✓ Extraction complete for', horseName || horseId)
    console.log('[TJK Pedigree]   Generation 2 (Parents):', gen2Count, '/ 2', pedigree.sireName ? `- Sire: ${pedigree.sireName}` : '', pedigree.damName ? `Dam: ${pedigree.damName}` : '')
    console.log('[TJK Pedigree]   Generation 3 (Grandparents):', gen3Count, '/ 4')
    if (gen3Count > 0) {
      console.log('[TJK Pedigree]     -', pedigree.sireSire || 'N/A', pedigree.sireDam || 'N/A', pedigree.damSire || 'N/A', pedigree.damDam || 'N/A')
    }
    console.log('[TJK Pedigree]   Generation 4 (Great-grandparents):', gen4Count, '/ 8')
    
    // If we have a horseName parameter, use it if extraction failed
    if (horseName && !pedigree.horseName) {
      pedigree.horseName = horseName
    }
    
    return pedigree as PedigreeData
  } catch (error: any) {
    await browser.close()
    console.error('[TJK Pedigree] Error fetching pedigree:', error.message)
    throw error
  }
}

