import { NextResponse } from 'next/server'
import { tjkApiRateLimiter, getClientIp } from '@/lib/rate-limit'
import { searchTJKHorsesPlaywright, getMockHorses } from '@/lib/tjk-api'

/**
 * Get horses for a specific owner using TJK's official API
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerRef = searchParams.get('ownerRef')
    const ownerName = searchParams.get('ownerName')

    console.log('[TJK Horses API] Request:', { ownerName, ownerRef })

    if (!ownerName) {
      return NextResponse.json(
        { error: 'Sahip adı gereklidir' },
        { status: 400 }
      )
    }

    if (!ownerRef) {
      console.log('[TJK Horses API] No ownerRef provided, returning empty')
      return NextResponse.json({ horses: [] })
    }

    // Rate limiting
    const ip = getClientIp(request)
    const allowed = await tjkApiRateLimiter.check(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    // Use Playwright to fetch horses (bypasses anti-bot protection)
    let horses: any[] = []
    try {
      console.log('[TJK Horses API] Starting Playwright horse search...')
      horses = await searchTJKHorsesPlaywright(ownerName, ownerRef)
      console.log('[TJK Horses API] Playwright success! Found', horses.length, 'horses')
      
      if (horses.length === 0) {
        console.log('[TJK Horses API] No horses found for owner')
      }
    } catch (playwrightError: any) {
      console.error('[TJK Horses API] Playwright error:', playwrightError.message)
      console.error('[TJK Horses API] Stack:', playwrightError.stack)
      // Return empty array on error (user can manually add horses)
      horses = []
    }

    return NextResponse.json({ horses })
  } catch (error: any) {
    console.error('[TJK Horses API] Fatal error:', error)
    return NextResponse.json(
      { error: 'At listesi alınırken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
