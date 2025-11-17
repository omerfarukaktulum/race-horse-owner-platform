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
      
      const cleanName = (rawText?: string) => {
        if (!rawText) return undefined
        let cleanedName = rawText.trim()
        cleanedName = cleanedName.replace(/\s*\(\d{4}\)\s*$/, '')
        cleanedName = cleanedName.replace(/\s+[dkae]\s+[dkae]?\s*$/, '')
        cleanedName = cleanedName.replace(/\s+[dkae]\s*$/, '')
        cleanedName = cleanedName.trim()
        return cleanedName || undefined
      }
      
      const pedigreeTable = document.querySelector('#pedigri')
      console.log('[Browser] [Pedigree] #pedigri found:', !!pedigreeTable)
      
      if (!pedigreeTable) {
        console.log('[Browser] [Pedigree] ✗ Pedigree table not found')
        return result
      }
      
      const rows = Array.from(pedigreeTable.querySelectorAll('tbody tr'))
      console.log('[Browser] [Pedigree] Found', rows.length, 'rows in #pedigri')
      
      const getCellName = (rowIndex: number, cellIndex: number, description: string) => {
        const row = rows[rowIndex]
        if (!row) {
          console.log(`[Browser] [Pedigree] ✗ Row ${rowIndex} not found for ${description}`)
          return undefined
        }
        const cells = row.querySelectorAll('td')
        const cell = cells[cellIndex]
        if (!cell) {
          console.log(`[Browser] [Pedigree] ✗ Cell ${cellIndex} not found in row ${rowIndex} for ${description}`)
          return undefined
        }
        const rawText = cell.textContent?.trim()
        const cleaned = cleanName(rawText)
        if (cleaned) {
          console.log(`[Browser] [Pedigree] ✓ Found ${description}: "${cleaned}" (from: "${rawText}")`)
        } else {
          console.log(`[Browser] [Pedigree] ✗ Unable to clean ${description}: raw="${rawText}"`)
        }
        return cleaned
      }
      
      // Map rows/cells to pedigree fields based on known structure
      result.sireName = getCellName(0, 0, 'Sire')
      result.sireSire = getCellName(0, 1, 'SireSire')
      result.sireSireSire = getCellName(0, 2, 'SireSireSire')
      result.sireSireDam = getCellName(1, 0, 'SireSireDam')
      result.sireDam = getCellName(2, 0, 'SireDam')
      result.sireDamSire = getCellName(2, 1, 'SireDamSire')
      result.sireDamDam = getCellName(3, 0, 'SireDamDam')
      result.damName = getCellName(4, 0, 'Dam')
      result.damSire = getCellName(4, 1, 'DamSire')
      result.damSireSire = getCellName(4, 2, 'DamSireSire')
      result.damSireDam = getCellName(5, 0, 'DamSireDam')
      result.damDam = getCellName(6, 0, 'DamDam')
      result.damDamSire = getCellName(6, 1, 'DamDamSire')
      result.damDamDam = getCellName(7, 0, 'DamDamDam')
      
      const gen4Count = [
        result.sireSireSire, result.sireSireDam, result.sireDamSire, result.sireDamDam,
        result.damSireSire, result.damSireDam, result.damDamSire, result.damDamDam,
      ].filter(Boolean).length
      
      console.log('[Browser] [Pedigree] Final extracted pedigree:', {
        sire: result.sireName,
        dam: result.damName,
        sireSire: result.sireSire,
        sireDam: result.sireDam,
        damSire: result.damSire,
        damDam: result.damDam,
        gen4Count,
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

