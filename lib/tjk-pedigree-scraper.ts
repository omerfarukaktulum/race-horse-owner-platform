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
    
    // Navigate to pedigree page
    const pedigreeUrl = `https://www.tjk.org/TR/YarisSever/Query/Pedigri/Pedigri?Atkodu=${horseId}`
    console.log('[TJK Pedigree] Navigating to:', pedigreeUrl)
    
    await page.goto(pedigreeUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })
    
    // Wait for page to load
    await page.waitForTimeout(2000)
    
    // Extract pedigree data from the page
    const pedigree = await page.evaluate(() => {
      const result: any = {}
      
      // TJK pedigree page uses table with id="tblPedigri"
      // Structure: Each row represents a generation level
      // Row 1: Horse itself
      // Row 2: Sire, Dam
      // Row 3: Sire's Sire, Sire's Dam, Dam's Sire, Dam's Dam
      // Row 4: 8 great-grandparents
      
      const extractName = (selector: string) => {
        const element = document.querySelector(selector)
        if (element) {
          const link = element.querySelector('a')
          if (link) {
            return link.textContent?.trim() || undefined
          }
          return element.textContent?.trim() || undefined
        }
        return undefined
      }
      
      // Generation 2 (Sire, Dam) - Row 1 and 2
      result.sireName = extractName('#tblPedigri > tbody > tr:nth-child(1) > td:nth-child(2) > a')
      result.damName = extractName('#tblPedigri > tbody > tr:nth-child(2) > td:nth-child(2) > a')
      
      // Generation 3 (Grandparents) - Row 1-4, column 3
      result.sireSire = extractName('#tblPedigri > tbody > tr:nth-child(1) > td:nth-child(3) > a')
      result.sireDam = extractName('#tblPedigri > tbody > tr:nth-child(2) > td:nth-child(3) > a')
      result.damSire = extractName('#tblPedigri > tbody > tr:nth-child(3) > td:nth-child(3) > a')
      result.damDam = extractName('#tblPedigri > tbody > tr:nth-child(4) > td:nth-child(3) > a')
      
      // Generation 4 (Great-grandparents) - Row 1-8, column 4
      result.sireSireSire = extractName('#tblPedigri > tbody > tr:nth-child(1) > td:nth-child(4) > a')
      result.sireSireDam = extractName('#tblPedigri > tbody > tr:nth-child(2) > td:nth-child(4) > a')
      result.sireDamSire = extractName('#tblPedigri > tbody > tr:nth-child(3) > td:nth-child(4) > a')
      result.sireDamDam = extractName('#tblPedigri > tbody > tr:nth-child(4) > td:nth-child(4) > a')
      result.damSireSire = extractName('#tblPedigri > tbody > tr:nth-child(5) > td:nth-child(4) > a')
      result.damSireDam = extractName('#tblPedigri > tbody > tr:nth-child(6) > td:nth-child(4) > a')
      result.damDamSire = extractName('#tblPedigri > tbody > tr:nth-child(7) > td:nth-child(4) > a')
      result.damDamDam = extractName('#tblPedigri > tbody > tr:nth-child(8) > td:nth-child(4) > a')
      
      // Fallback: Try alternative table structure if #tblPedigri not found
      if (!result.sireName && !result.damName) {
        const allTables = document.querySelectorAll('table')
        console.log('[Browser] #tblPedigri not found, trying', allTables.length, 'tables')
        
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
              }
            }
            
            if (secondRowCells.length >= 2) {
              const damLink = secondRowCells[1].querySelector('a')
              if (damLink) {
                result.damName = damLink.textContent?.trim() || undefined
              }
            }
            
            if (result.sireName || result.damName) {
              console.log('[Browser] Found pedigree data in fallback table')
              break
            }
          }
        }
      }
      
      console.log('[Browser] Extracted pedigree:', {
        sire: result.sireName,
        dam: result.damName,
        sireSire: result.sireSire,
        sireDam: result.sireDam,
        damSire: result.damSire,
        damDam: result.damDam,
        gen4Count: [result.sireSireSire, result.sireSireDam, result.sireDamSire, result.sireDamDam, 
                    result.damSireSire, result.damSireDam, result.damDamSire, result.damDamDam]
                    .filter(Boolean).length
      })
      
      return result
    })
    
    await context.close()
    await browser.close()
    
    console.log('[TJK Pedigree] Successfully fetched pedigree:', pedigree)
    
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

