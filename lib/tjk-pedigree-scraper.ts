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
      
      // TJK pedigree page typically shows a tree structure
      // We need to extract horse names from the tree
      // The structure is usually in a table or divs with specific classes
      
      // Try to find the pedigree table or tree structure
      // Common selectors: table.pedigree, div.pedigree-tree, etc.
      const pedigreeTable = document.querySelector('table') || document.querySelector('.pedigree')
      
      if (!pedigreeTable) {
        console.log('[Browser] No pedigree table found')
        return result
      }
      
      // Extract all text content and horse links
      const horseLinks = Array.from(document.querySelectorAll('a[href*="AtId"], a[href*="Atkodu"]'))
      console.log('[Browser] Found', horseLinks.length, 'horse links in pedigree')
      
      // The pedigree page usually has a specific structure
      // Let's try to extract from all table cells
      const cells = Array.from(pedigreeTable.querySelectorAll('td, div'))
      const horseNames: string[] = []
      
      cells.forEach((cell) => {
        const text = cell.textContent?.trim() || ''
        const link = cell.querySelector('a')
        
        if (link && link.textContent) {
          const name = link.textContent.trim()
          if (name && name.length > 2 && !name.includes('http') && !name.includes('.')) {
            horseNames.push(name)
          }
        } else if (text && text.length > 2 && text.length < 50 && !text.includes('http')) {
          // Might be a horse name without link
          const cleanName = text.replace(/\([^)]*\)/g, '').trim()
          if (cleanName && cleanName.length > 2) {
            horseNames.push(cleanName)
          }
        }
      })
      
      console.log('[Browser] Extracted horse names:', horseNames.slice(0, 15))
      
      // The pedigree tree typically follows this order:
      // Generation 1: Horse itself (index 0)
      // Generation 2: Sire (1), Dam (2)
      // Generation 3: Sire's Sire (3), Sire's Dam (4), Dam's Sire (5), Dam's Dam (6)
      // Generation 4: 8 great-grandparents (7-14)
      
      // However, the actual structure might vary. Let's extract based on position
      if (horseNames.length >= 3) {
        result.horseName = horseNames[0]
        result.sireName = horseNames[1] || undefined
        result.damName = horseNames[2] || undefined
      }
      
      if (horseNames.length >= 7) {
        result.sireSire = horseNames[3] || undefined
        result.sireDam = horseNames[4] || undefined
        result.damSire = horseNames[5] || undefined
        result.damDam = horseNames[6] || undefined
      }
      
      if (horseNames.length >= 15) {
        result.sireSireSire = horseNames[7] || undefined
        result.sireSireDam = horseNames[8] || undefined
        result.sireDamSire = horseNames[9] || undefined
        result.sireDamDam = horseNames[10] || undefined
        result.damSireSire = horseNames[11] || undefined
        result.damSireDam = horseNames[12] || undefined
        result.damDamSire = horseNames[13] || undefined
        result.damDamDam = horseNames[14] || undefined
      }
      
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

