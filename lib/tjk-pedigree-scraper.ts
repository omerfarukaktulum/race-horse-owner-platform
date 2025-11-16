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
    
    // Navigate to pedigree page
    const pedigreeUrl = `https://www.tjk.org/TR/YarisSever/Query/Pedigri/Pedigri?Atkodu=${horseId}`
    console.log('[TJK Pedigree] Navigating to:', pedigreeUrl)
    
    await page.goto(pedigreeUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })
    
    // Wait for page to load
    await page.waitForTimeout(2000)
    
    console.log('[TJK Pedigree] Page loaded, starting extraction...')
    
    // Extract pedigree data from the page
    const pedigree = await page.evaluate(() => {
      console.log('[Browser] [Pedigree] Starting pedigree extraction in browser context...')
      const result: any = {}
      
      // First, check if #tblPedigri exists
      const pedigreeTable = document.querySelector('#tblPedigri')
      console.log('[Browser] [Pedigree] #tblPedigri found:', !!pedigreeTable)
      
      if (pedigreeTable) {
        const rows = pedigreeTable.querySelectorAll('tbody tr, tr')
        console.log('[Browser] [Pedigree] Found', rows.length, 'rows in #tblPedigri')
        
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
          if (link) {
            const name = link.textContent?.trim()
            if (name) {
              console.log(`[Browser] [Pedigree] ✓ Found ${description}:`, name)
              return name
            }
          }
          const text = element.textContent?.trim()
          if (text) {
            console.log(`[Browser] [Pedigree] ✓ Found ${description} (no link):`, text)
            return text
          }
        } else {
          console.log(`[Browser] [Pedigree] ✗ Not found: ${description} (selector: ${selector})`)
        }
        return undefined
      }
      
      // Generation 2 (Sire, Dam) - Row 1 and 2, column 2
      result.sireName = extractName('#tblPedigri > tbody > tr:nth-child(1) > td:nth-child(2) > a', 'Sire')
      result.damName = extractName('#tblPedigri > tbody > tr:nth-child(2) > td:nth-child(2) > a', 'Dam')
      
      // Try alternative selectors for Generation 2
      if (!result.sireName) {
        result.sireName = extractName('#tblPedigri tbody tr:first-child td:nth-child(2) a', 'Sire (alt)')
      }
      if (!result.damName) {
        result.damName = extractName('#tblPedigri tbody tr:nth-child(2) td:nth-child(2) a', 'Dam (alt)')
      }
      
      // Generation 3 (Grandparents) - Row 1-4, column 3
      result.sireSire = extractName('#tblPedigri > tbody > tr:nth-child(1) > td:nth-child(3) > a', 'SireSire')
      result.sireDam = extractName('#tblPedigri > tbody > tr:nth-child(2) > td:nth-child(3) > a', 'SireDam')
      result.damSire = extractName('#tblPedigri > tbody > tr:nth-child(3) > td:nth-child(3) > a', 'DamSire')
      result.damDam = extractName('#tblPedigri > tbody > tr:nth-child(4) > td:nth-child(3) > a', 'DamDam')
      
      // Generation 4 (Great-grandparents) - Row 1-8, column 4
      result.sireSireSire = extractName('#tblPedigri > tbody > tr:nth-child(1) > td:nth-child(4) > a', 'SireSireSire')
      result.sireSireDam = extractName('#tblPedigri > tbody > tr:nth-child(2) > td:nth-child(4) > a', 'SireSireDam')
      result.sireDamSire = extractName('#tblPedigri > tbody > tr:nth-child(3) > td:nth-child(4) > a', 'SireDamSire')
      result.sireDamDam = extractName('#tblPedigri > tbody > tr:nth-child(4) > td:nth-child(4) > a', 'SireDamDam')
      result.damSireSire = extractName('#tblPedigri > tbody > tr:nth-child(5) > td:nth-child(4) > a', 'DamSireSire')
      result.damSireDam = extractName('#tblPedigri > tbody > tr:nth-child(6) > td:nth-child(4) > a', 'DamSireDam')
      result.damDamSire = extractName('#tblPedigri > tbody > tr:nth-child(7) > td:nth-child(4) > a', 'DamDamSire')
      result.damDamDam = extractName('#tblPedigri > tbody > tr:nth-child(8) > td:nth-child(4) > a', 'DamDamDam')
      
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
      
      // Final fallback: Try alternative table structure if #tblPedigri not found
      if (!result.sireName && !result.damName) {
        const allTables = document.querySelectorAll('table')
        console.log('[Browser] [Pedigree] #tblPedigri not found or empty, trying', allTables.length, 'tables')
        
        for (const table of allTables) {
          const rows = table.querySelectorAll('tbody tr, tr')
          if (rows.length >= 2) {
            // Try to extract from first two rows
            const firstRowCells = rows[0].querySelectorAll('td')
            const secondRowCells = rows[1].querySelectorAll('td')
            
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

